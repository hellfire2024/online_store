import { Router, Request, Response } from "express";
import { pool } from "../db/connection.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { sendTicketEmail } from "../services/emailService.js";
import {
  requireCustomer,
  AuthenticatedRequest,
  getAuthUser,
} from "../middleware/auth.js";

const router = Router();

interface TicketRow extends RowDataPacket {
  id: string;
  ticket_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  subject: string;
  message: string;
  order_id: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  created_at: Date;
  updated_at: Date;
}

interface ReplyRow extends RowDataPacket {
  id: string;
  ticket_id: string;
  author: "customer" | "support";
  message: string;
  created_at: Date;
}

// GET all tickets (admin or customer-filtered)
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.query;

    const authUser = getAuthUser(req);

    // If customerId filter is provided, verify customer authentication
    if (customerId) {
      if (!authUser) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (authUser.type !== "customer" || authUser.id !== customerId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    } else {
      // Unfiltered access is admin-only
      if (!authUser) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (authUser.type !== "admin") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    const whereClause = customerId ? "WHERE customer_id = ?" : "";
    const params = customerId ? [customerId] : [];

    const [tickets] = await pool.query<TicketRow[]>(
      `SELECT * FROM support_tickets ${whereClause} ORDER BY created_at DESC LIMIT 200`,
      params,
    );

    // Get replies for all tickets
    const ticketIds = tickets.map((t) => t.id);
    let replies: ReplyRow[] = [];

    if (ticketIds.length > 0) {
      const [replyRows] = await pool.query<ReplyRow[]>(
        `SELECT * FROM ticket_replies WHERE ticket_id IN (?) ORDER BY created_at ASC`,
        [ticketIds],
      );
      replies = replyRows;
    }

    // Group replies by ticket
    const ticketsWithReplies = tickets.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      customerId: ticket.customer_id,
      customerName: ticket.customer_name,
      customerEmail: ticket.customer_email,
      subject: ticket.subject,
      message: ticket.message,
      orderId: ticket.order_id,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      replies: replies
        .filter((r) => r.ticket_id === ticket.id)
        .map((r) => ({
          id: r.id,
          author: r.author,
          message: r.message,
          timestamp: r.created_at,
        })),
    }));

    res.json(ticketsWithReplies);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// GET single ticket
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [tickets] = await pool.query<TicketRow[]>(
      "SELECT * FROM support_tickets WHERE id = ? OR ticket_number = ?",
      [id, id],
    );

    if (tickets.length === 0) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const ticket = tickets[0];

    // Get replies
    const [replies] = await pool.query<ReplyRow[]>(
      "SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC",
      [ticket.id],
    );

    res.json({
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      customerId: ticket.customer_id,
      customerName: ticket.customer_name,
      customerEmail: ticket.customer_email,
      subject: ticket.subject,
      message: ticket.message,
      orderId: ticket.order_id,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      replies: replies.map((r) => ({
        id: r.id,
        author: r.author,
        message: r.message,
        timestamp: r.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

// POST create new ticket
router.post(
  "/",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        ticketNumber,
        customerId,
        customerName,
        customerEmail,
        subject,
        message,
        orderId,
        priority = "medium",
      } = req.body;

      const authUser = (req as AuthenticatedRequest).authUser;

      // Security: only allow customers to create tickets for themselves
      if (authUser && customerId && authUser.id !== customerId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      if (
        !ticketNumber ||
        !customerName ||
        !customerEmail ||
        !subject ||
        !message
      ) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await pool.query(
        `INSERT INTO support_tickets 
       (id, ticket_number, customer_id, customer_name, customer_email, subject, message, order_id, priority, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
        [
          ticketId,
          ticketNumber,
          customerId || null,
          customerName,
          customerEmail,
          subject,
          message,
          orderId || null,
          priority,
        ],
      );

      // Add initial message as reply
      const replyId = `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await pool.query(
        `INSERT INTO ticket_replies (id, ticket_id, author, message) VALUES (?, ?, 'customer', ?)`,
        [replyId, ticketId, message],
      );

      // Fetch the created ticket
      const [tickets] = await pool.query<TicketRow[]>(
        "SELECT * FROM support_tickets WHERE id = ?",
        [ticketId],
      );

      const ticket = tickets[0];

      res.status(201).json({
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        customerId: ticket.customer_id,
        customerName: ticket.customer_name,
        customerEmail: ticket.customer_email,
        subject: ticket.subject,
        message: ticket.message,
        orderId: ticket.order_id,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        replies: [
          {
            id: replyId,
            author: "customer",
            message: message,
            timestamp: new Date(),
          },
        ],
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({ error: "Failed to create ticket" });
    }
  },
);

// PUT update ticket
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (status) {
      updates.push("status = ?");
      values.push(status);
    }
    if (priority) {
      updates.push("priority = ?");
      values.push(priority);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    values.push(id);

    await pool.query(
      `UPDATE support_tickets SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    // Fetch updated ticket
    const [tickets] = await pool.query<TicketRow[]>(
      "SELECT * FROM support_tickets WHERE id = ?",
      [id],
    );

    if (tickets.length === 0) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const ticket = tickets[0];

    // Get replies
    const [replies] = await pool.query<ReplyRow[]>(
      "SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC",
      [ticket.id],
    );

    res.json({
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      customerId: ticket.customer_id,
      customerName: ticket.customer_name,
      customerEmail: ticket.customer_email,
      subject: ticket.subject,
      message: ticket.message,
      orderId: ticket.order_id,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      replies: replies.map((r) => ({
        id: r.id,
        author: r.author,
        message: r.message,
        timestamp: r.created_at,
      })),
    });
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

// POST add reply to ticket
router.post(
  "/:id/replies",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { author, message } = req.body;
      const authUser = (req as AuthenticatedRequest).authUser;

      if (!author || !message) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      if (author !== "customer" && author !== "support") {
        res.status(400).json({ error: "Invalid author type" });
        return;
      }

      // Security: verify customer owns this ticket
      if (author === "customer" && authUser) {
        const [tickets] = await pool.query<TicketRow[]>(
          "SELECT customer_id FROM support_tickets WHERE id = ?",
          [id],
        );
        if (tickets.length === 0 || tickets[0].customer_id !== authUser.id) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
      }

      const replyId = `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await pool.query(
        `INSERT INTO ticket_replies (id, ticket_id, author, message) VALUES (?, ?, ?, ?)`,
        [replyId, id, author, message],
      );

      // Update ticket's updated_at
      await pool.query(
        `UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id],
      );

      // Fetch the reply
      const [replies] = await pool.query<ReplyRow[]>(
        "SELECT * FROM ticket_replies WHERE id = ?",
        [replyId],
      );

      const reply = replies[0];

      res.status(201).json({
        id: reply.id,
        author: reply.author,
        message: reply.message,
        timestamp: reply.created_at,
      });
    } catch (error) {
      console.error("Error adding reply:", error);
      res.status(500).json({ error: "Failed to add reply" });
    }
  },
);

// DELETE ticket
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM support_tickets WHERE id = ?",
      [id],
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({ error: "Failed to delete ticket" });
  }
});

// POST send ticket email to support
router.post("/send-ticket-email", async (req: Request, res: Response) => {
  try {
    const {
      to,
      subject,
      ticketNumber,
      orderId,
      priority,
      message,
      customerInfo,
    } = req.body;

    if (!to || !subject || !message) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Send email to support
    const emailResult = await sendTicketEmail(
      to,
      subject,
      ticketNumber,
      orderId,
      priority,
      message,
      customerInfo,
    );

    res.json({
      success: emailResult.success,
      message: emailResult.message,
    });
    return;
  } catch (error) {
    console.error("Error sending ticket email:", error);
    res.status(500).json({ error: "Failed to send ticket email" });
    return;
  }
});

export default router;

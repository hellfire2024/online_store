import React, { useState, useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../hooks/useToast";
import { apiClient } from "../../services/apiClient";

interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  orderId?: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
  replies: Array<{
    id: string;
    author: "customer" | "support";
    message: string;
    timestamp: string;
  }>;
}

const TicketsManagement: React.FC = () => {
  const { isAdminAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate("/admin/login");
      return;
    }

    const loadTickets = async () => {
      setIsLoading(true);
      try {
        // Try to load tickets from API
        const apiTickets = await apiClient.tickets.getAll();
        
        // Transform API tickets to match UI format if needed
        const transformedTickets = apiTickets.map((ticket: any) => ({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          customerName: ticket.customerName,
          customerEmail: ticket.customerEmail,
          subject: ticket.subject,
          message: ticket.message,
          orderId: ticket.orderId,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          replies: ticket.replies || [],
        }));
        
        setTickets(transformedTickets);
        
        if (transformedTickets.length === 0) {
          addToast('No tickets found in database', 'info');
        }
      } catch (error) {
        console.error('Failed to load tickets from API, using mock data:', error);
        
        // Fallback to mock tickets when API fails or DB is empty
        const mockTickets: SupportTicket[] = [
      {
        id: "1",
        ticketNumber: "TKT-2026-001",
        customerName: "John Doe",
        customerEmail: "john.doe@email.com",
        subject: "Question about product customization",
        message: "Can I add metallic ink to my design?",
        orderId: "ORD-2026-001",
        status: "in_progress",
        priority: "medium",
        createdAt: "2026-01-24T10:30:00Z",
        updatedAt: "2026-01-26T14:00:00Z",
        replies: [
          {
            id: "1",
            author: "customer",
            message: "Can I add metallic ink to my design?",
            timestamp: "2026-01-24T10:30:00Z",
          },
          {
            id: "2",
            author: "support",
            message: "Yes, we offer metallic ink options. The cost is $5.00 per color.",
            timestamp: "2026-01-25T09:15:00Z",
          },
        ],
      },
      {
        id: "2",
        ticketNumber: "TKT-2026-002",
        customerName: "Jane Smith",
        customerEmail: "jane.smith@email.com",
        subject: "Shipping delay inquiry",
        message: "My order hasn't arrived yet. When should I expect it?",
        orderId: "ORD-2026-002",
        status: "open",
        priority: "high",
        createdAt: "2026-01-27T15:45:00Z",
        updatedAt: "2026-01-27T15:45:00Z",
        replies: [
          {
            id: "1",
            author: "customer",
            message: "My order hasn't arrived yet. When should I expect it?",
            timestamp: "2026-01-27T15:45:00Z",
          },
        ],
      },
      {
        id: "3",
        ticketNumber: "TKT-2026-003",
        customerName: "Bob Wilson",
        customerEmail: "bob.wilson@email.com",
        subject: "Product quality issue",
        message: "The print quality on my mug is poor.",
        orderId: "ORD-2026-003",
        status: "resolved",
        priority: "high",
        createdAt: "2026-01-20T08:20:00Z",
        updatedAt: "2026-01-26T10:00:00Z",
        replies: [
          {
            id: "1",
            author: "customer",
            message: "The print quality on my mug is poor.",
            timestamp: "2026-01-20T08:20:00Z",
          },
          {
            id: "2",
            author: "support",
            message: "We apologize for the issue. We're sending a replacement right away.",
            timestamp: "2026-01-20T14:30:00Z",
          },
          {
            id: "3",
            author: "customer",
            message: "Thank you! I received the replacement and it looks great.",
            timestamp: "2026-01-26T09:50:00Z",
          },
        ],
      },
    ];

    setTickets(mockTickets);
    addToast('Using demo tickets - backend not connected', 'info');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTickets();
  }, [isAdminAuthenticated, navigate, addToast]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      // Try to add reply via API
      const reply = await apiClient.tickets.addReply(
        selectedTicket.id,
        'support',
        replyMessage
      );
      
      // Update local state
      const updated = tickets.map((t) => {
        if (t.id === selectedTicket.id) {
          return {
            ...t,
            replies: [
              ...t.replies,
              {
                id: reply.id,
                author: "support" as const,
                message: replyMessage,
                timestamp: reply.timestamp || new Date().toISOString(),
              },
            ],
          };
        }
        return t;
      });
      
      setTickets(updated);
      setSelectedTicket(updated.find(t => t.id === selectedTicket.id) || null);
      setReplyMessage("");
      addToast("Reply sent successfully", "success");
    } catch (error) {
      console.error('Failed to send reply via API, updating locally:', error);
      
      // Fallback to local update if API fails
      const updated = tickets.map((t) => {
        if (t.id === selectedTicket.id) {
          return {
            ...t,
            replies: [
              ...t.replies,
              {
                id: String(t.replies.length + 1),
                author: "support" as const,
                message: replyMessage,
                timestamp: new Date().toISOString(),
              },
            ],
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });
    
    setTickets(updated);
    setSelectedTicket(updated.find((t) => t.id === selectedTicket.id) || null);
    setReplyMessage("");
    addToast("Reply sent to customer (local only)", "success");
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      // Try to update via API
      await apiClient.tickets.update(ticketId, { status: newStatus });
      
      // Update local state
      const updated = tickets.map((t) =>
        t.id === ticketId ? { ...t, status: newStatus as any, updatedAt: new Date().toISOString() } : t
      );
      setTickets(updated);
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(updated.find((t) => t.id === ticketId) || null);
      }
      addToast(`Ticket status updated to ${newStatus}`, "success");
    } catch (error) {
      console.error('Failed to update ticket via API, updating locally:', error);
      
      // Fallback to local update if API fails
      const updated = tickets.map((t) =>
        t.id === ticketId ? { ...t, status: newStatus as any, updatedAt: new Date().toISOString() } : t
      );
      setTickets(updated);
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(updated.find((t) => t.id === ticketId) || null);
      }
      addToast(`Ticket status updated to ${newStatus} (local only)`, "info");
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    try {
      // Try to update via API
      await apiClient.tickets.update(ticketId, { priority: newPriority });
      
      // Update local state
      const updated = tickets.map((t) =>
        t.id === ticketId ? { ...t, priority: newPriority as any } : t
      );
      setTickets(updated);
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(updated.find((t) => t.id === ticketId) || null);
      }
      addToast(`Ticket priority updated to ${newPriority}`, "success");
    } catch (error) {
      console.error('Failed to update priority via API, updating locally:', error);
      
      // Fallback to local update if API fails
      const updated = tickets.map((t) =>
        t.id === ticketId ? { ...t, priority: newPriority as any } : t
      );
      setTickets(updated);
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(updated.find((t) => t.id === ticketId) || null);
      }
      addToast(`Ticket priority updated to ${newPriority} (local only)`, "info");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-900 text-blue-200";
      case "in_progress":
        return "bg-yellow-900 text-yellow-200";
      case "resolved":
        return "bg-green-900 text-green-200";
      case "closed":
        return "bg-gray-900 text-gray-200";
      default:
        return "bg-slate-900 text-slate-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-900 text-red-200";
      case "medium":
        return "bg-orange-900 text-orange-200";
      case "low":
        return "bg-gray-900 text-gray-200";
      default:
        return "bg-slate-900 text-slate-200";
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
    if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div>
        <p className="text-gray-400">Loading tickets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Support Tickets Management</h1>

      {/* Filters */}
      <div className="bg-slate-800 p-4 rounded-lg space-y-3 border border-slate-700">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-gray-400">No support tickets match the selected filters</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400">
              Showing {filteredTickets.length} of {tickets.length} tickets
            </p>
            <div className="grid gap-4">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-slate-800 p-4 rounded-lg cursor-pointer hover:bg-slate-700/50 transition border border-slate-700"
                  onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{ticket.ticketNumber}</h3>
                      </div>
                      <p className="text-gray-300 font-medium">{ticket.subject}</p>
                      <p className="text-gray-400 text-sm">
                        from <strong>{ticket.customerName}</strong> ({ticket.customerEmail})
                      </p>
                      <p className="text-gray-400 text-sm mt-1">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>

                  {selectedTicket?.id === ticket.id && (
                    <div 
                      className="mt-4 pt-4 border-t border-slate-600 space-y-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Status and Priority Controls */}
                      <div className="grid grid-cols-2 gap-4 bg-slate-700/50 p-3 rounded">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Change Status</label>
                          <select
                            value={ticket.status}
                            onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                            className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Change Priority</label>
                          <select
                            value={ticket.priority}
                            onChange={(e) => handlePriorityChange(ticket.id, e.target.value)}
                            className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                      </div>

                      {/* Conversation */}
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {ticket.replies.map((reply, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded ${reply.author === "support" ? "bg-sky-900/30" : "bg-slate-600/50"}`}
                          >
                            <p className="text-xs text-gray-400 mb-1">
                              {reply.author === "support" ? "Support Team" : "Customer"} • {new Date(reply.timestamp).toLocaleString()}
                            </p>
                            <p className="text-white text-sm">{reply.message}</p>
                          </div>
                        ))}
                      </div>

                      {/* Reply Form */}
                      {ticket.status !== "closed" && (
                        <form onSubmit={handleReply} className="space-y-2 border-t border-slate-600 pt-4">
                          <textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Type your response to the customer..."
                            rows={3}
                            className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors text-sm font-medium"
                          >
                            Send Reply
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TicketsManagement;

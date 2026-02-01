import { Router, Request, Response } from 'express';
import { pool } from '../db/connection.js';
import { RowDataPacket } from 'mysql2';
import { sendOrderConfirmationEmail, sendShippingNotificationEmail } from '../services/emailService.js';

const router = Router();

interface OrderRow extends RowDataPacket {
  id: number;
  order_number: string;
  customer_email: string;
  customer_name: string;
  order_data: string;
  status: string;
  tracking_number: string | null;
  shipper: string | null;
  created_at: Date;
  updated_at: Date;
}

// GET all orders (admin)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<OrderRow[]>(
      `SELECT * FROM orders ORDER BY created_at DESC LIMIT 100`
    );
    // Always return an array, even if empty
    res.json(Array.isArray(rows) ? rows : []);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET single order
router.get('/:orderNumber', async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const [rows] = await pool.query<OrderRow[]>(
      'SELECT * FROM orders WHERE order_number = ?',
      [orderNumber]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = rows[0];
    const orderData = JSON.parse(order.order_data);

    res.json({
      id: order.id,
      orderNumber: order.order_number,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      status: order.status,
      trackingNumber: order.tracking_number,
      shipper: order.shipper,
      orderData,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST create order and send confirmation email
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      orderNumber,
      customerEmail,
      customerName,
      orderData,
    } = req.body;

    if (!orderNumber || !customerEmail || !customerName || !orderData) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Insert order into database
    await pool.query(
      `INSERT INTO orders (order_number, customer_email, customer_name, order_data, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [orderNumber, customerEmail, customerName, JSON.stringify(orderData)]
    );

    // Send order confirmation email
    const emailResult = await sendOrderConfirmationEmail(
      customerEmail,
      customerName,
      orderNumber,
      orderData
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      orderNumber,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT update order with shipping info
router.put('/:orderNumber/ship', async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const { trackingNumber, shipper, shippingUrl } = req.body;

    if (!trackingNumber || !shipper) {
      res.status(400).json({ error: 'Missing tracking number or shipper' });
      return;
    }

    // Get order details
    const [rows] = await pool.query<OrderRow[]>(
      'SELECT * FROM orders WHERE order_number = ?',
      [orderNumber]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = rows[0];

    // Update order with shipping info
    await pool.query(
      `UPDATE orders SET status = 'shipped', tracking_number = ?, shipper = ?, updated_at = NOW()
       WHERE order_number = ?`,
      [trackingNumber, shipper, orderNumber]
    );

    // Send shipping notification email
    const emailResult = await sendShippingNotificationEmail(
      order.customer_email,
      order.customer_name,
      orderNumber,
      trackingNumber,
      shipper,
      shippingUrl
    );

    res.json({
      success: true,
      message: 'Order updated with shipping info',
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

export default router;

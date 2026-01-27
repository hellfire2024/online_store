import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/connection.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all customers
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id, c.name, c.email, c.phone, c.is_active as isActive,
              c.created_at as createdAt, c.last_login as lastLogin,
              COUNT(DISTINCT o.id) as orderCount,
              COALESCE(SUM(o.total), 0) as totalSpent
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get single customer with orders
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [customerRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, email, phone, email_preferences as emailPreferences,
              is_active as isActive, created_at as createdAt, last_login as lastLogin
       FROM customers WHERE id = ?`,
      [req.params.id]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerRows[0];
    customer.emailPreferences = JSON.parse(customer.emailPreferences || '{}');

    // Get customer's addresses
    const [addresses] = await pool.query<RowDataPacket[]>(
      `SELECT id, type, full_name, street_address, city, state, zip_code, 
              country, phone, is_default FROM customer_addresses WHERE customer_id = ?`,
      [req.params.id]
    );

    customer.addresses = addresses;

    return res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create customer (admin)
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email, phone } = req.body;

      // Check if email exists
      const [existing] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM customers WHERE email = ?',
        [email]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      const id = uuidv4();

      await pool.query(
        `INSERT INTO customers (id, name, email, phone, password_hash, email_preferences, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [
          id,
          name,
          email,
          phone || null,
          '', // Empty password for admin-created users
          JSON.stringify({ marketing: false, orderUpdates: true, announcements: false }),
        ]
      );

      return res.status(201).json({
        id,
        name,
        email,
        phone: phone || null,
        isActive: true,
        orderCount: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      return res.status(500).json({ error: 'Failed to create customer' });
    }
  }
);

// Update customer
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, isActive, emailPreferences } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone || null);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive);
    }
    if (emailPreferences !== undefined) {
      updates.push('email_preferences = ?');
      values.push(JSON.stringify(emailPreferences));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Return updated customer
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, email, phone, is_active as isActive FROM customers WHERE id = ?`,
      [req.params.id]
    );

    return res.json(rows[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM customers WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Toggle customer active status
router.patch('/:id/toggle-active', async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE customers SET is_active = !is_active WHERE id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, is_active as isActive FROM customers WHERE id = ?',
      [req.params.id]
    );

    return res.json(rows[0]);
  } catch (error) {
    console.error('Error toggling customer status:', error);
    return res.status(500).json({ error: 'Failed to toggle customer status' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { pool } from '../db/connection.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all admin users
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, first_name as firstName, last_name as lastName, phone,
              username, email, role, is_active as isActive, 
              created_at as createdAt, last_login as lastLogin
       FROM admins ORDER BY created_at DESC`
    );
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// Get single admin user
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, first_name as firstName, last_name as lastName, phone,
              username, email, role, permissions, is_active as isActive,
              created_at as createdAt, last_login as lastLogin
       FROM admins WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    const user = rows[0];
    user.permissions = JSON.parse(user.permissions || '[]');
    return res.json(user);
  } catch (error) {
    console.error('Error fetching admin user:', error);
    return res.status(500).json({ error: 'Failed to fetch admin user' });
  }
});

// Create admin user
router.post(
  '/',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['super_admin', 'admin', 'manager']).withMessage('Invalid role'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { firstName, lastName, phone, username, email, password, role } = req.body;

      // Check if username exists
      const [existing] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM admins WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Username or email already in use' });
      }

      const id = uuidv4();
      const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '10'));

      await pool.query(
        `INSERT INTO admins (id, first_name, last_name, phone, username, email, password_hash, role, permissions, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          id,
          firstName || null,
          lastName || null,
          phone || null,
          username,
          email,
          passwordHash,
          role,
          JSON.stringify([]),
        ]
      );

      return res.status(201).json({
        id,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        username,
        email,
        role,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating admin user:', error);
      return res.status(500).json({ error: 'Failed to create admin user' });
    }
  }
);

// Update admin user
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, phone, username, email, password, role, isActive, permissions } = req.body;
    
    // Check if username or email is already taken by another user
    if (username !== undefined || email !== undefined) {
      const conditions: string[] = [];
      const checkValues: any[] = [];
      
      if (username !== undefined) {
        conditions.push('username = ?');
        checkValues.push(username);
      }
      if (email !== undefined) {
        conditions.push('email = ?');
        checkValues.push(email);
      }
      
      checkValues.push(req.params.id);
      
      const [existing] = await pool.query<RowDataPacket[]>(
        `SELECT id, username, email FROM admins WHERE (${conditions.join(' OR ')}) AND id != ?`,
        checkValues
      );
      
      if (existing.length > 0) {
        const conflicts: string[] = [];
        if (username !== undefined && existing.some((u: any) => u.username === username)) {
          conflicts.push('username');
        }
        if (email !== undefined && existing.some((u: any) => u.email === email)) {
          conflicts.push('email');
        }
        return res.status(400).json({ 
          error: `${conflicts.join(' and ')} already in use by another admin` 
        });
      }
    }
    
    const updates: string[] = [];
    const values: any[] = [];

    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName || null);
    }
    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName || null);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone || null);
    }
    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '10'));
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive);
    }
    if (permissions !== undefined) {
      updates.push('permissions = ?');
      values.push(JSON.stringify(permissions));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE admins SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    // Return updated user
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, first_name as firstName, last_name as lastName, phone,
              username, email, role, is_active as isActive, created_at as createdAt
       FROM admins WHERE id = ?`,
      [req.params.id]
    );

    return res.json(rows[0]);
  } catch (error) {
    console.error('Error updating admin user:', error);
    return res.status(500).json({ error: 'Failed to update admin user' });
  }
});

// Delete admin user
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Prevent deleting the only super admin
    const [superAdmins] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM admins WHERE role = 'super_admin'"
    );

    if (superAdmins[0].count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last super admin user' });
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM admins WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return res.status(500).json({ error: 'Failed to delete admin user' });
  }
});

// Toggle admin user active status
router.patch('/:id/toggle-active', async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE admins SET is_active = !is_active WHERE id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, is_active as isActive FROM admins WHERE id = ?',
      [req.params.id]
    );

    return res.json(rows[0]);
  } catch (error) {
    console.error('Error toggling admin user status:', error);
    return res.status(500).json({ error: 'Failed to toggle admin user status' });
  }
});

export default router;

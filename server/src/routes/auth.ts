import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/connection.js';
import { RowDataPacket } from 'mysql2';
import crypto from 'crypto';

const router = Router();

// Admin login
router.post(
  '/admin/login',
  [
    body('username').trim().notEmpty(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, password } = req.body;

      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM admins WHERE (username = ? OR email = ?) AND is_active = TRUE',
        [username, username]
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const admin = rows[0];
      const validPassword = await bcrypt.compare(password, admin.password_hash);

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await pool.query('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);

      // Generate JWT
      const secret: Secret = process.env.JWT_SECRET || 'dev-secret';
      const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
      const options: SignOptions = { expiresIn };
      const token = jwt.sign(
        { id: admin.id, username: admin.username, role: admin.role, type: 'admin' },
        secret,
        options,
      );

      return res.json({
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Customer register
router.post(
  '/customer/register',
  [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email, password } = req.body;

      // Check if email exists
      const [existing] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM customers WHERE email = ?',
        [email]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '10'));

      // Create customer
      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO customers (id, name, email, password_hash, email_preferences)
         VALUES (?, ?, ?, ?, ?)`,
        [id, name, email, passwordHash, JSON.stringify({ marketing: false, orderUpdates: true, announcements: false })]
      );

      // Generate JWT
      const secret: Secret = process.env.JWT_SECRET || 'dev-secret';
      const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
      const options: SignOptions = { expiresIn };
      const token = jwt.sign({ id, email, type: 'customer' }, secret, options);

      return res.status(201).json({
        token,
        customer: { id, name, email },
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Customer login
router.post(
  '/customer/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM customers WHERE email = ? AND is_active = TRUE',
        [email]
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const customer = rows[0];
      const validPassword = await bcrypt.compare(password, customer.password_hash);

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await pool.query('UPDATE customers SET last_login = NOW() WHERE id = ?', [customer.id]);

      // Generate JWT
      const secret: Secret = process.env.JWT_SECRET || 'dev-secret';
      const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
      const options: SignOptions = { expiresIn };
      const token = jwt.sign(
        { id: customer.id, email: customer.email, type: 'customer' },
        secret,
        options,
      );

      return res.json({
        token,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Customer change password
router.post(
  '/customer/change-password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Get customer ID from JWT token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authorization token' });
      }

      const token = authHeader.substring(7);
      const secret: Secret = process.env.JWT_SECRET || 'dev-secret';
      
      let customerId: string;
      try {
        const decoded = jwt.verify(token, secret) as any;
        if (decoded.type !== 'customer') {
          return res.status(403).json({ error: 'Invalid token type' });
        }
        customerId = decoded.id;
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const { currentPassword, newPassword } = req.body;

      // Fetch the customer
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM customers WHERE id = ? AND is_active = TRUE',
        [customerId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const customer = rows[0];

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, customer.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '10'));

      // Update password
      await pool.query(
        'UPDATE customers SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newPasswordHash, customerId]
      );

      return res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// Customer request password reset
router.post(
  '/customer/request-password-reset',
  [
    body('email').isEmail().normalizeEmail(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email } = req.body;

      // Check if customer exists
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM customers WHERE email = ? AND is_active = TRUE',
        [email]
      );

      if (rows.length === 0) {
        // Don't reveal if email exists (security best practice)
        return res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent' });
      }

      // In a production app, you would:
      // 1. Generate a unique reset token
      // 2. Store it in the database with an expiration time
      // 3. Send an email with a link containing the token
      console.log(`Password reset requested for email: ${email}`);

      return res.json({ success: true, message: 'Password reset email sent successfully' });
    } catch (error) {
      console.error('Password reset request error:', error);
      return res.status(500).json({ error: 'Failed to process password reset request' });
    }
  }
);

export default router;

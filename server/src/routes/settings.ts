import { Router, Request, Response } from 'express';
import { pool } from '../db/connection.js';
import { RowDataPacket } from 'mysql2';

const router = Router();

// Get settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT settings FROM site_settings WHERE id = 1'
    );
    
    if (rows.length === 0) {
      return res.json({});
    }
    
    return res.json(rows[0].settings);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.put('/', async (req: Request, res: Response) => {
  try {
    await pool.query(
      `INSERT INTO site_settings (id, settings) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE settings = ?`,
      [JSON.stringify(req.body), JSON.stringify(req.body)]
    );
    return res.json(req.body);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;

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
    
    // Parse JSON if it's stored as a string
    const settings = typeof rows[0].settings === 'string' 
      ? JSON.parse(rows[0].settings) 
      : rows[0].settings;
    
    return res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.put('/', async (req: Request, res: Response) => {
  try {
    console.log('Received settings update request, body size:', JSON.stringify(req.body).length, 'bytes');
    
    const settingsJson = JSON.stringify(req.body);
    
    const [result] = await pool.query(
      `INSERT INTO site_settings (id, settings) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE settings = ?`,
      [settingsJson, settingsJson]
    );
    
    console.log('Settings saved successfully to database, affected rows:', (result as any).affectedRows);
    return res.json(req.body);
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ error: 'Failed to update settings', details: error instanceof Error ? error.message : String(error) });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { pool } from '../db/connection.js';
import { RowDataPacket } from 'mysql2';

const router = Router();

// Get all pages
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM pages ORDER BY created_at DESC'
    );
    return res.json(rows || []);
  } catch (error) {
    console.error('Error fetching pages:', error);
    return res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// Get single page
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM pages WHERE id = ?',
      [req.params.id]
    );
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const page = rows[0];
    // Parse JSON fields if they're stored as strings
    if (typeof page.contentData === 'string') {
      page.contentData = JSON.parse(page.contentData);
    }
    
    return res.json(page);
  } catch (error) {
    console.error('Error fetching page:', error);
    return res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// Create page
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, pageType, name, content, contentData } = req.body;
    
    if (!id || !pageType) {
      return res.status(400).json({ error: 'id and pageType are required' });
    }
    
    const contentDataJson = typeof contentData === 'string' ? contentData : JSON.stringify(contentData || {});
    
    await pool.query(
      `INSERT INTO pages (id, pageType, name, content, contentData, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, pageType, name || '', content || '', contentDataJson]
    );
    
    return res.status(201).json({ id, pageType, name, content, contentData });
  } catch (error) {
    console.error('Error creating page:', error);
    return res.status(500).json({ error: 'Failed to create page' });
  }
});

// Update page
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { pageType, name, content, contentData } = req.body;
    
    const contentDataJson = typeof contentData === 'string' ? contentData : JSON.stringify(contentData || {});
    
    const [result] = await pool.query(
      `UPDATE pages SET pageType = ?, name = ?, content = ?, contentData = ?, updated_at = NOW()
       WHERE id = ?`,
      [pageType, name || '', content || '', contentDataJson, req.params.id]
    );
    
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    return res.json({ id: req.params.id, pageType, name, content, contentData });
  } catch (error) {
    console.error('Error updating page:', error);
    return res.status(500).json({ error: 'Failed to update page' });
  }
});

// Delete page
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM pages WHERE id = ?',
      [req.params.id]
    );
    
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting page:', error);
    return res.status(500).json({ error: 'Failed to delete page' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { pool } from '../db/connection.js';
import { RowDataPacket } from 'mysql2';

const router = Router();

// Get all reviews
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM reviews ORDER BY created_at DESC'
    );
    return res.json(rows || []);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get single review
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM reviews WHERE id = ?',
      [req.params.id]
    );
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    return res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching review:', error);
    return res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// Create review
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, productId, customerId, rating, text, approved } = req.body;
    
    if (!id || !productId || !customerId || !rating) {
      return res.status(400).json({ error: 'id, productId, customerId, and rating are required' });
    }
    
    await pool.query(
      `INSERT INTO reviews (id, productId, customerId, rating, text, approved, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id, productId, customerId, rating, text || '', approved ? 1 : 0]
    );
    
    return res.status(201).json({ id, productId, customerId, rating, text, approved });
  } catch (error) {
    console.error('Error creating review:', error);
    return res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update review
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { rating, text, approved } = req.body;
    
    const [result] = await pool.query(
      `UPDATE reviews SET rating = ?, text = ?, approved = ? WHERE id = ?`,
      [rating, text || '', approved ? 1 : 0, req.params.id]
    );
    
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    return res.json({ id: req.params.id, rating, text, approved });
  } catch (error) {
    console.error('Error updating review:', error);
    return res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete review
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM reviews WHERE id = ?',
      [req.params.id]
    );
    
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting review:', error);
    return res.status(500).json({ error: 'Failed to delete review' });
  }
});

export default router;

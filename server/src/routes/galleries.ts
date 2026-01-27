import { Router, Request, Response } from 'express';
import { pool } from '../db/connection.js';
import { RowDataPacket } from 'mysql2';
import { randomUUID } from 'crypto';

const router = Router();

// Get all galleries
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM galleries ORDER BY name'
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch galleries' });
  }
});

// Get gallery images
router.get('/:id/images', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, image_url as imageUrl FROM gallery_images WHERE gallery_id = ?',
      [req.params.id]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Create gallery
router.post('/', async (req: Request, res: Response) => {
  try {
    const id = randomUUID();
    await pool.query('INSERT INTO galleries (id, name) VALUES (?, ?)', [id, req.body.name]);
    return res.status(201).json({ id, name: req.body.name });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create gallery' });
  }
});

// Add image to gallery
router.post('/:id/images', async (req: Request, res: Response) => {
  try {
    const id = randomUUID();
    await pool.query(
      'INSERT INTO gallery_images (id, gallery_id, name, image_url) VALUES (?, ?, ?, ?)',
      [id, req.params.id, req.body.name, req.body.imageUrl]
    );
    return res.status(201).json({ id, name: req.body.name, imageUrl: req.body.imageUrl });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add image' });
  }
});

// Delete gallery
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM galleries WHERE id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete gallery' });
  }
});

// Delete image
router.delete('/:galleryId/images/:imageId', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM gallery_images WHERE id = ?', [req.params.imageId]);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;

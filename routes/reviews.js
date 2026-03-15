import { Router } from 'express';
import { pool } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
// Get all reviews
router.get('/', async (_req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
        const reviews = (rows || []).map((row) => ({
            id: row.id,
            author: row.author,
            email: row.email || undefined,
            text: row.text,
            rating: Number(row.rating),
            status: row.status,
            createdAt: row.created_at,
            approvedAt: row.approved_at || undefined,
            rejectionReason: row.rejection_reason || undefined,
            images: row.images ? JSON.parse(row.images) : undefined,
        }));
        return res.json(reviews);
    }
    catch (error) {
        console.error('Error fetching reviews:', error);
        return res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});
// Get single review
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reviews WHERE id = ?', [req.params.id]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }
        const row = rows[0];
        return res.json({
            id: row.id,
            author: row.author,
            email: row.email || undefined,
            text: row.text,
            rating: Number(row.rating),
            status: row.status,
            createdAt: row.created_at,
            approvedAt: row.approved_at || undefined,
            rejectionReason: row.rejection_reason || undefined,
            images: row.images ? JSON.parse(row.images) : undefined,
        });
    }
    catch (error) {
        console.error('Error fetching review:', error);
        return res.status(500).json({ error: 'Failed to fetch review' });
    }
});
// Create review
router.post('/', async (req, res) => {
    try {
        const { id, author, email, text, rating, status, createdAt, approvedAt, rejectionReason, images, } = req.body;
        if (!author || !rating) {
            return res.status(400).json({ error: 'author and rating are required' });
        }
        const reviewId = id || uuidv4();
        const finalStatus = status || 'pending';
        const imagesJson = images ? JSON.stringify(images) : null;
        await pool.query(`INSERT INTO reviews (id, author, email, text, rating, status, rejection_reason, created_at, approved_at, images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            reviewId,
            author,
            email || null,
            text || '',
            rating,
            finalStatus,
            rejectionReason || null,
            createdAt ? new Date(createdAt) : new Date(),
            approvedAt ? new Date(approvedAt) : null,
            imagesJson,
        ]);
        return res.status(201).json({
            id: reviewId,
            author,
            email: email || undefined,
            text: text || '',
            rating,
            status: finalStatus,
            createdAt: createdAt || new Date().toISOString(),
            approvedAt: approvedAt || undefined,
            rejectionReason: rejectionReason || undefined,
            images: images || undefined,
        });
    }
    catch (error) {
        console.error('Error creating review:', error);
        return res.status(500).json({ error: 'Failed to create review' });
    }
});
// Update review
router.put('/:id', async (req, res) => {
    try {
        const { author, email, text, rating, status, approvedAt, rejectionReason, images, } = req.body;
        const imagesJson = images ? JSON.stringify(images) : null;
        const finalApprovedAt = status === 'approved'
        ? approvedAt ? new Date(approvedAt) : new Date()
        : null;
        const [result] = await pool.query(`UPDATE reviews
       SET author = ?, email = ?, text = ?, rating = ?, status = ?,
           approved_at = ?, rejection_reason = ?, images = ?
       WHERE id = ?`, [
            author,
            email || null,
            text || '',
            rating,
            status || 'pending',
            finalApprovedAt,
            rejectionReason || null,
            imagesJson,
            req.params.id,
        ]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }
        return res.json({
            id: req.params.id,
            author,
            email: email || undefined,
            text: text || '',
            rating,
            status: status || 'pending',
            approvedAt: finalApprovedAt || undefined,
            rejectionReason: rejectionReason || undefined,
            images: images || undefined,
        });
    }
    catch (error) {
        console.error('Error updating review:', error);
        return res.status(500).json({ error: 'Failed to update review' });
    }
});
// Delete review
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting review:', error);
        return res.status(500).json({ error: 'Failed to delete review' });
    }
});
export default router;
//# sourceMappingURL=reviews.js.map
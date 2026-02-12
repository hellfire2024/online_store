import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import * as ProductModel from '../models/Product.js';
const router = Router();
// Get all products
router.get('/', async (_req, res) => {
    try {
        const products = await ProductModel.findAll();
        return res.json(products);
    }
    catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ error: 'Failed to fetch products' });
    }
});
// Get single product
router.get('/:id', async (req, res) => {
    try {
        const product = await ProductModel.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.json(product);
    }
    catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).json({ error: 'Failed to fetch product' });
    }
});
// Create product
router.post('/', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('inventory').isInt({ min: 0 }).withMessage('Inventory must be a non-negative integer'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const product = await ProductModel.create(req.body);
        return res.status(201).json(product);
    }
    catch (error) {
        console.error('Error creating product:', error);
        return res.status(500).json({ error: 'Failed to create product' });
    }
});
// Update product
router.put('/:id', async (req, res) => {
    try {
        const product = await ProductModel.update(req.params.id, req.body);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.json(product);
    }
    catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({ error: 'Failed to update product' });
    }
});
// Delete product
router.delete('/:id', async (req, res) => {
    try {
        const success = await ProductModel.remove(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({ error: 'Failed to delete product' });
    }
});
export default router;
//# sourceMappingURL=products.js.map
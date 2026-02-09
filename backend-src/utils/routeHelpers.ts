import { Router, Request, Response } from 'express';

// Helper to create basic CRUD routes for simple tables
export function createSimpleRoutes(tableName: string): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    res.json({ message: `${tableName} route - implement as needed` });
  });

  router.get('/:id', async (_req: Request, res: Response) => {
    res.json({ message: `${tableName}/:id route - implement as needed` });
  });

  router.post('/', async (_req: Request, res: Response) => {
    res.status(201).json({ message: `${tableName} create - implement as needed` });
  });

  router.put('/:id', async (_req: Request, res: Response) => {
    res.json({ message: `${tableName} update - implement as needed` });
  });

  router.delete('/:id', async (_req: Request, res: Response) => {
    res.status(204).send();
  });

  return router;
}

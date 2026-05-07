import { Router, Response } from 'express';
import { pool } from '../db/init';
import { authenticate, AuthRequest } from '../middleware/auth';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { app_id, unread } = req.query;
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: any[] = [req.user!.id];
    if (app_id) { query += ` AND app_id = $2`; params.push(app_id); }
    if (unread === 'true') query += ` AND read = false`;
    query += ' ORDER BY created_at DESC LIMIT 50';
    const result = await pool.query(query, params);
    res.json({ notifications: result.rows });
  } catch { res.status(500).json({ error: 'Failed to fetch notifications' }); }
});

notificationsRouter.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to mark read' }); }
});

notificationsRouter.put('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('UPDATE notifications SET read = true WHERE user_id = $1', [req.user!.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to mark all read' }); }
});

notificationsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete' }); }
});

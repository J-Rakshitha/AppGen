import { Router, Response } from 'express';
import { pool } from '../db/init';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, config, status, created_at, updated_at
       FROM apps WHERE user_id = $1 AND status != 'archived' ORDER BY updated_at DESC`,
      [req.user!.userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch apps' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, config } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'App name is required' });
    }
    const appConfig = config || req.body;
    const appName = name || appConfig.name || 'Untitled App';

    // Auto-generate pages from entities if none exist
    const entities = appConfig.entities || [];
    const pages = appConfig.pages && appConfig.pages.length > 0
      ? appConfig.pages
      : entities.length > 0
        ? entities.map((entity: any, i: number) => ({
            id: entity.name,
            label: entity.label || entity.name,
            icon: '📋',
            sections: [{ type: 'table', entity: entity.name }],
          }))
        : [{ id: 'home', label: 'Home', icon: '🏠', sections: [] }];

    const finalConfig = { ...appConfig, pages };

    const result = await pool.query(
      `INSERT INTO apps (user_id, name, description, config, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, name, description, config, status, created_at, updated_at`,
      [req.user!.userId, appName, description || '', JSON.stringify(finalConfig)]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create app' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, config, status, created_at, updated_at
       FROM apps WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'App not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch app' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, config } = req.body;
    const result = await pool.query(
      `UPDATE apps SET name = $1, description = $2, config = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING id, name, description, config, status, created_at, updated_at`,
      [name, description || '', JSON.stringify(config), req.params.id, req.user!.userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'App not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update app' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `UPDATE apps SET status = 'archived', updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'App not found' });
    }
    res.json({ success: true, data: { message: 'App deleted' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete app' });
  }
});

router.get('/:id/export', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT name, config FROM apps WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'App not found' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="app_config.json"`);
    res.send(JSON.stringify(result.rows[0].config, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to export app' });
  }
});

export default router;
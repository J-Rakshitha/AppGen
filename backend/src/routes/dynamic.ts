import { Router, Response } from 'express';
import { pool } from '../db/init';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/:appId/:table', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { appId, table } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 25, 100);
    const offset = (page - 1) * pageSize;
    const search = req.query.search as string || '';

    const app = await pool.query(
      'SELECT id FROM apps WHERE id = $1 AND user_id = $2 AND status != $3',
      [appId, req.user!.userId, 'archived']
    );
    if (!app.rows[0]) {
      return res.status(404).json({ success: false, error: 'App not found' });
    }

    let whereClause = 'WHERE app_id = $1 AND table_name = $2 AND deleted_at IS NULL AND user_id = $3';
    const params: any[] = [appId, table, req.user!.userId];

    if (search) {
      whereClause += ` AND data::text ILIKE $4`;
      params.push(`%${search}%`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM app_data ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    const dataResult = await pool.query(
      `SELECT id, data, created_at, updated_at FROM app_data
       ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    const rows = dataResult.rows.map((r: any) => ({
      id: r.id,
      ...r.data,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    res.json({
      success: true,
      data: rows,
      meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch data' });
  }
});

router.get('/:appId/:table/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { appId, table, id } = req.params;
    const result = await pool.query(
      `SELECT id, data, created_at, updated_at FROM app_data
       WHERE app_id = $1 AND table_name = $2 AND id = $3 AND user_id = $4 AND deleted_at IS NULL`,
      [appId, table, id, req.user!.userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    const r = result.rows[0];
    res.json({ success: true, data: { id: r.id, ...r.data, created_at: r.created_at, updated_at: r.updated_at } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch record' });
  }
});

router.post('/:appId/:table', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { appId, table } = req.params;
    const data = req.body;

    const app = await pool.query(
      'SELECT id FROM apps WHERE id = $1 AND user_id = $2',
      [appId, req.user!.userId]
    );
    if (!app.rows[0]) {
      return res.status(404).json({ success: false, error: 'App not found' });
    }

    const result = await pool.query(
      `INSERT INTO app_data (app_id, table_name, user_id, data)
       VALUES ($1, $2, $3, $4)
       RETURNING id, data, created_at, updated_at`,
      [appId, table, req.user!.userId, JSON.stringify(data)]
    );
    const r = result.rows[0];
    res.status(201).json({ success: true, data: { id: r.id, ...r.data, created_at: r.created_at, updated_at: r.updated_at } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create record' });
  }
});

router.put('/:appId/:table/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { appId, table, id } = req.params;
    const data = req.body;

    const result = await pool.query(
      `UPDATE app_data SET data = $1, updated_at = NOW()
       WHERE app_id = $2 AND table_name = $3 AND id = $4 AND user_id = $5 AND deleted_at IS NULL
       RETURNING id, data, created_at, updated_at`,
      [JSON.stringify(data), appId, table, id, req.user!.userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    const r = result.rows[0];
    res.json({ success: true, data: { id: r.id, ...r.data, created_at: r.created_at, updated_at: r.updated_at } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update record' });
  }
});

router.delete('/:appId/:table/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { appId, table, id } = req.params;
    const result = await pool.query(
      `UPDATE app_data SET deleted_at = NOW()
       WHERE app_id = $1 AND table_name = $2 AND id = $3 AND user_id = $4 AND deleted_at IS NULL`,
      [appId, table, id, req.user!.userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: { message: 'Record deleted' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete record' });
  }
});

router.get('/:appId/stats/overview', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { appId } = req.params;
    const result = await pool.query(
      `SELECT table_name, COUNT(*) as count FROM app_data
       WHERE app_id = $1 AND user_id = $2 AND deleted_at IS NULL
       GROUP BY table_name`,
      [appId, req.user!.userId]
    );
    const stats: Record<string, number> = {};
    result.rows.forEach((r: any) => { stats[r.table_name] = parseInt(r.count); });
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;
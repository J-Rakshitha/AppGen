import { Router, Response } from 'express';
import { pool } from '../db/init';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateAndNormalizeConfig, EntityConfig, FieldConfig } from '../config/validator';
import { createNotification } from '../services/notifications';

export const dynamicRouter = Router();
dynamicRouter.use(authenticate);

// Validate data against entity schema
function validateEntityData(data: Record<string, any>, entity: EntityConfig): { valid: boolean; errors: string[]; cleaned: Record<string, any> } {
  const errors: string[] = [];
  const cleaned: Record<string, any> = {};

  for (const field of entity.fields) {
    if (field.hidden && field.name === 'id') continue;
    const value = data[field.name];

    // Required check
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field.label || field.name}' is required`);
      continue;
    }

    if (value === undefined || value === null || value === '') {
      if (field.default !== undefined) cleaned[field.name] = field.default;
      continue;
    }

    // Type coercion
    switch (field.type) {
      case 'number':
      case 'integer': {
        const n = Number(value);
        if (isNaN(n)) errors.push(`Field '${field.name}' must be a number`);
        else cleaned[field.name] = field.type === 'integer' ? Math.trunc(n) : n;
        break;
      }
      case 'boolean':
        cleaned[field.name] = Boolean(value === 'true' || value === true || value === 1);
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          errors.push(`Field '${field.name}' must be a valid email`);
        } else cleaned[field.name] = String(value).toLowerCase();
        break;
      case 'select':
        if (field.options && !field.options.includes(String(value))) {
          errors.push(`Field '${field.name}' must be one of: ${field.options.join(', ')}`);
        } else cleaned[field.name] = value;
        break;
      case 'json':
        try {
          cleaned[field.name] = typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          errors.push(`Field '${field.name}' must be valid JSON`);
        }
        break;
      default:
        cleaned[field.name] = String(value);
    }
  }

  return { valid: errors.length === 0, errors, cleaned };
}

// Get entity config helper
async function getEntityConfig(appId: string, entityName: string, userId: string) {
  const appResult = await pool.query(
    'SELECT config FROM apps WHERE id = $1 AND (user_id = $2 OR is_public = true)',
    [appId, userId]
  );
  if (appResult.rows.length === 0) return null;

  const config = appResult.rows[0].config;
  const entities = config.entities || [];
  return entities.find((e: EntityConfig) => e.name === entityName) || null;
}

// LIST records
dynamicRouter.get('/:appId/:entity', async (req: AuthRequest, res: Response) => {
  const { appId, entity } = req.params;
  const { page = '1', limit = '50', search, sort, order = 'DESC', filter } = req.query;

  try {
    const entityConfig = await getEntityConfig(appId, entity, req.user!.id);
    if (!entityConfig) return res.status(404).json({ error: 'Entity not found' });

    let query = `SELECT id, data, created_at, updated_at FROM app_data WHERE app_id = $1 AND entity = $2 AND user_id = $3`;
    const params: any[] = [appId, entity, req.user!.id];
    let paramIdx = 4;

    if (search) {
      query += ` AND data::text ILIKE $${paramIdx}`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (filter) {
      try {
        const filterObj = typeof filter === 'string' ? JSON.parse(filter) : filter;
        for (const [key, val] of Object.entries(filterObj)) {
          query += ` AND data->>'${key}' = $${paramIdx}`;
          params.push(val);
          paramIdx++;
        }
      } catch {}
    }

    const sortField = sort ? `data->>'${sort}'` : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortField} ${sortOrder}`;

    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(200, parseInt(String(limit)));
    query += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(limitNum, (pageNum - 1) * limitNum);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM app_data WHERE app_id = $1 AND entity = $2 AND user_id = $3`,
      [appId, entity, req.user!.id]
    );

    const result = await pool.query(query, params);
    const records = result.rows.map(r => ({ id: r.id, ...r.data, _createdAt: r.created_at, _updatedAt: r.updated_at }));

    res.json({
      records,
      total: parseInt(countResult.rows[0].count),
      page: pageNum,
      limit: limitNum,
      entity: entityConfig,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch records', detail: err.message });
  }
});

// GET single record
dynamicRouter.get('/:appId/:entity/:id', async (req: AuthRequest, res: Response) => {
  const { appId, entity, id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, data, created_at, updated_at FROM app_data WHERE id = $1 AND app_id = $2 AND entity = $3 AND user_id = $4',
      [id, appId, entity, req.user!.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    const r = result.rows[0];
    res.json({ record: { id: r.id, ...r.data, _createdAt: r.created_at, _updatedAt: r.updated_at } });
  } catch {
    res.status(500).json({ error: 'Failed to get record' });
  }
});

// CREATE record
dynamicRouter.post('/:appId/:entity', async (req: AuthRequest, res: Response) => {
  const { appId, entity } = req.params;
  try {
    const entityConfig = await getEntityConfig(appId, entity, req.user!.id);
    if (!entityConfig) return res.status(404).json({ error: 'Entity not found' });

    const { valid, errors, cleaned } = validateEntityData(req.body, entityConfig);
    if (!valid) return res.status(422).json({ error: 'Validation failed', errors });

    const result = await pool.query(
      'INSERT INTO app_data (app_id, entity, data, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [appId, entity, JSON.stringify(cleaned), req.user!.id]
    );

    const r = result.rows[0];
    const record = { id: r.id, ...r.data, _createdAt: r.created_at };

    // Trigger notification
    createNotification({
      userId: req.user!.id,
      appId,
      type: 'record_created',
      title: `New ${entityConfig.label || entity} created`,
      message: `Record was successfully created`,
    }).catch(console.error);

    res.status(201).json({ record });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create record', detail: err.message });
  }
});

// UPDATE record
dynamicRouter.put('/:appId/:entity/:id', async (req: AuthRequest, res: Response) => {
  const { appId, entity, id } = req.params;
  try {
    const entityConfig = await getEntityConfig(appId, entity, req.user!.id);
    if (!entityConfig) return res.status(404).json({ error: 'Entity not found' });

    // Merge with existing data
    const existing = await pool.query(
      'SELECT data FROM app_data WHERE id = $1 AND app_id = $2 AND entity = $3 AND user_id = $4',
      [id, appId, entity, req.user!.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Record not found' });

    const merged = { ...existing.rows[0].data, ...req.body };
    const { valid, errors, cleaned } = validateEntityData(merged, entityConfig);
    if (!valid) return res.status(422).json({ error: 'Validation failed', errors });

    const result = await pool.query(
      'UPDATE app_data SET data = $1, updated_at = NOW() WHERE id = $2 AND app_id = $3 AND user_id = $4 RETURNING *',
      [JSON.stringify(cleaned), id, appId, req.user!.id]
    );

    const r = result.rows[0];
    res.json({ record: { id: r.id, ...r.data, _updatedAt: r.updated_at } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// DELETE record
dynamicRouter.delete('/:appId/:entity/:id', async (req: AuthRequest, res: Response) => {
  const { appId, entity, id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM app_data WHERE id = $1 AND app_id = $2 AND entity = $3 AND user_id = $4 RETURNING id',
      [id, appId, entity, req.user!.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ success: true, id });
  } catch {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// BULK operations
dynamicRouter.post('/:appId/:entity/bulk', async (req: AuthRequest, res: Response) => {
  const { appId, entity } = req.params;
  const { operation, ids, data } = req.body;

  try {
    if (operation === 'delete' && Array.isArray(ids)) {
      await pool.query(
        'DELETE FROM app_data WHERE id = ANY($1) AND app_id = $2 AND entity = $3 AND user_id = $4',
        [ids, appId, entity, req.user!.id]
      );
      return res.json({ success: true, deleted: ids.length });
    }
    res.status(400).json({ error: 'Unknown bulk operation' });
  } catch {
    res.status(500).json({ error: 'Bulk operation failed' });
  }
});

import { Router, Response } from 'express';
import { pool } from '../db/init';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateAndNormalizeConfig } from '../config/validator';

export const appsRouter = Router();
appsRouter.use(authenticate);

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// List user's apps
appsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, slug, config, is_public, locale, created_at, updated_at FROM apps WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user!.id]
    );
    res.json({ apps: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
});

// Create app
appsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { config: rawConfig, name, locale } = req.body;
    if (!rawConfig) return res.status(400).json({ error: 'Config is required' });

    const { config, warnings } = validateAndNormalizeConfig(rawConfig);
    const appName = name || config.name || 'My App';
    let slug = slugify(appName);

    // Ensure unique slug
    const existing = await pool.query('SELECT id FROM apps WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) slug = `${slug}-${Date.now()}`;

    const result = await pool.query(
      'INSERT INTO apps (user_id, name, slug, config, locale) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user!.id, appName, slug, JSON.stringify(config), locale || config.locale || 'en']
    );
    
    res.status(201).json({ app: result.rows[0], warnings });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create app', detail: err.message });
  }
});

// Get app by id
appsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM apps WHERE id = $1 AND (user_id = $2 OR is_public = true)',
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'App not found' });
    res.json({ app: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Failed to get app' });
  }
});

// Update app config
appsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { config: rawConfig, name, locale, is_public } = req.body;
    
    const app = await pool.query('SELECT * FROM apps WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    if (app.rows.length === 0) return res.status(404).json({ error: 'App not found' });

    let config = app.rows[0].config;
    let warnings: string[] = [];

    if (rawConfig) {
      const normalized = validateAndNormalizeConfig(rawConfig);
      config = normalized.config;
      warnings = normalized.warnings;
    }

    const result = await pool.query(
      `UPDATE apps SET config = $1, name = COALESCE($2, name), locale = COALESCE($3, locale), 
       is_public = COALESCE($4, is_public), updated_at = NOW() WHERE id = $5 AND user_id = $6 RETURNING *`,
      [JSON.stringify(config), name, locale, is_public, req.params.id, req.user!.id]
    );
    
    res.json({ app: result.rows[0], warnings });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update app' });
  }
});

// Delete app
appsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM apps WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user!.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'App not found' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete app' });
  }
});

// Export app config as downloadable
appsRouter.get('/:id/export', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM apps WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'App not found' });
    const app = result.rows[0];
    res.setHeader('Content-Disposition', `attachment; filename="${app.slug}-config.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(app.config, null, 2));
  } catch {
    res.status(500).json({ error: 'Export failed' });
  }
});

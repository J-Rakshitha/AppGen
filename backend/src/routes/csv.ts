import { Router, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { pool } from '../db/init';
import { authenticate, AuthRequest } from '../middleware/auth';
import { EntityConfig } from '../config/validator';

export const csvRouter = Router();
csvRouter.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Preview CSV (returns headers + first 5 rows)
csvRouter.post('/:appId/preview', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    const csvText = req.file.buffer.toString('utf-8');
    const rows: any[] = await new Promise((resolve, reject) => {
      parse(csvText, { columns: true, skip_empty_lines: true, trim: true }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    res.json({ headers, preview: rows.slice(0, 5), totalRows: rows.length });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to parse CSV', detail: err.message });
  }
});

// Import CSV into entity
csvRouter.post('/:appId/:entity/import', upload.single('file'), async (req: AuthRequest, res: Response) => {
  const { appId, entity } = req.params;
  const { mapping } = req.body; // { csvColumn: entityField }

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // Get entity config
    const appResult = await pool.query('SELECT config FROM apps WHERE id = $1 AND user_id = $2', [appId, req.user!.id]);
    if (appResult.rows.length === 0) return res.status(404).json({ error: 'App not found' });

    const config = appResult.rows[0].config;
    const entityConfig: EntityConfig = config.entities?.find((e: EntityConfig) => e.name === entity);
    if (!entityConfig) return res.status(404).json({ error: 'Entity not found' });

    const fieldMapping = mapping ? (typeof mapping === 'string' ? JSON.parse(mapping) : mapping) : null;

    const csvText = req.file.buffer.toString('utf-8');
    const rows: any[] = await new Promise((resolve, reject) => {
      parse(csvText, { columns: true, skip_empty_lines: true, trim: true }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    let imported = 0;
    const errors: any[] = [];

    // Log import
    const importLog = await pool.query(
      'INSERT INTO csv_imports (app_id, user_id, filename, entity, row_count, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [appId, req.user!.id, req.file.originalname, entity, rows.length, 'processing']
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        let data: Record<string, any> = {};

        if (fieldMapping) {
          // Apply column mapping
          for (const [csvCol, entityField] of Object.entries(fieldMapping)) {
            if (entityField && row[csvCol] !== undefined) {
              data[String(entityField)] = row[csvCol];
            }
          }
        } else {
          // Auto-map by field name
          data = { ...row };
        }

        // Coerce types based on entity fields
        for (const field of entityConfig.fields) {
          if (field.name === 'id' || field.hidden) continue;
          if (data[field.name] !== undefined) {
            if (field.type === 'number' || field.type === 'integer') {
              const n = Number(data[field.name]);
              data[field.name] = isNaN(n) ? null : n;
            } else if (field.type === 'boolean') {
              data[field.name] = ['true', '1', 'yes', 'y'].includes(String(data[field.name]).toLowerCase());
            }
          }
        }

        await pool.query(
          'INSERT INTO app_data (app_id, entity, data, user_id) VALUES ($1, $2, $3, $4)',
          [appId, entity, JSON.stringify(data), req.user!.id]
        );
        imported++;
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message });
      }
    }

    await pool.query(
      'UPDATE csv_imports SET status = $1, errors = $2 WHERE id = $3',
      [errors.length > 0 ? 'partial' : 'complete', JSON.stringify(errors), importLog.rows[0].id]
    );

    res.json({ success: true, imported, errors, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Import failed', detail: err.message });
  }
});

// Get import history
csvRouter.get('/:appId/imports', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM csv_imports WHERE app_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 20',
      [req.params.appId, req.user!.id]
    );
    res.json({ imports: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to get imports' });
  }
});

// Export entity as CSV
csvRouter.get('/:appId/:entity/export', async (req: AuthRequest, res: Response) => {
  const { appId, entity } = req.params;
  try {
    const result = await pool.query(
      'SELECT data, created_at FROM app_data WHERE app_id = $1 AND entity = $2 AND user_id = $3 ORDER BY created_at DESC',
      [appId, entity, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(200).send('No records found');
    }

    const records = result.rows.map(r => ({ ...r.data, created_at: r.created_at }));
    const headers = Object.keys(records[0]);
    const csv = [
      headers.join(','),
      ...records.map(r => headers.map(h => {
        const val = r[h];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      }).join(','))
    ].join('\n');

    res.setHeader('Content-Disposition', `attachment; filename="${entity}-export.csv"`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch {
    res.status(500).json({ error: 'Export failed' });
  }
});

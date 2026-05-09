import { Router, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { pool } from '../db/init';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/import/:appId/:table', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { appId, table } = req.params;

    const app = await pool.query(
      'SELECT id FROM apps WHERE id = $1 AND user_id = $2',
      [appId, req.user!.userId]
    );
    if (!app.rows[0]) {
      return res.status(404).json({ success: false, error: 'App not found' });
    }

    let records: Record<string, string>[];
    try {
      records = parse(req.file.buffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid CSV format' });
    }

    const errors: { row: number; error: string }[] = [];
    let imported = 0;

    for (let i = 0; i < records.length; i++) {
      try {
        await pool.query(
          `INSERT INTO app_data (app_id, table_name, user_id, data) VALUES ($1, $2, $3, $4)`,
          [appId, table, req.user!.userId, JSON.stringify(records[i])]
        );
        imported++;
      } catch (err) {
        errors.push({ row: i + 1, error: String(err) });
      }
    }

    res.json({
      success: true,
      data: {
        total: records.length,
        imported,
        failed: errors.length,
        errors: errors.slice(0, 10),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to import CSV' });
  }
});

router.get('/export/:appId/:table', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { appId, table } = req.params;

    const result = await pool.query(
      `SELECT data FROM app_data
       WHERE app_id = $1 AND table_name = $2 AND user_id = $3 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [appId, table, req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No data found' });
    }

    const rows = result.rows.map((r: any) => r.data);
    const headers = Object.keys(rows[0] || {});
    const csvRows = [
      headers.join(','),
      ...rows.map((row: any) =>
        headers.map((h) => {
          const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        }).join(',')
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${table}_export.csv"`);
    res.send(csvRows.join('\n'));
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to export CSV' });
  }
});

export default router;
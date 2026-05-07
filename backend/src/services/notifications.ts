import { pool } from '../db/init';

interface NotificationPayload {
  userId: string;
  appId: string;
  type: string;
  title: string;
  message?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(payload: NotificationPayload) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, app_id, type, title, message, metadata) VALUES ($1,$2,$3,$4,$5,$6)',
      [payload.userId, payload.appId, payload.type, payload.title, payload.message || null, JSON.stringify(payload.metadata || {})]
    );
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

import { Router, type Request, type Response } from 'express';
import db from '../db.js';

const router = Router();

router.get('/number/:numberId', (req: Request, res: Response) => {
  const conversations = db.prepare(`
    SELECT * FROM conversations 
    WHERE number_id = ? 
    ORDER BY last_message_at DESC NULLS LAST, created_at DESC
  `).all(req.params.numberId);
  res.json(conversations);
});

router.post('/', (req: Request, res: Response) => {
  const { number_id, contact_number, contact_name } = req.body;

  const existing: any = db.prepare(
    'SELECT * FROM conversations WHERE number_id = ? AND contact_number = ?'
  ).get(number_id, contact_number);

  if (existing) {
    res.json(existing);
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO conversations (number_id, contact_number, contact_name) 
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(number_id, contact_number, contact_name || null);
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);
  res.json(conversation);
});

router.put('/:id', (req: Request, res: Response) => {
  const { contact_name } = req.body;
  db.prepare(`UPDATE conversations SET contact_name = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(contact_name, req.params.id);
  const updated = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.put('/:id/read', (req: Request, res: Response) => {
  db.prepare(`UPDATE conversations SET unread_count = 0, updated_at = datetime('now') WHERE id = ?`)
    .run(req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM conversations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;

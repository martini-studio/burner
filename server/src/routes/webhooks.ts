import { Router, type Request, type Response } from 'express';
import db from '../db.js';

const router = Router();

router.post('/incoming-sms', (req: Request, res: Response) => {
  const { From, To, Body, MessageSid } = req.body;

  const number: any = db.prepare('SELECT * FROM numbers WHERE phone_number = ?').get(To);

  if (!number) {
    console.warn(`Received SMS for unknown number: ${To}`);
    res.type('text/xml').send('<Response></Response>');
    return;
  }

  let conversation: any = db.prepare(
    'SELECT * FROM conversations WHERE number_id = ? AND contact_number = ?'
  ).get(number.id, From);

  if (!conversation) {
    const stmt = db.prepare(`
      INSERT INTO conversations (number_id, contact_number) VALUES (?, ?)
    `);
    const result = stmt.run(number.id, From);
    conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);
  }

  db.prepare(`
    INSERT INTO messages (conversation_id, twilio_sid, direction, body, status) 
    VALUES (?, ?, 'inbound', ?, 'received')
  `).run(conversation.id, MessageSid, Body);

  db.prepare(`
    UPDATE conversations 
    SET last_message = ?, last_message_at = datetime('now'), 
        unread_count = unread_count + 1, updated_at = datetime('now') 
    WHERE id = ?
  `).run(Body, conversation.id);

  res.type('text/xml').send('<Response></Response>');
});

export default router;

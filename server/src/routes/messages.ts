import { Router, type Request, type Response } from 'express';
import db from '../db.js';
import { getTwilioClient } from '../twilio-client.js';

const router = Router();

router.get('/conversation/:conversationId', (req: Request, res: Response) => {
  const messages = db.prepare(`
    SELECT * FROM messages 
    WHERE conversation_id = ? 
    ORDER BY created_at ASC
  `).all(req.params.conversationId);
  res.json(messages);
});

router.post('/send', async (req: Request, res: Response) => {
  try {
    const { conversation_id, body } = req.body;

    const conversation: any = db.prepare(`
      SELECT c.*, n.phone_number as from_number 
      FROM conversations c 
      JOIN numbers n ON n.id = c.number_id 
      WHERE c.id = ?
    `).get(conversation_id);

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const client = getTwilioClient();
    const twilioMessage = await client.messages.create({
      body,
      from: conversation.from_number,
      to: conversation.contact_number,
    });

    const stmt = db.prepare(`
      INSERT INTO messages (conversation_id, twilio_sid, direction, body, status) 
      VALUES (?, ?, 'outbound', ?, ?)
    `);
    const result = stmt.run(conversation_id, twilioMessage.sid, body, twilioMessage.status);

    db.prepare(`
      UPDATE conversations 
      SET last_message = ?, last_message_at = datetime('now'), updated_at = datetime('now') 
      WHERE id = ?
    `).run(body, conversation_id);

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
    res.json(message);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

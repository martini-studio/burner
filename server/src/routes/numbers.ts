import { Router, type Request, type Response } from 'express';
import db from '../db.js';
import { getTwilioClient } from '../twilio-client.js';

const router = Router();

const COUNTRY_CODES: Record<string, string> = {
  AU: 'AU',
  US: 'US',
  GB: 'GB',
  CA: 'CA',
  NZ: 'NZ',
};

router.get('/', (_req: Request, res: Response) => {
  const numbers = db.prepare(`
    SELECT n.*, 
      (SELECT COUNT(*) FROM conversations c WHERE c.number_id = n.id AND c.unread_count > 0) as unread_conversations
    FROM numbers n 
    WHERE n.is_active = 1 
    ORDER BY n.created_at DESC
  `).all();
  res.json(numbers);
});

router.get('/available', async (req: Request, res: Response) => {
  try {
    const client = getTwilioClient();
    const country = (req.query.country as string) || 'AU';
    const countryCode = COUNTRY_CODES[country] || country;

    const numbers = await client.availablePhoneNumbers(countryCode)
      .local.list({
        smsEnabled: true,
        limit: 20,
      });

    if (numbers.length === 0) {
      const mobileNumbers = await client.availablePhoneNumbers(countryCode)
        .mobile.list({
          smsEnabled: true,
          limit: 20,
        });
      res.json(mobileNumbers.map(n => ({
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
        locality: n.locality,
        region: n.region,
        capabilities: n.capabilities,
      })));
      return;
    }

    res.json(numbers.map(n => ({
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      locality: n.locality,
      region: n.region,
      capabilities: n.capabilities,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/provision', async (req: Request, res: Response) => {
  try {
    const client = getTwilioClient();
    const { phoneNumber, label } = req.body;
    const webhookUrl = process.env.WEBHOOK_BASE_URL || 'https://your-server.com';

    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber,
      smsUrl: `${webhookUrl}/api/webhooks/incoming-sms`,
      smsMethod: 'POST',
    });

    const country = phoneNumber.startsWith('+61') ? 'AU' :
      phoneNumber.startsWith('+1') ? (phoneNumber.length === 12 ? 'US' : 'CA') :
      phoneNumber.startsWith('+44') ? 'GB' :
      phoneNumber.startsWith('+64') ? 'NZ' : 'US';

    const stmt = db.prepare(`
      INSERT INTO numbers (phone_number, friendly_name, label, country_code, twilio_sid) 
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(purchased.phoneNumber, purchased.friendlyName, label || '', country, purchased.sid);

    const newNumber = db.prepare('SELECT * FROM numbers WHERE id = ?').get(result.lastInsertRowid);
    res.json(newNumber);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const { label } = req.body;
  db.prepare(`UPDATE numbers SET label = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(label, req.params.id);
  const updated = db.prepare('SELECT * FROM numbers WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const number: any = db.prepare('SELECT * FROM numbers WHERE id = ?').get(req.params.id);
    if (!number) {
      res.status(404).json({ error: 'Number not found' });
      return;
    }

    try {
      const client = getTwilioClient();
      await client.incomingPhoneNumbers(number.twilio_sid).remove();
    } catch (err: any) {
      console.warn('Failed to release number from Twilio:', err.message);
    }

    db.prepare('DELETE FROM numbers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

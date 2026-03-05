import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { query } from './db.js';
import { adminRequired, authRequired } from './middleware.js';

dotenv.config();
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));

app.post('/auth/register', async (req, res) => {
  const { name, email, password, referredBy } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Campos obrigatórios em falta.' });
  }

  const hash = await bcrypt.hash(password, 10);
  const affiliateCode = `AFF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const referred = referredBy
    ? await query('SELECT id FROM users WHERE affiliate_code = $1', [referredBy])
    : { rows: [] };

  try {
    const result = await query(
      `INSERT INTO users (name, email, password_hash, affiliate_code, referred_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, level, affiliate_code`,
      [name, email, hash, affiliateCode, referred.rows[0]?.id || null]
    );

    await query(
      'INSERT INTO subscriptions (user_id, status, plan, current_period_end) VALUES ($1, $2, $3, NOW())',
      [result.rows[0].id, 'inactive', 'BASIC']
    );

    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(409).json({ message: 'Email já registado.' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Credenciais inválidas.' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '12h' });
  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      level: user.level,
      affiliateCode: user.affiliate_code
    }
  });
});

app.get('/user/profile', authRequired, async (req, res) => {
  const sub = await query(
    `SELECT status, plan, current_period_end
     FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [req.user.id]
  );
  res.json({ user: req.user, subscription: sub.rows[0] });
});

app.get('/tips/week', authRequired, async (_, res) => {
  const tips = await query(
    `SELECT * FROM tips
     WHERE match_date >= date_trunc('week', NOW())
     ORDER BY match_date ASC`
  );
  res.json(tips.rows);
});

app.get('/tips/history', authRequired, async (_, res) => {
  const tips = await query(
    `SELECT * FROM tips
     WHERE match_date < date_trunc('week', NOW())
     ORDER BY match_date DESC LIMIT 50`
  );
  res.json(tips.rows);
});

app.get('/tips/stats', authRequired, async (_, res) => {
  const stats = await query(
    `SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN result = 'won' THEN 1 ELSE 0 END)::int AS won,
      ROUND(
        CASE WHEN COUNT(*) = 0 THEN 0
        ELSE (SUM(CASE WHEN result = 'won' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
        END, 2
      ) AS success_rate
     FROM tips
     WHERE result IN ('won', 'lost')`
  );
  res.json(stats.rows[0]);
});

app.get('/notifications', authRequired, async (req, res) => {
  const data = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [req.user.id]);
  res.json(data.rows);
});

app.post('/admin/tips', authRequired, adminRequired, async (req, res) => {
  const { title, competition, matchDate, prediction, confidence, odds } = req.body;
  const created = await query(
    `INSERT INTO tips (title, competition, match_date, prediction, confidence, odds, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [title, competition, matchDate, prediction, confidence, odds, req.user.id]
  );

  await query(
    `INSERT INTO notifications (user_id, message)
     SELECT id, $1 FROM users WHERE role = 'user'`,
    [`Novo palpite publicado: ${title}`]
  );

  res.status(201).json(created.rows[0]);
});

app.put('/admin/tips/:id', authRequired, adminRequired, async (req, res) => {
  const { id } = req.params;
  const { title, competition, matchDate, prediction, confidence, odds, result } = req.body;
  const updated = await query(
    `UPDATE tips SET title = $1, competition = $2, match_date = $3, prediction = $4,
      confidence = $5, odds = $6, result = $7 WHERE id = $8 RETURNING *`,
    [title, competition, matchDate, prediction, confidence, odds, result || null, id]
  );
  res.json(updated.rows[0]);
});

app.delete('/admin/tips/:id', authRequired, adminRequired, async (req, res) => {
  await query('DELETE FROM tips WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

app.get('/admin/users', authRequired, adminRequired, async (_, res) => {
  const users = await query(
    `SELECT u.id, u.name, u.email, u.level, s.status, s.plan, s.current_period_end
     FROM users u
     LEFT JOIN LATERAL (
      SELECT * FROM subscriptions WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
     ) s ON true
     ORDER BY u.created_at DESC`
  );
  res.json(users.rows);
});

app.post('/subscriptions/checkout', authRequired, async (req, res) => {
  const { plan = 'PREMIUM' } = req.body;
  const prices = {
    BASIC: process.env.STRIPE_PRICE_BASIC,
    PREMIUM: process.env.STRIPE_PRICE_PREMIUM,
    VIP: process.env.STRIPE_PRICE_VIP
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: prices[plan], quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/app?paid=true`,
    cancel_url: `${process.env.FRONTEND_URL}/app?paid=false`,
    metadata: { userId: String(req.user.id), plan }
  });

  res.json({ checkoutUrl: session.url });
});

app.post('/subscriptions/manual-transfer', authRequired, async (req, res) => {
  const { plan = 'BASIC' } = req.body;
  await query(
    `INSERT INTO subscriptions (user_id, status, plan, current_period_end)
     VALUES ($1, 'pending_confirmation', $2, NOW() + INTERVAL '30 days')`,
    [req.user.id, plan]
  );
  res.status(201).json({ message: 'Pedido de subscrição por transferência criado.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API pronta em http://localhost:${port}`);
});

import jwt from 'jsonwebtoken';
import { query } from './db.js';

const deviceLimitByPlan = {
  BASIC: 1,
  PREMIUM: 2,
  VIP: 4
};

export const authRequired = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token em falta.' });
    }

    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (!result.rows[0]) {
      return res.status(401).json({ message: 'Utilizador inválido.' });
    }

    req.user = result.rows[0];

    const deviceFingerprint = req.headers['x-device-id'];
    if (deviceFingerprint) {
      const activeSubscription = await query(
        `SELECT plan FROM subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
        [req.user.id]
      );
      const plan = activeSubscription.rows[0]?.plan || 'BASIC';
      const limit = deviceLimitByPlan[plan] || 1;

      await query(
        `INSERT INTO devices (user_id, device_fingerprint)
         VALUES ($1, $2)
         ON CONFLICT (user_id, device_fingerprint) DO NOTHING`,
        [req.user.id, deviceFingerprint]
      );

      const countDevices = await query('SELECT COUNT(*)::int AS total FROM devices WHERE user_id = $1', [req.user.id]);
      if (countDevices.rows[0].total > limit) {
        return res.status(403).json({ message: 'Limite de dispositivos excedido para o seu plano.' });
      }
    }

    return next();
  } catch {
    return res.status(401).json({ message: 'Sessão inválida.' });
  }
};

export const adminRequired = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso de administrador necessário.' });
  }
  return next();
};

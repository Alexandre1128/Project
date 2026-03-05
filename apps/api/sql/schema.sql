CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  level VARCHAR(20) NOT NULL DEFAULT 'BASIC',
  affiliate_code VARCHAR(40) UNIQUE,
  referred_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'inactive',
  plan VARCHAR(20) NOT NULL DEFAULT 'BASIC',
  current_period_end TIMESTAMP,
  stripe_customer_id VARCHAR(120),
  stripe_subscription_id VARCHAR(120),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_fingerprint VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, device_fingerprint)
);

CREATE TABLE IF NOT EXISTS tips (
  id SERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  competition VARCHAR(120) NOT NULL,
  match_date TIMESTAMP NOT NULL,
  prediction TEXT NOT NULL,
  confidence INTEGER CHECK(confidence >= 1 AND confidence <= 100),
  result VARCHAR(20),
  odds NUMERIC(5,2),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

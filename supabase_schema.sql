-- ============================================================
-- Supabase SQL 建表语句
-- 在 supabase.com → SQL Editor 里粘贴执行即可
-- ============================================================

-- 1. 订单表
CREATE TABLE IF NOT EXISTS orders (
  id          TEXT PRIMARY KEY,
  amount      DECIMAL(10,2) NOT NULL DEFAULT 9.9,
  bazi_hash   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | expired
  token       TEXT,
  params      TEXT DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  paid_at     TIMESTAMPTZ
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_bazi_hash ON orders(bazi_hash);

-- 2. 令牌表
CREATE TABLE IF NOT EXISTS tokens (
  token       TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders(id),
  bazi_hash   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_tokens_expires ON tokens(expires_at);

-- 3. 自动清理过期订单（每天跑一次）
-- 可以用 Supabase 的 pg_cron 或手动：
-- SELECT pg_cron.schedule('clean-expired','0 3 * * *','DELETE FROM orders WHERE status=''pending'' AND created_at < NOW() - INTERVAL ''2 hours''');

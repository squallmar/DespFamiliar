-- Tabela para rastrear pagamentos Pix (Asaas e manual)
CREATE TABLE IF NOT EXISTS pix_payments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asaas_payment_id VARCHAR(255) UNIQUE,
  asaas_customer_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED, CANCELLED
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  expires_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_pix_payments_user ON pix_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_pix_payments_status ON pix_payments(status);
CREATE INDEX IF NOT EXISTS idx_pix_payments_asaas ON pix_payments(asaas_payment_id);

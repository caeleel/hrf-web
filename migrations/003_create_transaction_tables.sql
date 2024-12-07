-- Create marked_transactions table
CREATE TABLE IF NOT EXISTS marked_transactions (
  id SERIAL PRIMARY KEY,
  account_number VARCHAR(12) NOT NULL,
  transaction_id VARCHAR(255) NOT NULL UNIQUE,
  is_debit BOOLEAN NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  credited_user_id INTEGER REFERENCES users(id),
  type VARCHAR(50) NOT NULL DEFAULT 'income',
  counterparty_id VARCHAR(255),
  counterparty_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create counterparty_map table
CREATE TABLE IF NOT EXISTS counterparty_map (
  id SERIAL PRIMARY KEY,
  counterparty_id VARCHAR(255) NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id), -- nullable to indicate that this should generate a NULL marked_transaction user_id
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_marked_transactions_user ON marked_transactions(credited_user_id);
CREATE INDEX IF NOT EXISTS idx_marked_transactions_type ON marked_transactions(type);
CREATE INDEX IF NOT EXISTS idx_marked_transactions_account ON marked_transactions(account_number);
CREATE INDEX IF NOT EXISTS idx_counterparty_map_id ON counterparty_map(counterparty_id); 
-- Create check-ins table
CREATE TABLE IF NOT EXISTS check_ins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, check_in_date)
);

-- Create index on check_in_date for faster queries
CREATE INDEX IF NOT EXISTS idx_check_ins_date ON check_ins(check_in_date);

-- Also create a compound index on user_id and check_in_date since we frequently query both together
CREATE INDEX IF NOT EXISTS idx_check_ins_user_date ON check_ins(user_id, check_in_date);
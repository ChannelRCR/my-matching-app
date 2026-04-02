-- Add missing appeal_point column to sellers table if not exists
-- (It was supposed to be added in 014 but missed or cached incorrectly)
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS appeal_point TEXT;

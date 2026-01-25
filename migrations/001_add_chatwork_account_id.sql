-- Migration: Add chatwork_account_id column to employees table
-- Purpose: Enable ソウルくん integration for task reminders
-- Date: 2026-01-25
--
-- How to run:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/adzxpeboaoiojepcxlyc/sql
-- 2. Paste this SQL and click "Run"
--
-- Or run via CLI:
-- npx supabase db execute --project-ref adzxpeboaoiojepcxlyc < migrations/001_add_chatwork_account_id.sql

-- Add chatwork_account_id column
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS chatwork_account_id VARCHAR(20);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_chatwork_id
ON employees(chatwork_account_id)
WHERE chatwork_account_id IS NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'employees' AND column_name = 'chatwork_account_id';

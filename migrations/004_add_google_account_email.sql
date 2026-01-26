-- ================================================================
-- Migration: 004_add_google_account_email.sql
-- Purpose: Google Drive 自動権限管理のためのGoogleアカウントメール欄追加
-- Created: 2026-01-26
-- ================================================================

-- Googleアカウントメールカラムを追加
-- 用途: Google Driveフォルダの共有権限を自動設定するために使用
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS google_account_email VARCHAR(255);

-- インデックス作成（検索・権限同期の高速化）
CREATE INDEX IF NOT EXISTS idx_employees_google_account_email
ON employees(google_account_email)
WHERE google_account_email IS NOT NULL;

-- コメント追加
COMMENT ON COLUMN employees.google_account_email IS
'Google Workspaceアカウントのメールアドレス。Google Drive共有権限の自動設定に使用。';

-- ================================================================
-- 実行方法:
-- 1. Supabase Dashboard → SQL Editor
-- 2. このSQLを貼り付けて実行
-- または
-- psql -h <host> -U <user> -d <database> -f 004_add_google_account_email.sql
-- ================================================================

-- ============================================
-- Migration 003: Add Audit Log Table
-- org-chart 完璧プラン Phase 5
-- 作成日: 2026-01-25
-- ============================================

-- ============================================
-- STEP 1: org_chart_audit_logs テーブル作成
-- 監査ログテーブル（10の鉄則準拠）
-- ============================================

CREATE TABLE IF NOT EXISTS org_chart_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(50) NOT NULL DEFAULT 'org_soulsyncs',
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    action VARCHAR(50) NOT NULL,  -- 'create', 'read', 'update', 'delete', 'rollback', 'login', 'logout'
    target_type VARCHAR(50) NOT NULL,  -- 'employee', 'department', 'role', 'editor', 'system'
    target_id UUID,
    target_name VARCHAR(255),
    before_data JSONB,
    after_data JSONB,
    change_summary TEXT,
    ip_address VARCHAR(45),  -- IPv6対応
    user_agent TEXT,
    session_id VARCHAR(100),
    metadata JSONB,  -- 追加のメタデータ（任意）
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- コメント
COMMENT ON TABLE org_chart_audit_logs IS '組織図の操作監査ログテーブル（10の鉄則準拠）';
COMMENT ON COLUMN org_chart_audit_logs.organization_id IS 'テナント分離用の組織ID';
COMMENT ON COLUMN org_chart_audit_logs.action IS '操作種別（create/read/update/delete/rollback/login/logout）';
COMMENT ON COLUMN org_chart_audit_logs.target_type IS '対象種別（employee/department/role/editor/system）';
COMMENT ON COLUMN org_chart_audit_logs.before_data IS '変更前のデータ（JSON形式）';
COMMENT ON COLUMN org_chart_audit_logs.after_data IS '変更後のデータ（JSON形式）';
COMMENT ON COLUMN org_chart_audit_logs.change_summary IS '変更内容の要約（日本語）';

-- ============================================
-- STEP 2: インデックス作成
-- ============================================

-- 組織IDでのフィルタリング用
CREATE INDEX IF NOT EXISTS idx_audit_logs_org
    ON org_chart_audit_logs(organization_id);

-- ユーザーメールでのフィルタリング用
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
    ON org_chart_audit_logs(user_email);

-- 日時でのソート用（降順で効率的）
CREATE INDEX IF NOT EXISTS idx_audit_logs_created
    ON org_chart_audit_logs(created_at DESC);

-- 操作種別でのフィルタリング用
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
    ON org_chart_audit_logs(action);

-- 対象種別でのフィルタリング用
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type
    ON org_chart_audit_logs(target_type);

-- 対象IDでのフィルタリング用
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id
    ON org_chart_audit_logs(target_id);

-- 複合インデックス（よく使う検索パターン用）
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
    ON org_chart_audit_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_user
    ON org_chart_audit_logs(organization_id, user_email);

-- ============================================
-- STEP 3: RLS（Row Level Security）設定
-- ============================================

ALTER TABLE org_chart_audit_logs ENABLE ROW LEVEL SECURITY;

-- 閲覧: 編集者以上のみ
DROP POLICY IF EXISTS audit_logs_select_policy ON org_chart_audit_logs;
CREATE POLICY audit_logs_select_policy ON org_chart_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM org_chart_editors
            WHERE email = auth.jwt() ->> 'email'
            AND role IN ('admin', 'editor')
            AND is_active = TRUE
        )
    );

-- 挿入: 認証済みユーザーなら誰でも可（ログ記録用）
DROP POLICY IF EXISTS audit_logs_insert_policy ON org_chart_audit_logs;
CREATE POLICY audit_logs_insert_policy ON org_chart_audit_logs
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'email' IS NOT NULL
    );

-- 更新/削除: 禁止（監査ログは改ざん防止のため変更不可）
-- ポリシーを作成しないことで暗黙的に禁止

-- ============================================
-- STEP 4: 自動アーカイブ用のビュー
-- 90日以上前のログをアーカイブ対象として識別
-- ============================================

CREATE OR REPLACE VIEW org_chart_audit_logs_archive_candidates AS
SELECT *
FROM org_chart_audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- コメント
COMMENT ON VIEW org_chart_audit_logs_archive_candidates IS '90日以上前の監査ログ（アーカイブ候補）';

-- ============================================
-- STEP 5: 統計用のビュー
-- ============================================

CREATE OR REPLACE VIEW org_chart_audit_logs_stats AS
SELECT
    organization_id,
    DATE(created_at) AS log_date,
    action,
    target_type,
    COUNT(*) AS operation_count,
    COUNT(DISTINCT user_email) AS unique_users
FROM org_chart_audit_logs
GROUP BY organization_id, DATE(created_at), action, target_type
ORDER BY log_date DESC, operation_count DESC;

-- コメント
COMMENT ON VIEW org_chart_audit_logs_stats IS '監査ログの日別統計';

-- ============================================
-- STEP 6: 確認クエリ
-- ============================================

-- テーブル確認
SELECT 'org_chart_audit_logs table created' AS status;

-- RLS確認
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'org_chart_audit_logs'
ORDER BY policyname;

-- インデックス確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'org_chart_audit_logs';

-- ============================================
-- 完了メッセージ
-- ============================================
SELECT 'Migration 003: Audit log table created successfully' AS result;

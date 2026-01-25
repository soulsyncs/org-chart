-- ============================================
-- Migration 002: Add Authentication Tables
-- org-chart 完璧プラン Phase 2
-- 作成日: 2026-01-25
-- ============================================

-- ============================================
-- STEP 1: org_chart_editors テーブル作成
-- 編集者管理テーブル（Phase 4 BPaaS対応を見据えた設計）
-- ============================================

CREATE TABLE IF NOT EXISTS org_chart_editors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(50) NOT NULL DEFAULT 'org_soulsyncs',
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'editor',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ユニーク制約: 同一組織内で同じメールは1つのみ
    UNIQUE(organization_id, email),

    -- 役割は admin, editor, viewer のみ
    CONSTRAINT valid_role CHECK (role IN ('admin', 'editor', 'viewer'))
);

-- コメント
COMMENT ON TABLE org_chart_editors IS '組織図の編集権限を持つユーザー管理テーブル';
COMMENT ON COLUMN org_chart_editors.organization_id IS 'テナント分離用の組織ID（10の鉄則準拠）';
COMMENT ON COLUMN org_chart_editors.role IS 'admin=全権限, editor=編集可, viewer=閲覧のみ';

-- ============================================
-- STEP 2: インデックス作成
-- ============================================

CREATE INDEX IF NOT EXISTS idx_org_chart_editors_org
    ON org_chart_editors(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_chart_editors_email
    ON org_chart_editors(email);

CREATE INDEX IF NOT EXISTS idx_org_chart_editors_org_email
    ON org_chart_editors(organization_id, email);

CREATE INDEX IF NOT EXISTS idx_org_chart_editors_active
    ON org_chart_editors(is_active)
    WHERE is_active = TRUE;

-- ============================================
-- STEP 3: 初期データ投入
-- ============================================

INSERT INTO org_chart_editors (email, display_name, role) VALUES
    ('info@soulsyncs.jp', 'Info Admin', 'admin'),
    ('kazu@soulsyncs.jp', 'Kazu Admin', 'admin')
ON CONFLICT (organization_id, email) DO UPDATE SET
    role = EXCLUDED.role,
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

-- ============================================
-- STEP 4: RLS（Row Level Security）設定
-- ============================================

-- employees テーブル
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 閲覧: 全員可能（認証不要）
DROP POLICY IF EXISTS employees_select_policy ON employees;
CREATE POLICY employees_select_policy ON employees
    FOR SELECT
    USING (true);

-- 挿入: 編集者のみ（admin または editor）
DROP POLICY IF EXISTS employees_insert_policy ON employees;
CREATE POLICY employees_insert_policy ON employees
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM org_chart_editors
            WHERE email = auth.jwt() ->> 'email'
            AND role IN ('admin', 'editor')
            AND is_active = TRUE
        )
    );

-- 更新: 編集者のみ
DROP POLICY IF EXISTS employees_update_policy ON employees;
CREATE POLICY employees_update_policy ON employees
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM org_chart_editors
            WHERE email = auth.jwt() ->> 'email'
            AND role IN ('admin', 'editor')
            AND is_active = TRUE
        )
    );

-- 削除: 管理者のみ
DROP POLICY IF EXISTS employees_delete_policy ON employees;
CREATE POLICY employees_delete_policy ON employees
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM org_chart_editors
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
            AND is_active = TRUE
        )
    );

-- ============================================
-- departments テーブル
-- ============================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS departments_select_policy ON departments;
CREATE POLICY departments_select_policy ON departments
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS departments_insert_policy ON departments;
CREATE POLICY departments_insert_policy ON departments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM org_chart_editors
            WHERE email = auth.jwt() ->> 'email'
            AND role IN ('admin', 'editor')
            AND is_active = TRUE
        )
    );

DROP POLICY IF EXISTS departments_update_policy ON departments;
CREATE POLICY departments_update_policy ON departments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM org_chart_editors
            WHERE email = auth.jwt() ->> 'email'
            AND role IN ('admin', 'editor')
            AND is_active = TRUE
        )
    );

DROP POLICY IF EXISTS departments_delete_policy ON departments;
CREATE POLICY departments_delete_policy ON departments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM org_chart_editors
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
            AND is_active = TRUE
        )
    );

-- ============================================
-- change_history テーブル
-- ============================================

ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS change_history_select_policy ON change_history;
CREATE POLICY change_history_select_policy ON change_history
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS change_history_insert_policy ON change_history;
CREATE POLICY change_history_insert_policy ON change_history
    FOR INSERT
    WITH CHECK (
        -- 認証済みユーザーなら誰でも履歴を追加可能
        auth.jwt() ->> 'email' IS NOT NULL
    );

-- ============================================
-- roles テーブル
-- ============================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_select_policy ON roles;
CREATE POLICY roles_select_policy ON roles
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS roles_insert_policy ON roles;
CREATE POLICY roles_insert_policy ON roles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM org_chart_editors
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
            AND is_active = TRUE
        )
    );

DROP POLICY IF EXISTS roles_update_policy ON roles;
CREATE POLICY roles_update_policy ON roles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM org_chart_editors
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
            AND is_active = TRUE
        )
    );

-- ============================================
-- org_chart_editors テーブル自体のRLS
-- ============================================

ALTER TABLE org_chart_editors ENABLE ROW LEVEL SECURITY;

-- 閲覧: 管理者のみ
DROP POLICY IF EXISTS org_chart_editors_select_policy ON org_chart_editors;
CREATE POLICY org_chart_editors_select_policy ON org_chart_editors
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM org_chart_editors e
            WHERE e.email = auth.jwt() ->> 'email'
            AND e.role = 'admin'
            AND e.is_active = TRUE
        )
        OR
        -- 自分自身の情報は見れる
        email = auth.jwt() ->> 'email'
    );

-- 挿入/更新/削除: 管理者のみ
DROP POLICY IF EXISTS org_chart_editors_insert_policy ON org_chart_editors;
CREATE POLICY org_chart_editors_insert_policy ON org_chart_editors
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM org_chart_editors
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
            AND is_active = TRUE
        )
    );

DROP POLICY IF EXISTS org_chart_editors_update_policy ON org_chart_editors;
CREATE POLICY org_chart_editors_update_policy ON org_chart_editors
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM org_chart_editors
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
            AND is_active = TRUE
        )
    );

DROP POLICY IF EXISTS org_chart_editors_delete_policy ON org_chart_editors;
CREATE POLICY org_chart_editors_delete_policy ON org_chart_editors
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM org_chart_editors
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
            AND is_active = TRUE
        )
    );

-- ============================================
-- STEP 5: 更新日時自動更新トリガー
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_org_chart_editors_updated_at ON org_chart_editors;
CREATE TRIGGER update_org_chart_editors_updated_at
    BEFORE UPDATE ON org_chart_editors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: 確認クエリ
-- ============================================

-- テーブル確認
SELECT 'org_chart_editors table created' AS status, COUNT(*) AS initial_rows
FROM org_chart_editors;

-- RLS確認
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('employees', 'departments', 'change_history', 'roles', 'org_chart_editors')
ORDER BY tablename, policyname;

-- ============================================
-- 完了メッセージ
-- ============================================
SELECT 'Migration 002: Authentication tables created successfully' AS result;

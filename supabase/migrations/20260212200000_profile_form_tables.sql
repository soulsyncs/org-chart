-- =============================================================
-- プロフィールフォーム回答保存用サブテーブル
-- 3AI合議（Claude + Codex + Gemini）に基づく設計
-- 2026-02-12
-- =============================================================

-- pgcrypto拡張（暗号化用）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- 1. employee_skills: スキル自己評価・得意/苦手
-- =============================================================
CREATE TABLE IF NOT EXISTS employee_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL DEFAULT '5f98365f-e7c5-4f48-9918-7fe9aabae5df'::uuid,

    -- スキル×レベル マトリクス（25スキル×4段階）
    -- 形式: {"営業": "得意", "マーケティング": "実務経験あり", ...}
    skill_levels JSONB DEFAULT '{}'::jsonb,

    -- 得意トップ3・苦手トップ3
    top_skills JSONB DEFAULT '[]'::jsonb,
    weak_skills JSONB DEFAULT '[]'::jsonb,

    -- 得意/苦手タスク（複数選択）
    preferred_tasks JSONB DEFAULT '[]'::jsonb,
    avoided_tasks JSONB DEFAULT '[]'::jsonb,

    -- メタデータ
    source TEXT DEFAULT 'google_form',  -- データ取得元
    submitted_at TIMESTAMPTZ,           -- フォーム回答日時
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT uq_employee_skills UNIQUE (employee_id)
);

-- =============================================================
-- 2. employee_work_preferences: 稼働スタイル・キャパ
-- =============================================================
CREATE TABLE IF NOT EXISTS employee_work_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL DEFAULT '5f98365f-e7c5-4f48-9918-7fe9aabae5df'::uuid,

    -- 稼働スタイル
    monthly_hours VARCHAR(50),          -- フルタイム/120-160h/80-120h/40-80h/40h未満/案件による
    work_hours JSONB DEFAULT '[]'::jsonb,  -- 主な稼働時間帯（複数選択）
    work_style JSONB DEFAULT '[]'::jsonb,  -- 稼働の特徴（複数選択）
    work_location VARCHAR(50),          -- フルリモート/週1-2出社/週3以上/フル出社

    -- キャパ・緊急度
    capacity VARCHAR(50),               -- 余裕あり/通常/やや忙しい/パンク気味
    urgency_level VARCHAR(50),          -- 基本即レス/数時間以内/翌営業日/稼働日のみ

    -- メタデータ
    source TEXT DEFAULT 'google_form',
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT uq_employee_work_prefs UNIQUE (employee_id)
);

-- =============================================================
-- 3. employee_contact_preferences: 連絡設定・コミュニケーション
-- =============================================================
CREATE TABLE IF NOT EXISTS employee_contact_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL DEFAULT '5f98365f-e7c5-4f48-9918-7fe9aabae5df'::uuid,

    -- 連絡設定
    contact_available_hours TEXT,        -- 連絡可能時間帯（自由記述）
    preferred_channel VARCHAR(20),      -- chatwork/line/phone
    line_id VARCHAR(100),               -- LINE ID（LINE優先の場合）
    contact_ng JSONB DEFAULT '[]'::jsonb,  -- 連絡NG事項（複数選択）

    -- コミュニケーション
    communication_style VARCHAR(50),    -- 簡潔に/丁寧に/口頭がいい/こだわりなし

    -- AI開示許可
    ai_disclosure_level VARCHAR(20) DEFAULT 'full',  -- full/partial/none

    -- 趣味・興味（任意）
    hobbies TEXT,

    -- メタデータ
    source TEXT DEFAULT 'google_form',
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT uq_employee_contact_prefs UNIQUE (employee_id)
);

-- =============================================================
-- 4. employee_contract: 契約・経理・労務（管理部記入）
-- =============================================================
CREATE TABLE IF NOT EXISTS employee_contract (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL DEFAULT '5f98365f-e7c5-4f48-9918-7fe9aabae5df'::uuid,

    -- 契約情報
    contract_type VARCHAR(20),          -- 正社員/業務委託/アルバイト/B2B
    contract_start_date DATE,
    contract_end_date DATE,             -- 正社員は空可

    -- 試用期間
    trial_status VARCHAR(20),           -- 終了済み/試用期間中/該当なし
    trial_duration VARCHAR(20),         -- 1ヶ月/2ヶ月/3ヶ月/6ヶ月/その他

    -- 支払い
    payment_category VARCHAR(20),       -- 給与/外注費/その他
    payment_date TEXT,                  -- 支払日テキスト

    -- 勤怠・保険
    attendance_type VARCHAR(30),        -- 固定時間/フレックス/裁量労働/該当なし
    social_insurance VARCHAR(30),       -- 加入/未加入/該当なし

    -- インボイス（委託・B2Bのみ）
    invoice_number VARCHAR(20),         -- T+13桁

    -- Googleアカウント（権限管理用）
    google_account TEXT,

    -- メタデータ
    submitted_by TEXT,                  -- 記入者名
    source TEXT DEFAULT 'google_form_admin',
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT uq_employee_contract UNIQUE (employee_id)
);

-- =============================================================
-- 5. employee_sensitive_data: 機密データ（暗号化保管）
-- =============================================================
CREATE TABLE IF NOT EXISTS employee_sensitive_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL DEFAULT '5f98365f-e7c5-4f48-9918-7fe9aabae5df'::uuid,

    -- 暗号化フィールド（pgcrypto PGP対称暗号化）
    -- 復号: pgp_sym_decrypt(field, key)
    bank_account_encrypted BYTEA,       -- 振込先情報
    personal_contact_encrypted BYTEA,   -- 私用連絡先
    emergency_contact_encrypted BYTEA,  -- 緊急連絡先
    dependents_encrypted BYTEA,         -- 扶養家族情報

    -- メタデータ
    submitted_by TEXT,
    source TEXT DEFAULT 'google_form_admin',
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT uq_employee_sensitive UNIQUE (employee_id)
);

-- =============================================================
-- 6. data_changes_log: 監査ログ（フォーム回答の変更追跡）
-- =============================================================
CREATE TABLE IF NOT EXISTS data_changes_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '5f98365f-e7c5-4f48-9918-7fe9aabae5df'::uuid,

    -- 対象
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    table_name TEXT NOT NULL,           -- 変更対象テーブル

    -- 変更内容
    action TEXT NOT NULL,               -- insert/update/delete
    changed_fields JSONB,              -- 変更フィールド一覧
    old_values JSONB,                  -- 変更前の値
    new_values JSONB,                  -- 変更後の値

    -- 記録者
    changed_by TEXT,                    -- 記入者（system/admin/本人名）
    source TEXT,                        -- google_form/google_form_admin/api/manual

    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- インデックス
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee ON employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_org ON employee_skills(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_work_prefs_employee ON employee_work_preferences(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_work_prefs_org ON employee_work_preferences(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_contact_prefs_employee ON employee_contact_preferences(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_contact_prefs_org ON employee_contact_preferences(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_contract_employee ON employee_contract(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_contract_org ON employee_contract(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_sensitive_employee ON employee_sensitive_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_sensitive_org ON employee_sensitive_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_changes_log_employee ON data_changes_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_data_changes_log_table ON data_changes_log(table_name);
CREATE INDEX IF NOT EXISTS idx_data_changes_log_created ON data_changes_log(created_at DESC);

-- =============================================================
-- RLS（Row Level Security）ポリシー — 鉄則#1, #2
-- =============================================================

-- 全テーブルのRLS有効化
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_work_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_contact_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_sensitive_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_changes_log ENABLE ROW LEVEL SECURITY;

-- anon/authenticatedロール用ポリシー（組織IDフィルタ）
-- SELECT
CREATE POLICY "employee_skills_select" ON employee_skills
    FOR SELECT USING (organization_id::text = coalesce(current_setting('app.current_organization_id', true), '5f98365f-e7c5-4f48-9918-7fe9aabae5df'));

CREATE POLICY "employee_work_prefs_select" ON employee_work_preferences
    FOR SELECT USING (organization_id::text = coalesce(current_setting('app.current_organization_id', true), '5f98365f-e7c5-4f48-9918-7fe9aabae5df'));

CREATE POLICY "employee_contact_prefs_select" ON employee_contact_preferences
    FOR SELECT USING (organization_id::text = coalesce(current_setting('app.current_organization_id', true), '5f98365f-e7c5-4f48-9918-7fe9aabae5df'));

CREATE POLICY "employee_contract_select" ON employee_contract
    FOR SELECT USING (organization_id::text = coalesce(current_setting('app.current_organization_id', true), '5f98365f-e7c5-4f48-9918-7fe9aabae5df'));

CREATE POLICY "employee_sensitive_select" ON employee_sensitive_data
    FOR SELECT USING (organization_id::text = coalesce(current_setting('app.current_organization_id', true), '5f98365f-e7c5-4f48-9918-7fe9aabae5df'));

CREATE POLICY "data_changes_log_select" ON data_changes_log
    FOR SELECT USING (organization_id::text = coalesce(current_setting('app.current_organization_id', true), '5f98365f-e7c5-4f48-9918-7fe9aabae5df'));

-- INSERT (Apps Script経由のフォーム送信用)
CREATE POLICY "employee_skills_insert" ON employee_skills
    FOR INSERT WITH CHECK (organization_id::text = '5f98365f-e7c5-4f48-9918-7fe9aabae5df');

CREATE POLICY "employee_work_prefs_insert" ON employee_work_preferences
    FOR INSERT WITH CHECK (organization_id::text = '5f98365f-e7c5-4f48-9918-7fe9aabae5df');

CREATE POLICY "employee_contact_prefs_insert" ON employee_contact_preferences
    FOR INSERT WITH CHECK (organization_id::text = '5f98365f-e7c5-4f48-9918-7fe9aabae5df');

CREATE POLICY "employee_contract_insert" ON employee_contract
    FOR INSERT WITH CHECK (organization_id::text = '5f98365f-e7c5-4f48-9918-7fe9aabae5df');

CREATE POLICY "employee_sensitive_insert" ON employee_sensitive_data
    FOR INSERT WITH CHECK (organization_id::text = '5f98365f-e7c5-4f48-9918-7fe9aabae5df');

CREATE POLICY "data_changes_log_insert" ON data_changes_log
    FOR INSERT WITH CHECK (organization_id::text = '5f98365f-e7c5-4f48-9918-7fe9aabae5df');

-- UPDATE (UPSERT用)
CREATE POLICY "employee_skills_update" ON employee_skills
    FOR UPDATE USING (organization_id::text = '5f98365f-e7c5-4f48-9918-7fe9aabae5df');

CREATE POLICY "employee_work_prefs_update" ON employee_work_preferences
    FOR UPDATE USING (organization_id::text = '5f98365f-e7c5-4f48-9918-7fe9aabae5df');

CREATE POLICY "employee_contact_prefs_update" ON employee_contact_preferences
    FOR UPDATE USING (organization_id::text = '5f98365f-e7c5-4f48-9918-7fe9aabae5df');

CREATE POLICY "employee_contract_update" ON employee_contract
    FOR UPDATE USING (organization_id::text = '5f98365f-e7c5-4f48-9918-7fe9aabae5df');

CREATE POLICY "employee_sensitive_update" ON employee_sensitive_data
    FOR UPDATE USING (organization_id::text = '5f98365f-e7c5-4f48-9918-7fe9aabae5df');

-- =============================================================
-- updated_atトリガー
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_employee_skills_updated
    BEFORE UPDATE ON employee_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_employee_work_prefs_updated
    BEFORE UPDATE ON employee_work_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_employee_contact_prefs_updated
    BEFORE UPDATE ON employee_contact_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_employee_contract_updated
    BEFORE UPDATE ON employee_contract
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_employee_sensitive_updated
    BEFORE UPDATE ON employee_sensitive_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- コメント
-- =============================================================
COMMENT ON TABLE employee_skills IS 'スキル自己評価（本人フォームから）';
COMMENT ON TABLE employee_work_preferences IS '稼働スタイル・キャパ（本人フォームから）';
COMMENT ON TABLE employee_contact_preferences IS '連絡設定・AI開示（本人フォームから）';
COMMENT ON TABLE employee_contract IS '契約・経理・労務（管理部フォームから）';
COMMENT ON TABLE employee_sensitive_data IS '機密データ（暗号化保管。代表のみアクセス）';
COMMENT ON TABLE data_changes_log IS 'フォーム回答の変更追跡ログ';

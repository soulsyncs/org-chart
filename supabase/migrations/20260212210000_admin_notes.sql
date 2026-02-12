-- =============================================================
-- 代表専用メモテーブル（3AI合議: Claude + Codex + Gemini）
-- admin権限のみ読み書き可能
-- 2026-02-12
-- =============================================================

-- 1. テーブル作成
CREATE TABLE IF NOT EXISTS employee_admin_notes (
    employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL DEFAULT '5f98365f-e7c5-4f48-9918-7fe9aabae5df'::uuid,

    -- 報酬単価（暗号化保管 — Gemini推奨）
    compensation_encrypted BYTEA,

    -- カズさん目線の評価（平文 — 機密度低）
    memo TEXT,                    -- 一言メモ
    strength TEXT,                -- 強み評価
    weakness TEXT,                -- 弱み評価

    -- メタデータ
    updated_by TEXT,              -- 更新者メール
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS有効化
ALTER TABLE employee_admin_notes ENABLE ROW LEVEL SECURITY;

-- 3. admin判定関数
-- org_chart_editorsテーブルでrole='admin'かつis_active=trueのメールを判定
-- current_settingでリクエスト元メールを取得（フロントから設定）
CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_chart_editors
        WHERE email = coalesce(
            current_setting('app.current_user_email', true),
            ''
        )
        AND role = 'admin'
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. RLSポリシー（adminのみ全操作可能）
CREATE POLICY "admin_notes_select" ON employee_admin_notes
    FOR SELECT USING (is_org_admin());

CREATE POLICY "admin_notes_insert" ON employee_admin_notes
    FOR INSERT WITH CHECK (is_org_admin());

CREATE POLICY "admin_notes_update" ON employee_admin_notes
    FOR UPDATE USING (is_org_admin());

CREATE POLICY "admin_notes_delete" ON employee_admin_notes
    FOR DELETE USING (is_org_admin());

-- 5. updated_atトリガー
CREATE TRIGGER tr_admin_notes_updated
    BEFORE UPDATE ON employee_admin_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. インデックス
CREATE INDEX IF NOT EXISTS idx_admin_notes_org ON employee_admin_notes(organization_id);

-- 7. 報酬暗号化UPSERT RPC関数
CREATE OR REPLACE FUNCTION upsert_admin_notes(
    p_employee_id UUID,
    p_compensation TEXT DEFAULT NULL,
    p_memo TEXT DEFAULT NULL,
    p_strength TEXT DEFAULT NULL,
    p_weakness TEXT DEFAULT NULL,
    p_updated_by TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    enc_key TEXT;
BEGIN
    -- admin権限チェック
    IF NOT is_org_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

    -- 暗号化キー取得（app_configテーブルから）
    SELECT value INTO enc_key FROM app_config WHERE key = 'encryption_key';
    IF enc_key IS NULL THEN
        RAISE EXCEPTION 'Encryption key not configured';
    END IF;

    INSERT INTO employee_admin_notes (
        employee_id, organization_id,
        compensation_encrypted, memo, strength, weakness,
        updated_by
    ) VALUES (
        p_employee_id,
        '5f98365f-e7c5-4f48-9918-7fe9aabae5df'::uuid,
        CASE WHEN p_compensation IS NOT NULL
             THEN pgp_sym_encrypt(p_compensation, enc_key)
        END,
        p_memo, p_strength, p_weakness, p_updated_by
    )
    ON CONFLICT (employee_id) DO UPDATE SET
        compensation_encrypted = CASE
            WHEN p_compensation IS NOT NULL
            THEN pgp_sym_encrypt(p_compensation, enc_key)
            ELSE employee_admin_notes.compensation_encrypted
        END,
        memo = COALESCE(p_memo, employee_admin_notes.memo),
        strength = COALESCE(p_strength, employee_admin_notes.strength),
        weakness = COALESCE(p_weakness, employee_admin_notes.weakness),
        updated_by = COALESCE(p_updated_by, employee_admin_notes.updated_by),
        updated_at = now();

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 報酬復号取得RPC関数
CREATE OR REPLACE FUNCTION get_admin_notes(p_employee_id UUID)
RETURNS JSONB AS $$
DECLARE
    enc_key TEXT;
    rec RECORD;
BEGIN
    -- admin権限チェック
    IF NOT is_org_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

    SELECT value INTO enc_key FROM app_config WHERE key = 'encryption_key';

    SELECT
        employee_id,
        CASE WHEN compensation_encrypted IS NOT NULL
             THEN pgp_sym_decrypt(compensation_encrypted, enc_key)
             ELSE NULL
        END AS compensation,
        memo, strength, weakness, updated_by, updated_at
    INTO rec
    FROM employee_admin_notes
    WHERE employee_id = p_employee_id;

    IF rec IS NULL THEN
        RETURN jsonb_build_object('found', false);
    END IF;

    RETURN jsonb_build_object(
        'found', true,
        'compensation', rec.compensation,
        'memo', rec.memo,
        'strength', rec.strength,
        'weakness', rec.weakness,
        'updated_by', rec.updated_by,
        'updated_at', rec.updated_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC実行権限
GRANT EXECUTE ON FUNCTION upsert_admin_notes TO anon;
GRANT EXECUTE ON FUNCTION upsert_admin_notes TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_notes TO anon;
GRANT EXECUTE ON FUNCTION get_admin_notes TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_admin TO anon;
GRANT EXECUTE ON FUNCTION is_org_admin TO authenticated;

COMMENT ON TABLE employee_admin_notes IS '代表専用メモ（admin権限のみアクセス可）';
COMMENT ON FUNCTION upsert_admin_notes IS '代表メモをUPSERT（報酬は暗号化）';
COMMENT ON FUNCTION get_admin_notes IS '代表メモを取得（報酬は復号）';

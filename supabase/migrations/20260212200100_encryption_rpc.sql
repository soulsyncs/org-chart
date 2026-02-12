-- =============================================================
-- 暗号化RPC関数（機密データの安全な保存）
-- 暗号化キーはDB内に保管し、外部に露出しない
-- =============================================================

-- 暗号化キー保管テーブル（anonロールからアクセス不可）
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
-- ポリシーなし = anonロールは一切アクセス不可

-- 暗号化キーを生成・保存（gen_random_uuid x2 で十分なエントロピー）
INSERT INTO app_config (key, value)
VALUES ('encryption_key', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
ON CONFLICT (key) DO NOTHING;

-- =============================================================
-- 機密データUPSERT RPC関数
-- SECURITY DEFINER: 関数オーナー権限で実行（RLSバイパス）
-- =============================================================
CREATE OR REPLACE FUNCTION upsert_sensitive_data(
    p_employee_id UUID,
    p_bank_account TEXT DEFAULT NULL,
    p_personal_contact TEXT DEFAULT NULL,
    p_emergency_contact TEXT DEFAULT NULL,
    p_dependents TEXT DEFAULT NULL,
    p_submitted_by TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    enc_key TEXT;
    result_id UUID;
BEGIN
    -- 暗号化キーをapp_configから取得
    SELECT value INTO enc_key FROM app_config WHERE key = 'encryption_key';
    IF enc_key IS NULL THEN
        RAISE EXCEPTION 'Encryption key not configured';
    END IF;

    INSERT INTO employee_sensitive_data (
        employee_id,
        organization_id,
        bank_account_encrypted,
        personal_contact_encrypted,
        emergency_contact_encrypted,
        dependents_encrypted,
        submitted_by,
        submitted_at
    ) VALUES (
        p_employee_id,
        '5f98365f-e7c5-4f48-9918-7fe9aabae5df'::uuid,
        CASE WHEN p_bank_account IS NOT NULL
             THEN pgp_sym_encrypt(p_bank_account, enc_key)
        END,
        CASE WHEN p_personal_contact IS NOT NULL
             THEN pgp_sym_encrypt(p_personal_contact, enc_key)
        END,
        CASE WHEN p_emergency_contact IS NOT NULL
             THEN pgp_sym_encrypt(p_emergency_contact, enc_key)
        END,
        CASE WHEN p_dependents IS NOT NULL
             THEN pgp_sym_encrypt(p_dependents, enc_key)
        END,
        p_submitted_by,
        now()
    )
    ON CONFLICT (employee_id) DO UPDATE SET
        bank_account_encrypted = CASE
            WHEN p_bank_account IS NOT NULL
            THEN pgp_sym_encrypt(p_bank_account, enc_key)
            ELSE employee_sensitive_data.bank_account_encrypted
        END,
        personal_contact_encrypted = CASE
            WHEN p_personal_contact IS NOT NULL
            THEN pgp_sym_encrypt(p_personal_contact, enc_key)
            ELSE employee_sensitive_data.personal_contact_encrypted
        END,
        emergency_contact_encrypted = CASE
            WHEN p_emergency_contact IS NOT NULL
            THEN pgp_sym_encrypt(p_emergency_contact, enc_key)
            ELSE employee_sensitive_data.emergency_contact_encrypted
        END,
        dependents_encrypted = CASE
            WHEN p_dependents IS NOT NULL
            THEN pgp_sym_encrypt(p_dependents, enc_key)
            ELSE employee_sensitive_data.dependents_encrypted
        END,
        submitted_by = COALESCE(p_submitted_by, employee_sensitive_data.submitted_by),
        updated_at = now()
    RETURNING id INTO result_id;

    RETURN jsonb_build_object('success', true, 'id', result_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- anonロールにRPC実行権限を付与
GRANT EXECUTE ON FUNCTION upsert_sensitive_data TO anon;
GRANT EXECUTE ON FUNCTION upsert_sensitive_data TO authenticated;

COMMENT ON FUNCTION upsert_sensitive_data IS '機密データを暗号化してUPSERT。暗号化キーはDB内部で管理。';

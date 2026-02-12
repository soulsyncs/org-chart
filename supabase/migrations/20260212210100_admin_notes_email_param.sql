-- =============================================================
-- admin_notes RPC関数をメールパラメータ方式に修正
-- 理由: anon keyではcurrent_settingが設定されないため
-- 既存アーキテクチャ（フロントOAuth + anon key DB操作）に合わせる
-- =============================================================

-- 旧シグネチャの関数をDROP（パラメータ変更のため）
DROP FUNCTION IF EXISTS upsert_admin_notes(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_admin_notes(UUID);

-- is_org_admin をメールパラメータ版に変更（引数なし→引数あり = 別シグネチャなのでDROP不要）
CREATE OR REPLACE FUNCTION is_org_admin(p_email TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_chart_editors
        WHERE email = coalesce(
            p_email,
            current_setting('app.current_user_email', true),
            ''
        )
        AND role = 'admin'
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- upsert_admin_notes にメールパラメータ追加
CREATE OR REPLACE FUNCTION upsert_admin_notes(
    p_employee_id UUID,
    p_admin_email TEXT,
    p_compensation TEXT DEFAULT NULL,
    p_memo TEXT DEFAULT NULL,
    p_strength TEXT DEFAULT NULL,
    p_weakness TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    enc_key TEXT;
BEGIN
    -- admin権限チェック（メールをorg_chart_editorsで検証）
    IF NOT is_org_admin(p_admin_email) THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

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
        p_memo, p_strength, p_weakness, p_admin_email
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
        updated_by = p_admin_email,
        updated_at = now();

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_admin_notes にメールパラメータ追加
CREATE OR REPLACE FUNCTION get_admin_notes(
    p_employee_id UUID,
    p_admin_email TEXT
) RETURNS JSONB AS $$
DECLARE
    enc_key TEXT;
    rec RECORD;
BEGIN
    IF NOT is_org_admin(p_admin_email) THEN
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

-- 権限再付与
GRANT EXECUTE ON FUNCTION is_org_admin(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION is_org_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_admin_notes TO anon;
GRANT EXECUTE ON FUNCTION upsert_admin_notes TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_notes TO anon;
GRANT EXECUTE ON FUNCTION get_admin_notes TO authenticated;

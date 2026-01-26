-- rolesテーブルにdisplay_order列を追加
ALTER TABLE roles ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- 表示順序を設定（Level 5内での順序）
-- 取締役を最初に（1）、管理部マネージャーを2番目、管理部スタッフを3番目
UPDATE roles SET display_order = 1 WHERE id = 'role_director';      -- 取締役
UPDATE roles SET display_order = 2 WHERE id = 'role_admin_mgr';     -- 管理部マネージャー
UPDATE roles SET display_order = 3 WHERE id = 'role_admin_staff';   -- 管理部スタッフ

-- 他の役職も設定
UPDATE roles SET display_order = 1 WHERE id = 'role_ceo';           -- 代表取締役
UPDATE roles SET display_order = 2 WHERE id = 'role_cfo';           -- CFO
UPDATE roles SET display_order = 1 WHERE id = 'role_dept_head';     -- 部長
UPDATE roles SET display_order = 1 WHERE id = 'role_section_head';  -- 課長
UPDATE roles SET display_order = 2 WHERE id = 'role_leader';        -- リーダー
UPDATE roles SET display_order = 1 WHERE id = 'role_employee';      -- 社員
UPDATE roles SET display_order = 1 WHERE id = 'role_contractor';    -- 業務委託

SELECT id, name, level, display_order FROM roles ORDER BY level DESC, display_order ASC;

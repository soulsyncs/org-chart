-- roles テーブルのRLSポリシー追加
DROP POLICY IF EXISTS roles_select_policy ON roles;
CREATE POLICY roles_select_policy ON roles FOR SELECT USING (true);

DROP POLICY IF EXISTS roles_update_policy ON roles;
CREATE POLICY roles_update_policy ON roles FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS roles_insert_policy ON roles;
CREATE POLICY roles_insert_policy ON roles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS roles_delete_policy ON roles;
CREATE POLICY roles_delete_policy ON roles FOR DELETE USING (true);

-- COOを削除
DELETE FROM roles WHERE id = 'role_coo';

-- 取締役をLevel 5に変更
UPDATE roles SET level = 5 WHERE id = 'role_director';

SELECT id, name, level FROM roles ORDER BY level DESC;

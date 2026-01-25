-- 開発用: 匿名ユーザーにも編集権限を付与
-- 本番デプロイ前に削除すること！

-- employees テーブル
DROP POLICY IF EXISTS employees_update_policy ON employees;
CREATE POLICY employees_update_policy ON employees
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS employees_insert_policy ON employees;
CREATE POLICY employees_insert_policy ON employees
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS employees_delete_policy ON employees;
CREATE POLICY employees_delete_policy ON employees
    FOR DELETE USING (true);

-- departments テーブル
DROP POLICY IF EXISTS departments_update_policy ON departments;
CREATE POLICY departments_update_policy ON departments
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS departments_insert_policy ON departments;
CREATE POLICY departments_insert_policy ON departments
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS departments_delete_policy ON departments;
CREATE POLICY departments_delete_policy ON departments
    FOR DELETE USING (true);

-- change_history テーブル
DROP POLICY IF EXISTS change_history_insert_policy ON change_history;
CREATE POLICY change_history_insert_policy ON change_history
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS change_history_select_policy ON change_history;
CREATE POLICY change_history_select_policy ON change_history
    FOR SELECT USING (true);

SELECT 'Anonymous edit enabled for development' AS result;

/**
 * org-chart 状態管理モジュール
 * Phase 7: コードモジュール分割
 *
 * グローバル状態を一元管理し、各モジュール間で共有する
 *
 * 作成日: 2026-01-25
 */

// ============================================
// グローバル状態
// ============================================

// データ
let departments = [];
let employees = [];
let changeHistory = [];
let roles = [];

// UI状態
let currentViewMode = 'card'; // 'card', 'tree', 'list'
let viewMode = 'edit'; // 'edit' or 'view'

// スキーマ拡張フラグ
let hasChatworkAccountIdColumn = false;

// 兼務部署カウンター
let additionalDeptCounter = 0;

// 詳細表示中の社員ID
let currentDetailEmployeeId = null;

// ============================================
// 状態アクセサ
// ============================================

/**
 * 部署一覧を取得
 * @returns {Array}
 */
function getDepartments() {
    return departments;
}

/**
 * 部署一覧を設定
 * @param {Array} data
 */
function setDepartments(data) {
    departments = data || [];
}

/**
 * 社員一覧を取得
 * @returns {Array}
 */
function getEmployees() {
    return employees;
}

/**
 * 社員一覧を設定
 * @param {Array} data
 */
function setEmployees(data) {
    employees = data || [];
}

/**
 * 役職一覧を取得
 * @returns {Array}
 */
function getRoles() {
    return roles;
}

/**
 * 役職一覧を設定
 * @param {Array} data
 */
function setRoles(data) {
    roles = data || [];
}

/**
 * 変更履歴を取得
 * @returns {Array}
 */
function getChangeHistory() {
    return changeHistory;
}

/**
 * 変更履歴を設定
 * @param {Array} data
 */
function setChangeHistory(data) {
    changeHistory = data || [];
}

/**
 * 現在の表示モードを取得
 * @returns {string}
 */
function getCurrentViewMode() {
    return currentViewMode;
}

/**
 * 現在の表示モードを設定
 * @param {string} mode
 */
function setCurrentViewMode(mode) {
    currentViewMode = mode;
}

/**
 * 編集/閲覧モードを取得
 * @returns {string}
 */
function getViewMode() {
    return viewMode;
}

/**
 * 編集/閲覧モードを設定
 * @param {string} mode
 */
function setViewModeState(mode) {
    viewMode = mode;
}

/**
 * ChatWorkカラム存在フラグを取得
 * @returns {boolean}
 */
function getHasChatworkColumn() {
    return hasChatworkAccountIdColumn;
}

/**
 * ChatWorkカラム存在フラグを設定
 * @param {boolean} value
 */
function setHasChatworkColumn(value) {
    hasChatworkAccountIdColumn = value;
}

/**
 * 兼務部署カウンターをインクリメント
 * @returns {number} - 新しいカウンター値
 */
function incrementAdditionalDeptCounter() {
    return ++additionalDeptCounter;
}

/**
 * 詳細表示中の社員IDを取得
 * @returns {string|null}
 */
function getCurrentDetailEmployeeId() {
    return currentDetailEmployeeId;
}

/**
 * 詳細表示中の社員IDを設定
 * @param {string|null} id
 */
function setCurrentDetailEmployeeId(id) {
    currentDetailEmployeeId = id;
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * 部署をIDで検索
 * @param {string} id
 * @returns {Object|undefined}
 */
function findDepartmentById(id) {
    return departments.find(d => d.id === id);
}

/**
 * 社員をIDで検索
 * @param {string} id
 * @returns {Object|undefined}
 */
function findEmployeeById(id) {
    return employees.find(e => e.id === id);
}

/**
 * 役職をIDで検索
 * @param {string} id
 * @returns {Object|undefined}
 */
function findRoleById(id) {
    return roles.find(r => r.id === id);
}

/**
 * 部署に所属する社員を取得
 * @param {string} deptId
 * @returns {Array}
 */
function getEmployeesByDepartment(deptId) {
    return employees.filter(e => {
        if (e.department_id === deptId) return true;
        try {
            const depts = JSON.parse(e.departments || '[]');
            return depts.some(d => d.department_id === deptId);
        } catch (err) {
            return false;
        }
    });
}

/**
 * 子部署を取得
 * @param {string} parentId
 * @returns {Array}
 */
function getChildDepartments(parentId) {
    return departments.filter(d => d.parent_id === parentId);
}

/**
 * トップレベル部署を取得
 * @returns {Array}
 */
function getTopLevelDepartments() {
    return departments.filter(d => !d.parent_id);
}

// ============================================
// グローバルエクスポート
// ============================================

// 直接アクセス用（後方互換性）
window.departments = departments;
window.employees = employees;
window.changeHistory = changeHistory;
window.roles = roles;
window.currentViewMode = currentViewMode;
window.viewMode = viewMode;
window.hasChatworkAccountIdColumn = hasChatworkAccountIdColumn;
window.additionalDeptCounter = additionalDeptCounter;
window.currentDetailEmployeeId = currentDetailEmployeeId;

// アクセサ関数
window.getDepartments = getDepartments;
window.setDepartments = setDepartments;
window.getEmployees = getEmployees;
window.setEmployees = setEmployees;
window.getRoles = getRoles;
window.setRoles = setRoles;
window.getChangeHistory = getChangeHistory;
window.setChangeHistory = setChangeHistory;
window.getCurrentViewMode = getCurrentViewMode;
window.setCurrentViewMode = setCurrentViewMode;
window.getViewMode = getViewMode;
window.setViewModeState = setViewModeState;
window.getHasChatworkColumn = getHasChatworkColumn;
window.setHasChatworkColumn = setHasChatworkColumn;
window.incrementAdditionalDeptCounter = incrementAdditionalDeptCounter;
window.getCurrentDetailEmployeeId = getCurrentDetailEmployeeId;
window.setCurrentDetailEmployeeId = setCurrentDetailEmployeeId;

// ヘルパー関数
window.findDepartmentById = findDepartmentById;
window.findEmployeeById = findEmployeeById;
window.findRoleById = findRoleById;
window.getEmployeesByDepartment = getEmployeesByDepartment;
window.getChildDepartments = getChildDepartments;
window.getTopLevelDepartments = getTopLevelDepartments;

console.log('✅ state.js loaded');

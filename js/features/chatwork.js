/**
 * org-chart Chatwork連携モジュール
 * Phase 7: コードモジュール分割
 *
 * Chatwork通知機能を提供
 *
 * 作成日: 2026-01-25
 */

// ============================================
// 設定管理
// ============================================

/**
 * Chatwork設定の表示切替
 */
function toggleChatworkSettings() {
    const enabled = document.getElementById('chatworkEnabled').checked;
    const fields = document.getElementById('chatworkSettingsFields');
    fields.style.display = enabled ? 'block' : 'none';
}

/**
 * Chatwork設定を保存
 */
function saveChatworkSettings() {
    const enabled = document.getElementById('chatworkEnabled').checked;
    const apiToken = document.getElementById('chatworkApiToken').value;
    const roomId = document.getElementById('chatworkRoomId').value;

    if (enabled && (!apiToken || !roomId)) {
        showNotification('APIトークンとルームIDを入力してください', 'error');
        return;
    }

    // ローカルストレージに保存
    localStorage.setItem('chatworkEnabled', enabled);
    if (enabled) {
        localStorage.setItem('chatworkApiToken', apiToken);
        localStorage.setItem('chatworkRoomId', roomId);
    }

    closeModal('chatworkSettingsModal');
    showNotification('Chatwork設定を保存しました', 'success');
}

/**
 * Chatwork設定を読み込む
 */
function loadChatworkSettings() {
    const enabled = localStorage.getItem('chatworkEnabled') === 'true';
    const apiToken = localStorage.getItem('chatworkApiToken') || '';
    const roomId = localStorage.getItem('chatworkRoomId') || '';

    const enabledEl = document.getElementById('chatworkEnabled');
    const apiTokenEl = document.getElementById('chatworkApiToken');
    const roomIdEl = document.getElementById('chatworkRoomId');
    const fieldsEl = document.getElementById('chatworkSettingsFields');

    if (enabledEl) enabledEl.checked = enabled;
    if (apiTokenEl) apiTokenEl.value = apiToken;
    if (roomIdEl) roomIdEl.value = roomId;
    if (fieldsEl && enabled) fieldsEl.style.display = 'block';
}

/**
 * Chatwork通知が有効かチェック
 * @returns {boolean}
 */
function isChatworkEnabled() {
    return localStorage.getItem('chatworkEnabled') === 'true';
}

// ============================================
// 通知送信
// ============================================

/**
 * Chatwork通知を送信
 * @param {string} message - メッセージ
 * @returns {Promise<boolean>}
 */
async function sendChatworkNotification(message) {
    if (!isChatworkEnabled()) return false;

    const apiToken = localStorage.getItem('chatworkApiToken');
    const roomId = localStorage.getItem('chatworkRoomId');

    if (!apiToken || !roomId) return false;

    try {
        // 注意：CORSの問題により、直接ブラウザから呼び出すことはできません
        // 実際の運用では、バックエンドサーバーを経由する必要があります
        const response = await fetch(`https://api.chatwork.com/v2/rooms/${roomId}/messages`, {
            method: 'POST',
            headers: {
                'X-ChatWorkToken': apiToken,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `body=${encodeURIComponent(message)}`
        });

        if (response.ok) {
            if (typeof debugLog === 'function') debugLog('Chatwork通知送信成功');
            return true;
        }
    } catch (error) {
        console.error('Chatwork通知エラー:', error);
        // エラーが発生してもメイン機能には影響を与えない
    }

    return false;
}

// ============================================
// 通知テンプレート
// ============================================

/**
 * 社員追加通知
 * @param {Object} employee - 社員オブジェクト
 */
function notifyEmployeeAdded(employee) {
    const dept = departments.find(d => d.id === employee.department_id);
    const deptName = dept ? dept.name : '未所属';

    const message = `[info][title]新しい社員が追加されました[/title]
氏名: ${employee.name}
部署: ${deptName}
役職: ${employee.position || '未設定'}
雇用形態: ${employee.employment_type}
登録日時: ${new Date().toLocaleString('ja-JP')}[/info]`;

    sendChatworkNotification(message);
}

/**
 * 社員異動通知
 * @param {Object} employee - 社員オブジェクト
 * @param {string} fromDept - 異動元部署名
 * @param {string} toDept - 異動先部署名
 */
function notifyEmployeeTransferred(employee, fromDept, toDept) {
    const message = `[info][title]社員の異動がありました[/title]
氏名: ${employee.name}
異動元: ${fromDept}
異動先: ${toDept}
異動日時: ${new Date().toLocaleString('ja-JP')}[/info]`;

    sendChatworkNotification(message);
}

/**
 * 社員削除通知
 * @param {Object} employee - 社員オブジェクト
 */
function notifyEmployeeDeleted(employee) {
    const dept = departments.find(d => d.id === employee.department_id);
    const deptName = dept ? dept.name : '未所属';

    const message = `[info][title]社員が削除されました[/title]
氏名: ${employee.name}
部署: ${deptName}
削除日時: ${new Date().toLocaleString('ja-JP')}[/info]`;

    sendChatworkNotification(message);
}

/**
 * 部署追加通知
 * @param {Object} department - 部署オブジェクト
 */
function notifyDepartmentAdded(department) {
    const parent = departments.find(d => d.id === department.parent_id);
    const parentName = parent ? parent.name : 'なし';

    const message = `[info][title]新しい部署が追加されました[/title]
部署名: ${department.name}
親部署: ${parentName}
登録日時: ${new Date().toLocaleString('ja-JP')}[/info]`;

    sendChatworkNotification(message);
}

// ============================================
// グローバルエクスポート
// ============================================

window.toggleChatworkSettings = toggleChatworkSettings;
window.saveChatworkSettings = saveChatworkSettings;
window.loadChatworkSettings = loadChatworkSettings;
window.isChatworkEnabled = isChatworkEnabled;
window.sendChatworkNotification = sendChatworkNotification;
window.notifyEmployeeAdded = notifyEmployeeAdded;
window.notifyEmployeeTransferred = notifyEmployeeTransferred;
window.notifyEmployeeDeleted = notifyEmployeeDeleted;
window.notifyDepartmentAdded = notifyDepartmentAdded;

if (typeof logModuleLoaded === 'function') {
    logModuleLoaded('features/chatwork.js');
}

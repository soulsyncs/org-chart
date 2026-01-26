/**
 * org-chart 監査ログモジュール
 * Phase 5: 監査・履歴管理
 *
 * 機能:
 * - 全操作の監査ログ記録
 * - 監査ログの閲覧・検索
 * - ロールバック機能
 *
 * 作成日: 2026-01-25
 */

// ============================================
// 監査ログ設定
// ============================================

const AUDIT_CONFIG = {
    // ログ取得件数
    PAGE_SIZE: 50,

    // IPアドレス取得API
    IP_API_URL: 'https://api.ipify.org?format=json',

    // キャッシュ有効期間（ミリ秒）
    IP_CACHE_TTL: 5 * 60 * 1000  // 5分
};

// キャッシュ
let cachedIpAddress = null;
let ipCacheTimestamp = 0;

// ============================================
// ログ記録
// ============================================

/**
 * 監査ログを記録
 * @param {Object} params - ログパラメータ
 * @param {string} params.action - 操作種別（create/read/update/delete/rollback/login/logout）
 * @param {string} params.targetType - 対象種別（employee/department/role/editor/system）
 * @param {string} [params.targetId] - 対象ID
 * @param {string} [params.targetName] - 対象名
 * @param {Object} [params.beforeData] - 変更前データ
 * @param {Object} [params.afterData] - 変更後データ
 * @param {string} [params.changeSummary] - 変更概要
 * @param {Object} [params.metadata] - 追加メタデータ
 * @returns {Promise<Object|null>} - 記録されたログまたはnull
 */
async function logAudit({
    action,
    targetType,
    targetId = null,
    targetName = null,
    beforeData = null,
    afterData = null,
    changeSummary = null,
    metadata = null
}) {
    // フィーチャーフラグチェック
    if (!FEATURE_FLAGS.ENABLE_AUDIT_LOG) {
        debugAuditLog('Audit log disabled by feature flag');
        return null;
    }

    // 認証チェック
    const user = getCurrentUser ? getCurrentUser() : null;
    if (!user) {
        debugAuditLog('No authenticated user, skipping audit log');
        return null;
    }

    try {
        // IPアドレスを取得（キャッシュ利用）
        const ipAddress = await getIpAddress();

        // ログデータを構築
        const logData = {
            organization_id: ORG_CONFIG.ORGANIZATION_ID,
            user_email: user.email,
            user_name: user.user_metadata?.full_name || user.email,
            action: action,
            target_type: targetType,
            target_id: targetId,
            target_name: targetName,
            before_data: beforeData ? JSON.stringify(beforeData) : null,
            after_data: afterData ? JSON.stringify(afterData) : null,
            change_summary: changeSummary,
            ip_address: ipAddress,
            user_agent: navigator.userAgent,
            session_id: getSessionId(),
            metadata: metadata ? JSON.stringify(metadata) : null
        };

        // 認証トークンを取得
        const token = await getAuthToken();
        if (!token) {
            console.warn('No auth token available for audit log');
            return null;
        }

        // Supabaseに記録
        const response = await fetch(`${SUPABASE_REST_URL}/org_chart_audit_logs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(logData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Audit log error:', response.status, errorText);
            return null;
        }

        const result = await response.json();
        debugAuditLog('Audit log recorded:', action, targetType, targetName);
        return result[0] || null;

    } catch (error) {
        console.error('Audit log exception:', error);
        return null;
    }
}

/**
 * 変更概要を自動生成
 * @param {string} action - 操作種別
 * @param {string} targetType - 対象種別
 * @param {string} targetName - 対象名
 * @param {Object} beforeData - 変更前データ
 * @param {Object} afterData - 変更後データ
 * @returns {string} - 変更概要
 */
function generateChangeSummary(action, targetType, targetName, beforeData, afterData) {
    const targetTypeLabels = {
        employee: '社員',
        department: '部署',
        role: '役職',
        editor: '編集者',
        system: 'システム'
    };

    const actionLabels = {
        create: '追加',
        read: '閲覧',
        update: '更新',
        delete: '削除',
        rollback: 'ロールバック',
        login: 'ログイン',
        logout: 'ログアウト'
    };

    const typeLabel = targetTypeLabels[targetType] || targetType;
    const actionLabel = actionLabels[action] || action;

    let summary = `${typeLabel}「${targetName || '(名前なし)'}」を${actionLabel}`;

    // 更新の場合は変更内容を追加
    if (action === 'update' && beforeData && afterData) {
        const changes = getChangedFields(beforeData, afterData);
        if (changes.length > 0) {
            summary += `（${changes.join('、')}）`;
        }
    }

    return summary;
}

/**
 * 変更されたフィールドを取得
 * @param {Object} before - 変更前データ
 * @param {Object} after - 変更後データ
 * @returns {Array<string>} - 変更されたフィールド名の配列
 */
function getChangedFields(before, after) {
    const changes = [];
    const fieldLabels = {
        name: '名前',
        email: 'メール',
        department_id: '部署',
        position: '役職',
        role_id: '役職ID',
        employment_type: '雇用形態',
        chatwork_account_id: 'ChatWork ID',
        departments: '兼務先',
        parent_id: '親部署',
        level: 'レベル'
    };

    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

    for (const key of allKeys) {
        // システムフィールドはスキップ
        if (['id', 'created_at', 'updated_at', 'department_order'].includes(key)) continue;

        const beforeVal = before?.[key];
        const afterVal = after?.[key];

        if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
            const label = fieldLabels[key] || key;
            changes.push(label);
        }
    }

    return changes;
}

// ============================================
// ログ取得・検索
// ============================================

/**
 * 監査ログを取得
 * @param {Object} options - 取得オプション
 * @param {number} [options.offset=0] - オフセット
 * @param {number} [options.limit=50] - 取得件数
 * @param {string} [options.action] - 操作種別フィルタ
 * @param {string} [options.targetType] - 対象種別フィルタ
 * @param {string} [options.userEmail] - ユーザーメールフィルタ
 * @param {string} [options.startDate] - 開始日フィルタ
 * @param {string} [options.endDate] - 終了日フィルタ
 * @returns {Promise<Array>} - 監査ログ配列
 */
async function getAuditLogs({
    offset = 0,
    limit = AUDIT_CONFIG.PAGE_SIZE,
    action = null,
    targetType = null,
    userEmail = null,
    startDate = null,
    endDate = null
} = {}) {
    try {
        const token = await getAuthToken();
        if (!token) {
            console.warn('No auth token for audit log retrieval');
            return [];
        }

        // クエリパラメータを構築
        let queryParams = [
            `organization_id=eq.${ORG_CONFIG.ORGANIZATION_ID}`,
            `order=created_at.desc`,
            `offset=${offset}`,
            `limit=${limit}`
        ];

        if (action) {
            queryParams.push(`action=eq.${action}`);
        }
        if (targetType) {
            queryParams.push(`target_type=eq.${targetType}`);
        }
        if (userEmail) {
            queryParams.push(`user_email=eq.${encodeURIComponent(userEmail)}`);
        }
        if (startDate) {
            queryParams.push(`created_at=gte.${startDate}`);
        }
        if (endDate) {
            queryParams.push(`created_at=lte.${endDate}`);
        }

        const url = `${SUPABASE_REST_URL}/org_chart_audit_logs?${queryParams.join('&')}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch audit logs:', response.status);
            return [];
        }

        return await response.json();

    } catch (error) {
        console.error('Get audit logs error:', error);
        return [];
    }
}

/**
 * 監査ログの総件数を取得
 * @param {Object} filters - フィルタ条件
 * @returns {Promise<number>} - 総件数
 */
async function getAuditLogsCount(filters = {}) {
    try {
        const token = await getAuthToken();
        if (!token) return 0;

        let queryParams = [
            `organization_id=eq.${ORG_CONFIG.ORGANIZATION_ID}`,
            'select=count'
        ];

        if (filters.action) {
            queryParams.push(`action=eq.${filters.action}`);
        }
        if (filters.targetType) {
            queryParams.push(`target_type=eq.${filters.targetType}`);
        }

        const url = `${SUPABASE_REST_URL}/org_chart_audit_logs?${queryParams.join('&')}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY,
                'Prefer': 'count=exact'
            }
        });

        if (!response.ok) return 0;

        const countHeader = response.headers.get('content-range');
        if (countHeader) {
            const match = countHeader.match(/\/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }

        return 0;

    } catch (error) {
        console.error('Get audit logs count error:', error);
        return 0;
    }
}

// ============================================
// ロールバック機能
// ============================================

/**
 * 監査ログからロールバック
 * @param {string} auditLogId - 監査ログID
 * @returns {Promise<boolean>} - 成功したかどうか
 */
async function rollbackFromAuditLog(auditLogId) {
    if (!FEATURE_FLAGS.ENABLE_ROLLBACK) {
        showNotification('ロールバック機能は無効です', 'warning');
        return false;
    }

    try {
        const token = await getAuthToken();
        if (!token) {
            showNotification('認証が必要です', 'error');
            return false;
        }

        // 対象の監査ログを取得
        const response = await fetch(
            `${SUPABASE_REST_URL}/org_chart_audit_logs?id=eq.${auditLogId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!response.ok) {
            showNotification('監査ログの取得に失敗しました', 'error');
            return false;
        }

        const logs = await response.json();
        if (logs.length === 0) {
            showNotification('監査ログが見つかりません', 'error');
            return false;
        }

        const log = logs[0];

        // ロールバック可能かチェック
        if (!['create', 'update', 'delete'].includes(log.action)) {
            showNotification('この操作はロールバックできません', 'warning');
            return false;
        }

        if (!log.before_data && log.action !== 'create') {
            showNotification('変更前データがないためロールバックできません', 'warning');
            return false;
        }

        // ロールバック実行
        let success = false;
        const beforeData = log.before_data ? JSON.parse(log.before_data) : null;
        const afterData = log.after_data ? JSON.parse(log.after_data) : null;

        switch (log.target_type) {
            case 'employee':
                success = await rollbackEmployee(log.action, log.target_id, beforeData, afterData);
                break;
            case 'department':
                success = await rollbackDepartment(log.action, log.target_id, beforeData, afterData);
                break;
            default:
                showNotification(`${log.target_type}のロールバックは未対応です`, 'warning');
                return false;
        }

        if (success) {
            // ロールバック自体も監査ログに記録
            await logAudit({
                action: 'rollback',
                targetType: log.target_type,
                targetId: log.target_id,
                targetName: log.target_name,
                beforeData: afterData,
                afterData: beforeData,
                changeSummary: `監査ログ ${auditLogId} からロールバック`,
                metadata: { original_audit_log_id: auditLogId }
            });

            showNotification('ロールバックが完了しました', 'success');
            await loadData();
        }

        return success;

    } catch (error) {
        console.error('Rollback error:', error);
        showNotification('ロールバック中にエラーが発生しました', 'error');
        return false;
    }
}

/**
 * 社員のロールバック
 */
async function rollbackEmployee(action, targetId, beforeData, afterData) {
    const token = await getAuthToken();

    switch (action) {
        case 'create':
            // 作成のロールバック = 削除
            const deleteResponse = await fetch(
                `${SUPABASE_REST_URL}/employees?id=eq.${targetId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': SUPABASE_ANON_KEY
                    }
                }
            );
            return deleteResponse.ok;

        case 'update':
            // 更新のロールバック = 変更前の値に戻す
            const updateResponse = await fetch(
                `${SUPABASE_REST_URL}/employees?id=eq.${targetId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(beforeData)
                }
            );
            return updateResponse.ok;

        case 'delete':
            // 削除のロールバック = 再作成
            const insertResponse = await fetch(
                `${SUPABASE_REST_URL}/employees`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(beforeData)
                }
            );
            return insertResponse.ok;

        default:
            return false;
    }
}

/**
 * 部署のロールバック
 */
async function rollbackDepartment(action, targetId, beforeData, afterData) {
    const token = await getAuthToken();

    switch (action) {
        case 'create':
            const deleteResponse = await fetch(
                `${SUPABASE_REST_URL}/departments?id=eq.${targetId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': SUPABASE_ANON_KEY
                    }
                }
            );
            return deleteResponse.ok;

        case 'update':
            const updateResponse = await fetch(
                `${SUPABASE_REST_URL}/departments?id=eq.${targetId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(beforeData)
                }
            );
            return updateResponse.ok;

        case 'delete':
            const insertResponse = await fetch(
                `${SUPABASE_REST_URL}/departments`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(beforeData)
                }
            );
            return insertResponse.ok;

        default:
            return false;
    }
}

// ============================================
// 監査ログ閲覧UI
// ============================================

/**
 * 監査ログモーダルを表示
 */
async function showAuditLogModal() {
    try {
        const modal = document.getElementById('auditLogModal');
        if (!modal) {
            console.error('Audit log modal not found');
            showNotification('監査ログモーダルが見つかりません', 'error');
            return;
        }

        // モーダルを先に開く
        openModal('auditLogModal');

        // その後でコンテンツをロード
        await loadAuditLogPage(0);
    } catch (error) {
        console.error('showAuditLogModal error:', error);
        showNotification('監査ログの表示中にエラーが発生しました', 'error');
    }
}

/**
 * 監査ログページをロード
 * @param {number} page - ページ番号（0始まり）
 */
async function loadAuditLogPage(page = 0) {
    const container = document.getElementById('auditLogContent');
    if (!container) return;

    try {
        // ローディング表示
        container.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';

        // フィルタ値を取得
        const filterAction = document.getElementById('auditFilterAction')?.value || '';
        const filterType = document.getElementById('auditFilterType')?.value || '';

        // ログを取得
        const logs = await getAuditLogs({
            offset: page * AUDIT_CONFIG.PAGE_SIZE,
            limit: AUDIT_CONFIG.PAGE_SIZE,
            action: filterAction || null,
            targetType: filterType || null
        });

        if (!logs || logs.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">監査ログがありません<br><small class="text-xs">（ログインすると表示されます）</small></div>';
            return;
        }

        // ログを表示
        container.innerHTML = logs.map(log => createAuditLogCard(log)).join('');

        // ページネーション更新
        updateAuditLogPagination(page, logs.length);
    } catch (error) {
        console.error('loadAuditLogPage error:', error);
        container.innerHTML = '<div class="text-center py-8 text-red-500">監査ログの読み込みに失敗しました</div>';
    }
}

/**
 * 監査ログカードを生成
 * @param {Object} log - 監査ログ
 * @returns {string} - HTML文字列
 */
function createAuditLogCard(log) {
    const actionColors = {
        create: 'bg-green-100 text-green-800',
        update: 'bg-blue-100 text-blue-800',
        delete: 'bg-red-100 text-red-800',
        rollback: 'bg-purple-100 text-purple-800',
        login: 'bg-gray-100 text-gray-800',
        logout: 'bg-gray-100 text-gray-800'
    };

    const actionLabels = {
        create: '作成',
        update: '更新',
        delete: '削除',
        rollback: 'ロールバック',
        login: 'ログイン',
        logout: 'ログアウト'
    };

    const targetTypeLabels = {
        employee: '社員',
        department: '部署',
        role: '役職',
        editor: '編集者',
        system: 'システム'
    };

    const color = actionColors[log.action] || 'bg-gray-100 text-gray-800';
    const actionLabel = actionLabels[log.action] || log.action;
    const typeLabel = targetTypeLabels[log.target_type] || log.target_type;
    const createdAt = new Date(log.created_at).toLocaleString('ja-JP');

    const canRollback = FEATURE_FLAGS.ENABLE_ROLLBACK &&
                        ['create', 'update', 'delete'].includes(log.action) &&
                        ['employee', 'department'].includes(log.target_type);

    return `
        <div class="audit-log-card border border-gray-200 rounded-lg p-4 mb-3 hover:shadow-md transition">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="px-2 py-0.5 text-xs rounded-full ${color}">${actionLabel}</span>
                        <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">${typeLabel}</span>
                        <span class="text-sm text-gray-500">${createdAt}</span>
                    </div>
                    <div class="text-sm font-medium text-gray-800 mb-1">
                        ${log.change_summary || `${typeLabel}「${log.target_name || ''}」を${actionLabel}`}
                    </div>
                    <div class="text-xs text-gray-500">
                        <i class="fas fa-user mr-1"></i>${log.user_name || log.user_email}
                        ${log.ip_address ? `<span class="ml-2"><i class="fas fa-globe mr-1"></i>${log.ip_address}</span>` : ''}
                    </div>
                </div>
                <div class="flex gap-2">
                    ${log.before_data || log.after_data ? `
                        <button onclick="showAuditLogDetail('${log.id}')"
                                class="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                                title="詳細を表示">
                            <i class="fas fa-eye"></i>
                        </button>
                    ` : ''}
                    ${canRollback ? `
                        <button onclick="confirmRollback('${log.id}')"
                                class="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 rounded"
                                title="ロールバック">
                            <i class="fas fa-undo"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * 監査ログの詳細を表示
 * @param {string} logId - 監査ログID
 */
async function showAuditLogDetail(logId) {
    try {
        const token = await getAuthToken();
        const response = await fetch(
            `${SUPABASE_REST_URL}/org_chart_audit_logs?id=eq.${logId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!response.ok) {
            showNotification('詳細の取得に失敗しました', 'error');
            return;
        }

        const logs = await response.json();
        if (logs.length === 0) return;

        const log = logs[0];
        const beforeData = log.before_data ? JSON.parse(log.before_data) : null;
        const afterData = log.after_data ? JSON.parse(log.after_data) : null;

        const detailHtml = `
            <div class="text-left">
                <h4 class="font-semibold mb-3">変更詳細</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h5 class="text-sm font-medium text-gray-600 mb-2">変更前</h5>
                        <pre class="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-60">${beforeData ? JSON.stringify(beforeData, null, 2) : '(なし)'}</pre>
                    </div>
                    <div>
                        <h5 class="text-sm font-medium text-gray-600 mb-2">変更後</h5>
                        <pre class="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-60">${afterData ? JSON.stringify(afterData, null, 2) : '(なし)'}</pre>
                    </div>
                </div>
                <div class="mt-4 text-xs text-gray-500">
                    <p>ログID: ${log.id}</p>
                    <p>ユーザーエージェント: ${log.user_agent || '(不明)'}</p>
                </div>
            </div>
        `;

        document.getElementById('confirmContent').innerHTML = detailHtml;
        document.getElementById('confirmActions').innerHTML = `
            <button onclick="closeModal('confirmModal')" class="btn bg-gray-200 hover:bg-gray-300 text-gray-800">
                閉じる
            </button>
        `;
        openModal('confirmModal');

    } catch (error) {
        console.error('Show audit log detail error:', error);
        showNotification('エラーが発生しました', 'error');
    }
}

/**
 * ロールバック確認
 * @param {string} logId - 監査ログID
 */
function confirmRollback(logId) {
    document.getElementById('confirmContent').innerHTML = `
        <div class="text-center py-4">
            <div class="mb-4">
                <i class="fas fa-undo text-4xl text-purple-500"></i>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 mb-2">ロールバックの確認</h3>
            <p class="text-sm text-gray-600 mb-4">
                この操作を取り消して、変更前の状態に戻しますか？<br>
                この操作は元に戻すことができます（再度ロールバック可能）。
            </p>
        </div>
    `;

    document.getElementById('confirmActions').innerHTML = `
        <button onclick="closeModal('confirmModal')" class="btn bg-gray-200 hover:bg-gray-300 text-gray-800">
            キャンセル
        </button>
        <button onclick="closeModal('confirmModal'); rollbackFromAuditLog('${logId}')"
                class="btn bg-purple-500 hover:bg-purple-600 text-white">
            <i class="fas fa-undo mr-2"></i>ロールバック実行
        </button>
    `;

    openModal('confirmModal');
}

/**
 * ページネーション更新
 */
function updateAuditLogPagination(currentPage, itemCount) {
    const paginationContainer = document.getElementById('auditLogPagination');
    if (!paginationContainer) return;

    const hasNext = itemCount === AUDIT_CONFIG.PAGE_SIZE;
    const hasPrev = currentPage > 0;

    paginationContainer.innerHTML = `
        <div class="flex justify-center gap-2 mt-4">
            <button onclick="loadAuditLogPage(${currentPage - 1})"
                    class="px-3 py-1 text-sm rounded ${hasPrev ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}"
                    ${!hasPrev ? 'disabled' : ''}>
                <i class="fas fa-chevron-left mr-1"></i>前へ
            </button>
            <span class="px-3 py-1 text-sm">ページ ${currentPage + 1}</span>
            <button onclick="loadAuditLogPage(${currentPage + 1})"
                    class="px-3 py-1 text-sm rounded ${hasNext ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}"
                    ${!hasNext ? 'disabled' : ''}>
                次へ<i class="fas fa-chevron-right ml-1"></i>
            </button>
        </div>
    `;
}

// ============================================
// ユーティリティ
// ============================================

/**
 * IPアドレスを取得（キャッシュ付き）
 * @returns {Promise<string|null>}
 */
async function getIpAddress() {
    const now = Date.now();

    // キャッシュが有効な場合はそれを返す
    if (cachedIpAddress && (now - ipCacheTimestamp) < AUDIT_CONFIG.IP_CACHE_TTL) {
        return cachedIpAddress;
    }

    try {
        const response = await fetch(AUDIT_CONFIG.IP_API_URL);
        if (response.ok) {
            const data = await response.json();
            cachedIpAddress = data.ip;
            ipCacheTimestamp = now;
            return cachedIpAddress;
        }
    } catch (error) {
        debugAuditLog('Failed to get IP address:', error);
    }

    return null;
}

/**
 * セッションIDを取得（ブラウザセッション内で一意）
 * @returns {string}
 */
function getSessionId() {
    let sessionId = sessionStorage.getItem('audit_session_id');
    if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('audit_session_id', sessionId);
    }
    return sessionId;
}

/**
 * デバッグログ出力
 */
function debugAuditLog(...args) {
    if (FEATURE_FLAGS.DEBUG_MODE) {
        console.log('[Audit]', ...args);
    }
}

// ============================================
// 便利なラッパー関数
// ============================================

/**
 * 社員操作の監査ログを記録
 */
async function logEmployeeAction(action, employee, beforeData = null) {
    return logAudit({
        action,
        targetType: 'employee',
        targetId: employee.id,
        targetName: employee.name,
        beforeData,
        afterData: action !== 'delete' ? employee : null,
        changeSummary: generateChangeSummary(action, 'employee', employee.name, beforeData, employee)
    });
}

/**
 * 部署操作の監査ログを記録
 */
async function logDepartmentAction(action, department, beforeData = null) {
    return logAudit({
        action,
        targetType: 'department',
        targetId: department.id,
        targetName: department.name,
        beforeData,
        afterData: action !== 'delete' ? department : null,
        changeSummary: generateChangeSummary(action, 'department', department.name, beforeData, department)
    });
}

// ============================================
// グローバルエクスポート
// ============================================

window.logAudit = logAudit;
window.generateChangeSummary = generateChangeSummary;
window.getAuditLogs = getAuditLogs;
window.getAuditLogsCount = getAuditLogsCount;
window.rollbackFromAuditLog = rollbackFromAuditLog;
window.showAuditLogModal = showAuditLogModal;
window.loadAuditLogPage = loadAuditLogPage;
window.showAuditLogDetail = showAuditLogDetail;
window.confirmRollback = confirmRollback;
window.logEmployeeAction = logEmployeeAction;
window.logDepartmentAction = logDepartmentAction;

if (typeof logModuleLoaded === 'function') {
    logModuleLoaded('audit.js');
}

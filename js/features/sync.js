/**
 * org-chart ソウルくん同期モジュール
 * Phase 7: コードモジュール分割
 *
 * ソウルくんとの組織データ同期機能を提供
 *
 * 作成日: 2026-01-25
 */

// ============================================
// 定数
// ============================================

// 本番用Cloud Run URL
const SOULKUN_API_BASE = 'https://soulkun-api-tzu7ftekzq-an.a.run.app';

// ============================================
// 同期処理
// ============================================

/**
 * ソウルくんと組織データを同期
 * @returns {Promise<Object>}
 */
async function syncToSoulKun() {
    try {
        showSyncLoading('同期中...');

        // 部署の階層レベルを計算する関数
        function calculateDeptLevel(deptId, deptMap, cache = {}) {
            if (cache[deptId] !== undefined) return cache[deptId];
            const dept = deptMap[deptId];
            if (!dept || !dept.parent_id) {
                cache[deptId] = 1;
                return 1;
            }
            cache[deptId] = calculateDeptLevel(dept.parent_id, deptMap, cache) + 1;
            return cache[deptId];
        }

        // 部署マップを作成
        const deptMap = {};
        departments.forEach(d => { deptMap[d.id] = d; });

        // 部署データをAPI形式にマッピング
        const mappedDepartments = departments.map(d => ({
            id: String(d.id),
            name: d.name,
            code: d.code || String(d.id),
            parentId: d.parent_id ? String(d.parent_id) : null,
            level: calculateDeptLevel(d.id, deptMap),
            displayOrder: d.display_order || 1,
            isActive: d.is_active !== false
        }));

        // 役職データを生成（Phase 3.5対応）
        const mappedRoles = buildMappedRoles();

        // 役職名からroleIdを取得するマップ
        const roleIdMap = {};
        mappedRoles.forEach(r => {
            roleIdMap[r.name] = r.id;
        });

        // 社員データをAPI形式にマッピング
        const mappedEmployees = employees.map(e => {
            // role_idを優先使用、なければpositionから検索、最後にデフォルト
            let roleId = e.role_id;
            if (!roleId && e.position) {
                roleId = roleIdMap[e.position];
            }
            if (!roleId) {
                roleId = 'role_employee';  // デフォルト: 社員
            }

            return {
                id: String(e.id),
                name: e.name,
                email: e.email_company || e.email_gmail || `${String(e.id).replace(/-/g, '')}@example.com`,
                departmentId: String(e.department_id),
                roleId: roleId,
                isPrimary: true,
                startDate: e.hire_date || null,
                endDate: e.resignation_date || null
            };
        });

        // ソウルシンクスの組織ID
        const orgId = ORG_CONFIG.ORGANIZATION_ID;
        const response = await fetch(`${SOULKUN_API_BASE}/api/v1/organizations/${orgId}/sync-org-chart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                organization_id: orgId,
                source: 'org_chart_system',
                sync_type: 'full',
                departments: mappedDepartments,
                roles: mappedRoles,
                employees: mappedEmployees,
                options: {
                    include_inactive_users: false,
                    include_archived_departments: false,
                    dry_run: false
                }
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            const summary = result.summary || {};
            showNotification(
                `同期完了！ 部署: ${summary.departments?.added || 0}追加/${summary.departments?.updated || 0}更新, ` +
                `役職: ${summary.roles?.added || 0}追加/${summary.roles?.updated || 0}更新, ` +
                `社員: ${summary.users?.added || 0}追加/${summary.users?.updated || 0}更新`,
                'success'
            );

            localStorage.setItem('soulsyncs_last_sync', new Date().toISOString());
            updateLastSyncedText();
            return result;
        } else {
            showNotification(`同期失敗: ${result.error?.message || result.detail || '不明なエラー'}`, 'error');
            console.error('Sync failed:', result);
            return result;
        }

    } catch (error) {
        showNotification(`通信エラー: ${error.message}`, 'error');
        console.error('Sync error:', error);
        return { status: 'error', error: error.message };
    } finally {
        hideSyncLoading();
    }
}

/**
 * 役職データを構築
 * @returns {Array}
 */
function buildMappedRoles() {
    let mappedRoles;

    if (roles && roles.length > 0) {
        // rolesテーブルがある場合（推奨）
        mappedRoles = roles
            .filter(r => r.is_active !== false)
            .map(r => ({
                id: r.id,
                name: r.name,
                level: r.level,
                description: r.description || null
            }));
        console.log('Using roles from Supabase table:', mappedRoles.length, 'roles');
    } else {
        // フォールバック: 従来のposition抽出方式
        console.warn('roles table not available, falling back to position extraction');
        const positionSet = new Set();
        employees.forEach(e => {
            if (e.position) positionSet.add(e.position);
        });
        const positions = Array.from(positionSet);

        // デフォルトレベルマッピング
        const defaultLevels = {
            '代表取締役': 6, 'CEO': 6, 'CFO': 6, 'COO': 6,
            '管理部マネージャー': 5, '管理部スタッフ': 5,
            '取締役': 4, '部長': 4,
            '課長': 3, 'リーダー': 3,
            '社員': 2, 'メンバー': 2,
            '業務委託': 1
        };

        mappedRoles = positions.map((pos, idx) => ({
            id: `role_${pos.replace(/\s+/g, '_').toLowerCase()}`,
            name: pos,
            level: defaultLevels[pos] || 2,
            description: null
        }));
    }

    // 役職が空の場合はデフォルト役職を追加
    if (mappedRoles.length === 0) {
        mappedRoles.push({
            id: 'role_employee',
            name: '社員',
            level: 2,
            description: 'デフォルト役職'
        });
    }

    return mappedRoles;
}

// ============================================
// UI表示
// ============================================

/**
 * 同期中ローディング表示
 * @param {string} message
 */
function showSyncLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    const msgElement = document.getElementById('loadingMessage');
    if (overlay) overlay.style.display = 'flex';
    if (msgElement) msgElement.textContent = message;
}

/**
 * 同期中ローディング非表示
 */
function hideSyncLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

/**
 * 最終同期日時を更新
 */
function updateLastSyncedText() {
    const lastSync = localStorage.getItem('soulsyncs_last_sync');
    const textElement = document.getElementById('lastSyncedText');
    if (textElement) {
        if (lastSync) {
            const date = new Date(lastSync);
            textElement.textContent = `最終同期: ${date.toLocaleString('ja-JP')}`;
        } else {
            textElement.textContent = '未同期';
        }
    }
}

/**
 * APIトークンを保存
 */
function saveApiToken() {
    const token = document.getElementById('apiTokenInput')?.value;
    if (!token) {
        showNotification('APIトークンを入力してください', 'error');
        return;
    }

    localStorage.setItem('soulsyncs_api_token', token);
    showNotification('APIトークンを保存しました', 'success');
}

/**
 * APIトークンを取得
 * @returns {string|null}
 */
function getApiToken() {
    return localStorage.getItem('soulsyncs_api_token');
}

// ============================================
// グローバルエクスポート
// ============================================

window.SOULKUN_API_BASE = SOULKUN_API_BASE;
window.syncToSoulKun = syncToSoulKun;
window.buildMappedRoles = buildMappedRoles;
window.showSyncLoading = showSyncLoading;
window.hideSyncLoading = hideSyncLoading;
window.updateLastSyncedText = updateLastSyncedText;
window.saveApiToken = saveApiToken;
window.getApiToken = getApiToken;

console.log('✅ features/sync.js loaded');

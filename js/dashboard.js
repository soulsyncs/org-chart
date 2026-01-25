/**
 * org-chart ダッシュボードモジュール
 * Phase 6: 品質向上・UX改善
 *
 * 機能:
 * - 設定完了率ダッシュボード
 * - 未設定者一覧
 * - 同期差分プレビュー
 * - データ品質スコア
 *
 * 作成日: 2026-01-25
 */

// ============================================
// 設定完了率計算
// ============================================

/**
 * 全体の設定完了率を計算
 * @returns {Object} - 完了率情報
 */
function calculateCompletionRate() {
    if (!employees || employees.length === 0) {
        return {
            overall: 0,
            roleId: { complete: 0, total: 0, rate: 0 },
            chatworkId: { complete: 0, total: 0, rate: 0 },
            email: { complete: 0, total: 0, rate: 0 },
            phone: { complete: 0, total: 0, rate: 0 }
        };
    }

    const total = employees.length;

    // 各項目の設定済み数をカウント
    const roleIdComplete = employees.filter(e => e.role_id).length;
    const chatworkIdComplete = hasChatworkAccountIdColumn
        ? employees.filter(e => e.chatwork_account_id).length
        : total; // カラムがない場合は100%とする
    const emailComplete = employees.filter(e => e.email_company || e.email_gmail || e.email_shared).length;
    const phoneComplete = employees.filter(e => e.phone).length;

    // 各項目の完了率
    const rates = {
        roleId: {
            complete: roleIdComplete,
            total: total,
            rate: Math.round((roleIdComplete / total) * 100)
        },
        chatworkId: {
            complete: chatworkIdComplete,
            total: total,
            rate: Math.round((chatworkIdComplete / total) * 100)
        },
        email: {
            complete: emailComplete,
            total: total,
            rate: Math.round((emailComplete / total) * 100)
        },
        phone: {
            complete: phoneComplete,
            total: total,
            rate: Math.round((phoneComplete / total) * 100)
        }
    };

    // 全体の完了率（重要項目のみ）
    const importantItems = [rates.roleId.rate];
    if (hasChatworkAccountIdColumn) {
        importantItems.push(rates.chatworkId.rate);
    }
    const overall = Math.round(importantItems.reduce((a, b) => a + b, 0) / importantItems.length);

    return {
        overall,
        ...rates
    };
}

/**
 * 未設定者一覧を取得
 * @param {string} field - チェックするフィールド
 * @returns {Array} - 未設定者の配列
 */
function getIncompleteEmployees(field) {
    if (!employees) return [];

    switch (field) {
        case 'role_id':
            return employees.filter(e => !e.role_id);
        case 'chatwork_account_id':
            return hasChatworkAccountIdColumn
                ? employees.filter(e => !e.chatwork_account_id)
                : [];
        case 'email':
            return employees.filter(e => !e.email_company && !e.email_gmail && !e.email_shared);
        case 'phone':
            return employees.filter(e => !e.phone);
        default:
            return [];
    }
}

/**
 * データ品質スコアを計算
 * @returns {Object} - スコア情報
 */
function calculateDataQualityScore() {
    const completion = calculateCompletionRate();

    // 重み付けスコア
    const weights = {
        roleId: 40,
        chatworkId: hasChatworkAccountIdColumn ? 30 : 0,
        email: 20,
        phone: 10
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    const score = Math.round(
        (completion.roleId.rate * weights.roleId +
         completion.chatworkId.rate * weights.chatworkId +
         completion.email.rate * weights.email +
         completion.phone.rate * weights.phone) / totalWeight
    );

    let grade, color;
    if (score >= 90) {
        grade = 'A';
        color = 'text-green-600';
    } else if (score >= 70) {
        grade = 'B';
        color = 'text-blue-600';
    } else if (score >= 50) {
        grade = 'C';
        color = 'text-yellow-600';
    } else {
        grade = 'D';
        color = 'text-red-600';
    }

    return { score, grade, color };
}

// ============================================
// ダッシュボードUI
// ============================================

/**
 * ダッシュボードモーダルを表示
 */
function showDashboardModal() {
    const modal = document.getElementById('dashboardModal');
    if (!modal) {
        console.error('Dashboard modal not found');
        return;
    }

    updateDashboardContent();
    openModal('dashboardModal');
}

/**
 * ダッシュボードの内容を更新
 */
function updateDashboardContent() {
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    const completion = calculateCompletionRate();
    const quality = calculateDataQualityScore();

    container.innerHTML = `
        <!-- 品質スコア -->
        <div class="text-center mb-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
            <div class="text-6xl font-bold ${quality.color} mb-2">${quality.grade}</div>
            <div class="text-2xl font-semibold text-gray-700">${quality.score}点</div>
            <div class="text-sm text-gray-500 mt-1">データ品質スコア</div>
        </div>

        <!-- 完了率一覧 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            ${createCompletionCard('役職', completion.roleId, 'fas fa-user-tag', 'role_id')}
            ${hasChatworkAccountIdColumn ? createCompletionCard('ChatWork ID', completion.chatworkId, 'fas fa-comments', 'chatwork_account_id') : ''}
            ${createCompletionCard('メールアドレス', completion.email, 'fas fa-envelope', 'email')}
            ${createCompletionCard('電話番号', completion.phone, 'fas fa-phone', 'phone')}
        </div>

        <!-- 概要統計 -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div class="text-center">
                <div class="text-2xl font-bold text-gray-800">${employees.length}</div>
                <div class="text-xs text-gray-500">総社員数</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold text-gray-800">${departments.length}</div>
                <div class="text-xs text-gray-500">部署数</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold text-gray-800">${roles.length}</div>
                <div class="text-xs text-gray-500">役職数</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">${completion.overall}%</div>
                <div class="text-xs text-gray-500">設定完了率</div>
            </div>
        </div>
    `;
}

/**
 * 完了率カードを作成
 * @param {string} label - ラベル
 * @param {Object} data - 完了率データ
 * @param {string} icon - FontAwesomeアイコンクラス
 * @param {string} field - フィールド名
 * @returns {string} - HTML文字列
 */
function createCompletionCard(label, data, icon, field) {
    const color = data.rate >= 80 ? 'green' : data.rate >= 50 ? 'yellow' : 'red';
    const incomplete = data.total - data.complete;

    return `
        <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
             onclick="showIncompleteList('${field}', '${label}')">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <i class="${icon} text-gray-400"></i>
                    <span class="font-medium text-gray-700">${label}</span>
                </div>
                <span class="text-lg font-bold text-${color}-600">${data.rate}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div class="bg-${color}-500 h-2 rounded-full transition-all"
                     style="width: ${data.rate}%"></div>
            </div>
            <div class="text-xs text-gray-500">
                ${data.complete}/${data.total}件
                ${incomplete > 0 ? `<span class="text-${color}-600 font-medium">（未設定: ${incomplete}件）</span>` : ''}
            </div>
        </div>
    `;
}

/**
 * 未設定者一覧を表示
 * @param {string} field - フィールド名
 * @param {string} label - 表示ラベル
 */
function showIncompleteList(field, label) {
    const incomplete = getIncompleteEmployees(field);

    if (incomplete.length === 0) {
        showNotification(`${label}は全員設定済みです`, 'success');
        return;
    }

    const listHtml = `
        <div class="max-h-80 overflow-y-auto">
            <p class="text-sm text-gray-600 mb-3">${label}が未設定の社員: ${incomplete.length}名</p>
            <div class="space-y-2">
                ${incomplete.map(emp => {
                    const dept = departments.find(d => d.id === emp.department_id);
                    return `
                        <div class="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                             onclick="closeModal('confirmModal'); editEmployee('${emp.id}')">
                            <div>
                                <span class="font-medium">${emp.name}</span>
                                <span class="text-sm text-gray-500 ml-2">${dept ? dept.name : '未所属'}</span>
                            </div>
                            <i class="fas fa-edit text-gray-400"></i>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    document.getElementById('confirmContent').innerHTML = listHtml;
    document.getElementById('confirmActions').innerHTML = `
        <button onclick="closeModal('confirmModal'); showDashboardModal();"
                class="btn bg-gray-200 hover:bg-gray-300 text-gray-800">
            戻る
        </button>
    `;
    closeModal('dashboardModal');
    openModal('confirmModal');
}

// ============================================
// 同期差分プレビュー
// ============================================

/**
 * ソウルくん同期の差分をプレビュー
 * @returns {Promise<Object>} - 差分情報
 */
async function previewSyncDiff() {
    if (!FEATURE_FLAGS.ENABLE_SYNC_PREVIEW) {
        showNotification('同期プレビュー機能は無効です', 'info');
        return null;
    }

    try {
        showNotification('同期差分を確認中...', 'info');

        // ソウルくんAPIにdry_run=trueでリクエスト
        const token = localStorage.getItem('soulsyncs_api_token');
        if (!token) {
            showNotification('APIトークンが設定されていません', 'warning');
            return null;
        }

        const response = await fetch(`${SOULKUN_API_BASE_URL}/organization-sync`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                organization_id: ORG_CONFIG.ORGANIZATION_ID,
                dry_run: true  // 実際には同期しない
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Sync preview error:', errorText);
            showNotification('差分確認に失敗しました', 'error');
            return null;
        }

        const diff = await response.json();
        showSyncDiffModal(diff);
        return diff;

    } catch (error) {
        console.error('Sync preview error:', error);
        showNotification('差分確認中にエラーが発生しました', 'error');
        return null;
    }
}

/**
 * 同期差分モーダルを表示
 * @param {Object} diff - 差分情報
 */
function showSyncDiffModal(diff) {
    const modalHtml = `
        <div class="space-y-4">
            <h3 class="font-bold text-lg">ソウルくんとの差分</h3>

            ${diff.added?.length > 0 ? `
                <div class="border-l-4 border-green-500 pl-4">
                    <div class="font-medium text-green-700">追加される社員 (${diff.added.length}件)</div>
                    <ul class="mt-2 space-y-1 text-sm">
                        ${diff.added.slice(0, 5).map(e => `<li>+ ${e.name}</li>`).join('')}
                        ${diff.added.length > 5 ? `<li class="text-gray-500">... 他${diff.added.length - 5}件</li>` : ''}
                    </ul>
                </div>
            ` : ''}

            ${diff.updated?.length > 0 ? `
                <div class="border-l-4 border-blue-500 pl-4">
                    <div class="font-medium text-blue-700">更新される社員 (${diff.updated.length}件)</div>
                    <ul class="mt-2 space-y-1 text-sm">
                        ${diff.updated.slice(0, 5).map(e => `<li>~ ${e.name}</li>`).join('')}
                        ${diff.updated.length > 5 ? `<li class="text-gray-500">... 他${diff.updated.length - 5}件</li>` : ''}
                    </ul>
                </div>
            ` : ''}

            ${diff.deleted?.length > 0 ? `
                <div class="border-l-4 border-red-500 pl-4">
                    <div class="font-medium text-red-700">削除される社員 (${diff.deleted.length}件)</div>
                    <ul class="mt-2 space-y-1 text-sm">
                        ${diff.deleted.slice(0, 5).map(e => `<li>- ${e.name}</li>`).join('')}
                        ${diff.deleted.length > 5 ? `<li class="text-gray-500">... 他${diff.deleted.length - 5}件</li>` : ''}
                    </ul>
                </div>
            ` : ''}

            ${(!diff.added?.length && !diff.updated?.length && !diff.deleted?.length) ? `
                <div class="text-center py-4 text-gray-500">
                    <i class="fas fa-check-circle text-green-500 text-2xl mb-2"></i>
                    <p>差分はありません。すべて同期済みです。</p>
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById('confirmContent').innerHTML = modalHtml;
    document.getElementById('confirmActions').innerHTML = `
        <button onclick="closeModal('confirmModal')"
                class="btn bg-gray-200 hover:bg-gray-300 text-gray-800">
            閉じる
        </button>
        ${(diff.added?.length || diff.updated?.length || diff.deleted?.length) ? `
            <button onclick="closeModal('confirmModal'); syncToSoulKun();"
                    class="btn bg-purple-500 hover:bg-purple-600 text-white">
                <i class="fas fa-sync-alt mr-2"></i>同期を実行
            </button>
        ` : ''}
    `;
    openModal('confirmModal');
}

// ============================================
// 初期化
// ============================================

/**
 * Phase 6機能を初期化
 */
function initializePhase6() {
    if (FEATURE_FLAGS.ENABLE_DASHBOARD || FEATURE_FLAGS.ENABLE_SYNC_PREVIEW) {
        console.log('✅ Phase 6: Dashboard initialized');
    }
}

// ============================================
// グローバルエクスポート
// ============================================

window.calculateCompletionRate = calculateCompletionRate;
window.getIncompleteEmployees = getIncompleteEmployees;
window.calculateDataQualityScore = calculateDataQualityScore;
window.showDashboardModal = showDashboardModal;
window.updateDashboardContent = updateDashboardContent;
window.showIncompleteList = showIncompleteList;
window.previewSyncDiff = previewSyncDiff;
window.showSyncDiffModal = showSyncDiffModal;
window.initializePhase6 = initializePhase6;

console.log('✅ dashboard.js loaded');

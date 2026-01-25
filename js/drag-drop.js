/**
 * org-chart ドラッグ&ドロップ強化モジュール
 * Phase 4: ドラッグ&ドロップ強化
 *
 * 機能:
 * - 社員の部署間移動（既存機能の強化）
 * - Shift+ドロップで兼務追加
 * - 確認ダイアログ改善
 * - ビジュアルフィードバック強化
 *
 * 作成日: 2026-01-25
 */

// ============================================
// 状態管理
// ============================================

let isDragging = false;
let draggedEmployee = null;
let isShiftKeyPressed = false;

// ============================================
// キーボードイベントリスナー
// ============================================

/**
 * キーボードイベントを設定
 */
function setupDragDropKeyListeners() {
    // Shiftキーの状態を追跡
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') {
            isShiftKeyPressed = true;
            updateDropZoneStyles();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') {
            isShiftKeyPressed = false;
            updateDropZoneStyles();
        }
    });

    // ウィンドウからフォーカスが外れた場合もリセット
    window.addEventListener('blur', () => {
        isShiftKeyPressed = false;
        updateDropZoneStyles();
    });
}

/**
 * ドロップゾーンのスタイルを更新（Shift状態に応じて）
 */
function updateDropZoneStyles() {
    if (!FEATURE_FLAGS.ENABLE_SHIFT_DROP_CONCURRENT) return;

    const dropZones = document.querySelectorAll('.tree-dept-box-compact, .card-dept-header');

    dropZones.forEach(zone => {
        if (isDragging) {
            if (isShiftKeyPressed) {
                zone.classList.add('shift-drop-mode');
                zone.classList.remove('normal-drop-mode');
            } else {
                zone.classList.remove('shift-drop-mode');
                zone.classList.add('normal-drop-mode');
            }
        }
    });
}

// ============================================
// 兼務追加機能
// ============================================

/**
 * Shift+ドロップで兼務を追加
 * @param {string} employeeId - 社員ID
 * @param {string} targetDeptId - 追加先部署ID
 * @returns {Promise<boolean>}
 */
async function addConcurrentDepartment(employeeId, targetDeptId) {
    const employee = employees.find(e => e.id === employeeId);
    const targetDept = departments.find(d => d.id === targetDeptId);

    if (!employee || !targetDept) {
        showNotification('社員または部署が見つかりません', 'error');
        return false;
    }

    // 既に主所属の場合
    if (employee.department_id === targetDeptId) {
        showNotification('この部署は既に主所属です', 'info');
        return false;
    }

    // 既に兼務している場合
    try {
        const existingDepts = JSON.parse(employee.departments || '[]');
        if (existingDepts.some(d => d.department_id === targetDeptId)) {
            showNotification('この部署には既に所属しています', 'info');
            return false;
        }
    } catch (e) {
        // departmentsがない場合は続行
    }

    // 兼務追加確認モーダル（役職入力欄付き）
    const currentDept = departments.find(d => d.id === employee.department_id);

    const modalHtml = `
        <div class="bg-green-50 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-3">
                <i class="fas fa-plus-circle text-green-600 mr-2"></i>兼務を追加しますか？
            </h3>
            <dl class="space-y-2 mb-4">
                <div class="flex"><dt class="font-semibold w-32">氏名:</dt><dd>${employee.name}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">主所属:</dt><dd>${currentDept ? currentDept.name : '不明'}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">兼務先:</dt><dd class="text-green-600 font-bold">${targetDept.name}</dd></div>
            </dl>
            <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">兼務先での役職（任意）</label>
                <input type="text" id="concurrentPosition"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                       placeholder="例: プロジェクトリーダー">
            </div>
            <p class="mt-3 text-sm text-gray-600">
                <i class="fas fa-info-circle mr-1"></i>
                主所属は変更されず、兼務として追加されます
            </p>
        </div>
    `;

    return new Promise((resolve) => {
        document.getElementById('confirmContent').innerHTML = modalHtml;
        document.getElementById('confirmActions').innerHTML = `
            <button onclick="closeModal('confirmModal'); window._concurrentResolve(false);"
                    class="btn bg-gray-200 hover:bg-gray-300 text-gray-800">
                キャンセル
            </button>
            <button onclick="window._executeConcurrentAdd('${employeeId}', '${targetDeptId}');"
                    class="btn bg-green-500 hover:bg-green-600 text-white">
                <i class="fas fa-plus mr-2"></i>兼務を追加
            </button>
        `;

        window._concurrentResolve = resolve;
        openModal('confirmModal');
    });
}

/**
 * 兼務追加を実行
 * @param {string} employeeId - 社員ID
 * @param {string} targetDeptId - 追加先部署ID
 */
async function executeConcurrentAdd(employeeId, targetDeptId) {
    const employee = employees.find(e => e.id === employeeId);
    const position = document.getElementById('concurrentPosition')?.value || '';

    closeModal('confirmModal');

    if (!employee) {
        if (window._concurrentResolve) window._concurrentResolve(false);
        return;
    }

    try {
        // 既存のdepartmentsを取得
        let existingDepts = [];
        try {
            existingDepts = JSON.parse(employee.departments || '[]');
        } catch (e) {
            existingDepts = [{
                department_id: employee.department_id,
                position: employee.position || '',
                is_main: true
            }];
        }

        // 新しい兼務を追加
        existingDepts.push({
            department_id: targetDeptId,
            position: position,
            is_main: false
        });

        // 変更前データを保存
        const beforeData = { ...employee };

        // Supabaseに更新
        const response = await fetch(`${SUPABASE_REST_URL}/employees?id=eq.${employeeId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                departments: JSON.stringify(existingDepts)
            })
        });

        if (response.ok) {
            const targetDept = departments.find(d => d.id === targetDeptId);

            // 変更履歴を記録
            await addChangeHistory(
                '兼務追加',
                'employee',
                employeeId,
                beforeData,
                { ...employee, departments: JSON.stringify(existingDepts) },
                `${employee.name}を${targetDept.name}に兼務追加しました`
            );

            // Phase 5: 監査ログ記録
            if (typeof logAudit === 'function') {
                await logAudit({
                    action: 'update',
                    targetType: 'employee',
                    targetId: employeeId,
                    targetName: employee.name,
                    beforeData: beforeData,
                    afterData: { ...employee, departments: JSON.stringify(existingDepts) },
                    changeSummary: `${employee.name}を${targetDept.name}に兼務追加`
                });
            }

            await loadData();
            showNotification(`${employee.name}を${targetDept.name}に兼務追加しました`, 'success');

            if (window._concurrentResolve) window._concurrentResolve(true);
        } else {
            throw new Error('兼務追加に失敗しました');
        }

    } catch (error) {
        console.error('兼務追加エラー:', error);
        showNotification('兼務の追加に失敗しました', 'error');
        if (window._concurrentResolve) window._concurrentResolve(false);
    }
}

// ============================================
// 強化されたドロップハンドラー
// ============================================

/**
 * 強化されたドロップ処理（Shift検出対応）
 * @param {Event} e - ドロップイベント
 * @param {string} targetDeptId - ドロップ先部署ID
 */
async function handleEnhancedDrop(e, targetDeptId) {
    e.preventDefault();

    const employeeId = e.dataTransfer.getData('text/plain');
    if (!employeeId) return;

    // 権限チェック
    if (typeof hasPermission === 'function' && !hasPermission('editor')) {
        showNotification('この操作には編集権限が必要です', 'warning');
        return;
    }

    // viewModeチェック
    if (viewMode !== 'edit') {
        showNotification('閲覧モードでは移動できません', 'info');
        return;
    }

    // Shiftキーで兼務追加
    if (FEATURE_FLAGS.ENABLE_SHIFT_DROP_CONCURRENT && e.shiftKey) {
        await addConcurrentDepartment(employeeId, targetDeptId);
    } else {
        // 通常の移動
        await moveEmployeeToDepartment(employeeId, targetDeptId);
    }

    // ドラッグ状態をリセット
    isDragging = false;
    draggedEmployee = null;
    cleanupDragStyles();
}

/**
 * ドラッグスタイルをクリーンアップ
 */
function cleanupDragStyles() {
    document.querySelectorAll('.drag-over, .shift-drop-mode, .normal-drop-mode').forEach(el => {
        el.classList.remove('drag-over', 'shift-drop-mode', 'normal-drop-mode');
    });

    document.querySelectorAll('.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
}

// ============================================
// ビジュアルフィードバック
// ============================================

/**
 * ドラッグ開始時のビジュアルフィードバック
 * @param {Event} e - ドラッグ開始イベント
 * @param {string} employeeId - 社員ID
 */
function onDragStart(e, employeeId) {
    isDragging = true;
    draggedEmployee = employees.find(emp => emp.id === employeeId);

    // ドラッグ中の要素を半透明に
    e.target.classList.add('dragging');
    e.target.style.opacity = '0.5';

    // ドロップ可能なゾーンをハイライト
    highlightDropZones(true);

    // データをセット
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', employeeId);
}

/**
 * ドラッグ終了時のクリーンアップ
 * @param {Event} e - ドラッグ終了イベント
 */
function onDragEnd(e) {
    isDragging = false;
    draggedEmployee = null;

    e.target.classList.remove('dragging');
    e.target.style.opacity = '1';

    highlightDropZones(false);
    cleanupDragStyles();
}

/**
 * ドロップゾーンをハイライト
 * @param {boolean} enable - ハイライトを有効にするか
 */
function highlightDropZones(enable) {
    const dropZones = document.querySelectorAll('.tree-dept-box-compact');

    dropZones.forEach(zone => {
        if (enable) {
            zone.classList.add('drop-zone-active');

            // 現在の部署は除外
            if (draggedEmployee && zone.dataset.deptId === draggedEmployee.department_id) {
                zone.classList.add('drop-zone-current');
            }
        } else {
            zone.classList.remove('drop-zone-active', 'drop-zone-current', 'shift-drop-mode', 'normal-drop-mode');
        }
    });
}

// ============================================
// スタイル注入
// ============================================

/**
 * Phase 4用のスタイルを注入
 */
function injectPhase4Styles() {
    if (document.getElementById('phase4-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'phase4-styles';
    styleEl.textContent = `
        /* ドラッグ中の社員 */
        .dragging {
            opacity: 0.5 !important;
            transform: scale(0.98);
            transition: transform 0.2s, opacity 0.2s;
        }

        /* ドロップゾーン（アクティブ時） */
        .drop-zone-active {
            outline: 2px dashed #3b82f6;
            outline-offset: 2px;
            transition: outline 0.2s, background-color 0.2s;
        }

        .drop-zone-active:not(.drop-zone-current):not(.drag-over) {
            background-color: rgba(59, 130, 246, 0.05);
        }

        /* 現在の部署（ドロップ不可） */
        .drop-zone-current {
            outline-color: #9ca3af !important;
            opacity: 0.6;
            cursor: not-allowed;
        }

        /* ドラッグオーバー時 */
        .drag-over {
            background-color: rgba(59, 130, 246, 0.15) !important;
            outline-color: #2563eb !important;
            outline-width: 3px !important;
        }

        /* Shift押下時（兼務モード） */
        .shift-drop-mode {
            outline-color: #10b981 !important;
            background-color: rgba(16, 185, 129, 0.1) !important;
        }

        .shift-drop-mode.drag-over {
            background-color: rgba(16, 185, 129, 0.2) !important;
        }

        /* 通常移動モード */
        .normal-drop-mode {
            outline-color: #3b82f6;
        }

        /* Shiftキーヒント */
        .drag-hint {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            transition: opacity 0.3s;
        }

        .drag-hint.shift-active {
            background: rgba(16, 185, 129, 0.9);
        }

        /* ツリービューのドロップゾーン強調 */
        .tree-dept-box-compact.drop-zone-active {
            padding: 8px 12px;
        }

        /* カードビューのドロップゾーン */
        .card-dept-header.drop-zone-active {
            border: 2px dashed #3b82f6;
            border-radius: 8px;
        }
    `;

    document.head.appendChild(styleEl);
}

// ============================================
// 初期化
// ============================================

/**
 * Phase 4機能を初期化
 */
function initializePhase4() {
    if (!FEATURE_FLAGS.ENABLE_SHIFT_DROP_CONCURRENT) {
        console.log('ℹ️ Shift+Drop concurrent mode disabled by feature flag');
        return;
    }

    injectPhase4Styles();
    setupDragDropKeyListeners();

    console.log('✅ Phase 4: Drag & Drop enhancements initialized');
}

// ============================================
// グローバルエクスポート
// ============================================

window.addConcurrentDepartment = addConcurrentDepartment;
window._executeConcurrentAdd = executeConcurrentAdd;
window.handleEnhancedDrop = handleEnhancedDrop;
window.onDragStart = onDragStart;
window.onDragEnd = onDragEnd;
window.highlightDropZones = highlightDropZones;
window.cleanupDragStyles = cleanupDragStyles;
window.initializePhase4 = initializePhase4;
window.isShiftKeyPressed = () => isShiftKeyPressed;
window.isDragging = () => isDragging;

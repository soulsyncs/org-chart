/**
 * org-chart 部署エディターモジュール
 *
 * 機能:
 * - 部署名のインライン編集（ダブルクリック）
 * - 右クリックコンテキストメニュー
 *   - 同階層に部署を追加
 *   - 子部署を追加
 *   - 部署名を変更
 *   - 部署を削除
 *
 * 作成日: 2026-01-26
 * 作成者: Claude Code
 */

// ============================================
// 定数
// ============================================

/**
 * コンテキストメニューの項目定義
 */
const CONTEXT_MENU_ITEMS = [
    {
        id: 'add-sibling',
        icon: 'fa-plus',
        label: '同階層に部署を追加',
        action: 'addSiblingDepartment'
    },
    {
        id: 'add-child',
        icon: 'fa-level-down-alt',
        label: '子部署を追加',
        action: 'addChildDepartment'
    },
    {
        id: 'rename',
        icon: 'fa-edit',
        label: '部署名を変更',
        action: 'startInlineEdit'
    },
    {
        id: 'divider',
        type: 'divider'
    },
    {
        id: 'delete',
        icon: 'fa-trash-alt',
        label: '部署を削除',
        action: 'deleteDepartment',
        danger: true
    }
];

/**
 * インライン編集の設定
 */
const INLINE_EDIT_CONFIG = {
    minWidth: 80,           // 最小幅（px）
    maxWidth: 300,          // 最大幅（px）
    padding: 8,             // パディング（px）
    fontSize: 'inherit',    // フォントサイズ
    borderRadius: 4,        // 角丸（px）
    animationDuration: 150  // アニメーション時間（ms）
};

// ============================================
// 状態管理
// ============================================

/**
 * 現在編集中の部署情報
 */
let currentEditState = {
    isEditing: false,
    departmentId: null,
    originalName: null,
    inputElement: null,
    targetElement: null
};

/**
 * コンテキストメニューの状態
 */
let contextMenuState = {
    isVisible: false,
    menuElement: null,
    targetDepartmentId: null,
    targetDepartment: null
};

// ============================================
// 初期化
// ============================================

/**
 * 部署エディターを初期化
 * ページ読み込み時に呼び出す
 */
function initializeDepartmentEditor() {
    if (typeof debugLog === 'function') debugLog('🔧 Initializing Department Editor...');

    // コンテキストメニューのHTML要素を作成
    createContextMenuElement();

    // スタイルを注入
    injectDepartmentEditorStyles();

    // グローバルイベントリスナーを設定
    setupGlobalEventListeners();

    if (typeof debugLog === 'function') debugLog('✅ Department Editor initialized');
}

/**
 * コンテキストメニューのHTML要素を作成
 */
function createContextMenuElement() {
    // 既存のメニューがあれば削除
    const existingMenu = document.getElementById('deptContextMenu');
    if (existingMenu) {
        existingMenu.remove();
    }

    // メニュー要素を作成
    const menu = document.createElement('div');
    menu.id = 'deptContextMenu';
    menu.className = 'dept-context-menu';
    menu.style.display = 'none';

    // メニュー項目を追加
    CONTEXT_MENU_ITEMS.forEach(item => {
        if (item.type === 'divider') {
            const divider = document.createElement('div');
            divider.className = 'dept-context-menu-divider';
            menu.appendChild(divider);
        } else {
            const menuItem = document.createElement('div');
            menuItem.className = `dept-context-menu-item${item.danger ? ' danger' : ''}`;
            menuItem.dataset.action = item.action;
            menuItem.innerHTML = `
                <i class="fas ${item.icon}"></i>
                <span>${item.label}</span>
            `;
            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                handleContextMenuAction(item.action);
            });
            menu.appendChild(menuItem);
        }
    });

    // bodyに追加
    document.body.appendChild(menu);
    contextMenuState.menuElement = menu;
}

/**
 * スタイルを注入
 */
function injectDepartmentEditorStyles() {
    // 既存のスタイルがあれば削除
    const existingStyle = document.getElementById('dept-editor-styles');
    if (existingStyle) {
        existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'dept-editor-styles';
    style.textContent = `
        /* ============================================
         * コンテキストメニュー
         * ============================================ */

        .dept-context-menu {
            position: fixed;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
            padding: 6px 0;
            min-width: 200px;
            z-index: 10000;
            font-size: 14px;
            animation: contextMenuFadeIn 0.15s ease-out;
        }

        @keyframes contextMenuFadeIn {
            from {
                opacity: 0;
                transform: scale(0.95) translateY(-5px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        .dept-context-menu-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            cursor: pointer;
            color: #374151;
            transition: background-color 0.15s, color 0.15s;
        }

        .dept-context-menu-item:hover {
            background-color: #f3f4f6;
        }

        .dept-context-menu-item.danger {
            color: #dc2626;
        }

        .dept-context-menu-item.danger:hover {
            background-color: #fef2f2;
        }

        .dept-context-menu-item i {
            width: 16px;
            text-align: center;
            font-size: 14px;
        }

        .dept-context-menu-divider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 6px 0;
        }

        /* ============================================
         * インライン編集
         * ============================================ */

        .dept-inline-edit-container {
            position: relative;
            display: inline-flex;
            align-items: center;
        }

        .dept-inline-edit-input {
            border: 2px solid var(--soul-red, #c84c38);
            border-radius: ${INLINE_EDIT_CONFIG.borderRadius}px;
            padding: 4px 8px;
            font-size: inherit;
            font-weight: 600;
            color: #1a1a1a;
            background: white;
            outline: none;
            box-shadow: 0 2px 8px rgba(200, 76, 56, 0.2);
            transition: box-shadow 0.15s;
        }

        .dept-inline-edit-input:focus {
            box-shadow: 0 2px 12px rgba(200, 76, 56, 0.3);
        }

        .dept-inline-edit-hint {
            position: absolute;
            bottom: -24px;
            left: 0;
            font-size: 11px;
            color: #6b7280;
            white-space: nowrap;
        }

        /* 編集可能な部署名にホバーエフェクト */
        .dept-name-editable {
            cursor: pointer;
            transition: background-color 0.15s, padding 0.15s;
            border-radius: 4px;
        }

        .dept-name-editable:hover {
            background-color: rgba(200, 76, 56, 0.08);
            padding: 2px 6px;
            margin: -2px -6px;
        }

        /* ツリービューの部署名 */
        .tree-dept-box-compact .tree-dept-name-compact {
            cursor: pointer;
        }

        .tree-dept-box-compact:not(.editing) .tree-dept-name-compact:hover {
            text-decoration: underline;
            text-decoration-style: dotted;
            text-underline-offset: 2px;
        }

        /* 編集中の部署ボックス */
        .tree-dept-box-compact.editing {
            background: white !important;
            border-color: var(--soul-red, #c84c38) !important;
        }

        /* カードビューの部署タイトル */
        .card-dept-title h3 {
            cursor: pointer;
            transition: color 0.15s;
        }

        .card-dept-title h3:hover {
            color: var(--soul-red, #c84c38);
        }

        /* ============================================
         * 部署追加モーダル（クイック版）
         * ============================================ */

        .quick-add-dept-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            animation: modalFadeIn 0.2s ease-out;
        }

        @keyframes modalFadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        .quick-add-dept-content {
            background: white;
            border-radius: 12px;
            padding: 24px;
            width: 400px;
            max-width: 90vw;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            animation: modalSlideIn 0.2s ease-out;
        }

        @keyframes modalSlideIn {
            from {
                transform: translateY(-20px);
            }
            to {
                transform: translateY(0);
            }
        }

        .quick-add-dept-title {
            font-size: 18px;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .quick-add-dept-title i {
            color: var(--soul-red, #c84c38);
        }

        .quick-add-dept-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .quick-add-dept-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .quick-add-dept-field label {
            font-size: 13px;
            font-weight: 600;
            color: #374151;
        }

        .quick-add-dept-field input {
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.15s, box-shadow 0.15s;
        }

        .quick-add-dept-field input:focus {
            outline: none;
            border-color: var(--soul-red, #c84c38);
            box-shadow: 0 0 0 3px rgba(200, 76, 56, 0.1);
        }

        .quick-add-dept-info {
            background: #f9fafb;
            padding: 12px;
            border-radius: 6px;
            font-size: 13px;
            color: #6b7280;
        }

        .quick-add-dept-info dt {
            font-weight: 600;
            color: #374151;
            display: inline;
        }

        .quick-add-dept-buttons {
            display: flex;
            gap: 10px;
            margin-top: 8px;
        }

        .quick-add-dept-buttons button {
            flex: 1;
            padding: 10px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
            border: none;
        }

        .quick-add-btn-primary {
            background: var(--soul-red, #c84c38);
            color: white;
        }

        .quick-add-btn-primary:hover {
            background: #b43d2c;
        }

        .quick-add-btn-secondary {
            background: #e5e7eb;
            color: #374151;
        }

        .quick-add-btn-secondary:hover {
            background: #d1d5db;
        }
    `;

    document.head.appendChild(style);
}

/**
 * グローバルイベントリスナーを設定
 */
function setupGlobalEventListeners() {
    // ドキュメント全体でのクリックでコンテキストメニューを閉じる
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dept-context-menu')) {
            hideContextMenu();
        }
    });

    // Escapeキーでコンテキストメニューとインライン編集を閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideContextMenu();
            cancelInlineEdit();
        }
    });

    // スクロール時にコンテキストメニューを閉じる
    document.addEventListener('scroll', () => {
        hideContextMenu();
    }, true);

    // ウィンドウリサイズ時にコンテキストメニューを閉じる
    window.addEventListener('resize', () => {
        hideContextMenu();
    });
}

// ============================================
// コンテキストメニュー
// ============================================

/**
 * コンテキストメニューを表示
 * @param {Event} e - 右クリックイベント
 * @param {string} departmentId - 部署ID
 */
function showContextMenu(e, departmentId) {
    e.preventDefault();
    e.stopPropagation();

    // 部署情報を取得
    const deptArray = window.departments || departments;
    const department = deptArray.find(d => d.id === departmentId);

    if (!department) {
        console.error('Department not found:', departmentId);
        return;
    }

    // 状態を更新
    contextMenuState.targetDepartmentId = departmentId;
    contextMenuState.targetDepartment = department;

    const menu = contextMenuState.menuElement;
    if (!menu) {
        console.error('Context menu element not found');
        return;
    }

    // メニューを表示（位置計算のため）
    menu.style.display = 'block';
    menu.style.visibility = 'hidden';

    // メニューのサイズを取得
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 位置を計算（画面からはみ出ないように）
    let x = e.clientX;
    let y = e.clientY;

    // 右端からはみ出る場合は左に表示
    if (x + menuRect.width > viewportWidth - 10) {
        x = viewportWidth - menuRect.width - 10;
    }

    // 下端からはみ出る場合は上に表示
    if (y + menuRect.height > viewportHeight - 10) {
        y = viewportHeight - menuRect.height - 10;
    }

    // 位置を設定
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.visibility = 'visible';

    contextMenuState.isVisible = true;

    if (typeof debugLog === 'function') debugLog('📋 Context menu shown for department:', department.name);
}

/**
 * コンテキストメニューを非表示
 */
function hideContextMenu() {
    if (contextMenuState.menuElement) {
        contextMenuState.menuElement.style.display = 'none';
    }
    contextMenuState.isVisible = false;
    contextMenuState.targetDepartmentId = null;
    contextMenuState.targetDepartment = null;
}

/**
 * コンテキストメニューのアクションを処理
 * @param {string} action - アクション名
 */
function handleContextMenuAction(action) {
    const deptId = contextMenuState.targetDepartmentId;
    const dept = contextMenuState.targetDepartment;

    hideContextMenu();

    if (!deptId || !dept) {
        console.error('No target department for action:', action);
        return;
    }

    if (typeof debugLog === 'function') debugLog(`🎯 Context menu action: ${action} for department: ${dept.name}`);

    switch (action) {
        case 'addSiblingDepartment':
            showQuickAddDepartmentModal(dept.parent_id, dept);
            break;
        case 'addChildDepartment':
            showQuickAddDepartmentModal(deptId, dept);
            break;
        case 'startInlineEdit':
            startInlineEditForDepartment(deptId);
            break;
        case 'deleteDepartment':
            // 既存の削除関数を呼び出し
            if (typeof confirmDeleteDepartment === 'function') {
                confirmDeleteDepartment(deptId);
            } else if (typeof window.confirmDeleteDepartment === 'function') {
                window.confirmDeleteDepartment(deptId);
            } else {
                console.error('confirmDeleteDepartment function not found');
                showNotification('削除機能が利用できません', 'error');
            }
            break;
        default:
            console.warn('Unknown action:', action);
    }
}

// ============================================
// インライン編集
// ============================================

/**
 * 指定した部署のインライン編集を開始
 * @param {string} departmentId - 部署ID
 */
function startInlineEditForDepartment(departmentId) {
    // 既存の編集をキャンセル
    if (currentEditState.isEditing) {
        cancelInlineEdit();
    }

    const deptArray = window.departments || departments;
    const department = deptArray.find(d => d.id === departmentId);

    if (!department) {
        console.error('Department not found:', departmentId);
        return;
    }

    // 部署名要素を探す（ツリービューとカードビューの両方に対応）
    let targetElement = null;

    // ツリービューの場合
    const treeBox = document.querySelector(`.tree-dept-box-compact[data-dept-id="${departmentId}"]`);
    if (treeBox) {
        targetElement = treeBox.querySelector('.tree-dept-name-compact');
    }

    // カードビューの場合
    if (!targetElement) {
        const cardSection = document.getElementById(`dept-${departmentId}`);
        if (cardSection) {
            targetElement = cardSection.querySelector('.card-dept-title h3');
        }
    }

    if (!targetElement) {
        console.warn('Target element not found for department:', departmentId);
        // フォールバック：モーダルで編集
        if (typeof editDepartment === 'function') {
            editDepartment(departmentId);
        } else if (typeof window.editDepartment === 'function') {
            window.editDepartment(departmentId);
        }
        return;
    }

    startInlineEdit(targetElement, departmentId, department.name);
}

/**
 * インライン編集を開始
 * @param {HTMLElement} targetElement - 編集対象の要素
 * @param {string} departmentId - 部署ID
 * @param {string} currentName - 現在の部署名
 */
function startInlineEdit(targetElement, departmentId, currentName) {
    if (typeof debugLog === 'function') debugLog('✏️ Starting inline edit for:', currentName);

    // 状態を更新
    currentEditState.isEditing = true;
    currentEditState.departmentId = departmentId;
    currentEditState.originalName = currentName;
    currentEditState.targetElement = targetElement;

    // 元のテキストを保存
    const originalHTML = targetElement.innerHTML;

    // 入力フィールドを作成
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'dept-inline-edit-input';
    input.style.width = `${Math.max(INLINE_EDIT_CONFIG.minWidth, Math.min(targetElement.offsetWidth + 20, INLINE_EDIT_CONFIG.maxWidth))}px`;

    // コンテナを作成
    const container = document.createElement('div');
    container.className = 'dept-inline-edit-container';
    container.appendChild(input);

    // ヒントを追加
    const hint = document.createElement('div');
    hint.className = 'dept-inline-edit-hint';
    hint.textContent = 'Enter: 保存 / Escape: キャンセル';
    container.appendChild(hint);

    // 元の要素の内容を置き換え
    targetElement.innerHTML = '';
    targetElement.appendChild(container);

    // 親要素にクラスを追加（ツリービューの場合）
    const treeBox = targetElement.closest('.tree-dept-box-compact');
    if (treeBox) {
        treeBox.classList.add('editing');
    }

    currentEditState.inputElement = input;

    // フォーカスして全選択
    input.focus();
    input.select();

    // イベントリスナーを設定
    input.addEventListener('keydown', handleInlineEditKeydown);
    input.addEventListener('blur', handleInlineEditBlur);

    // クリックイベントの伝播を止める
    input.addEventListener('click', (e) => e.stopPropagation());
}

/**
 * インライン編集のキーボードイベントを処理
 * @param {KeyboardEvent} e - キーボードイベント
 */
function handleInlineEditKeydown(e) {
    e.stopPropagation();

    if (e.key === 'Enter') {
        e.preventDefault();
        saveInlineEdit();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelInlineEdit();
    }
}

/**
 * インライン編集のフォーカスアウトを処理
 * @param {FocusEvent} e - フォーカスイベント
 */
function handleInlineEditBlur(e) {
    // 少し遅延させて、Enterキー押下による保存と競合しないようにする
    setTimeout(() => {
        if (currentEditState.isEditing) {
            saveInlineEdit();
        }
    }, 100);
}

/**
 * インライン編集を保存
 */
async function saveInlineEdit() {
    if (!currentEditState.isEditing || !currentEditState.inputElement) {
        return;
    }

    const newName = currentEditState.inputElement.value.trim();
    const departmentId = currentEditState.departmentId;
    const originalName = currentEditState.originalName;

    // 入力検証
    if (!newName) {
        showNotification('部署名を入力してください', 'warning');
        currentEditState.inputElement.focus();
        return;
    }

    // 変更がない場合はキャンセル
    if (newName === originalName) {
        cancelInlineEdit();
        return;
    }

    if (typeof debugLog === 'function') debugLog(`💾 Saving department name change: "${originalName}" → "${newName}"`);

    // UIを復元（保存中表示）
    restoreOriginalElement(newName + ' (保存中...)');

    try {
        // Supabaseに更新
        const response = await fetch(`${SUPABASE_REST_URL}/departments?id=eq.${departmentId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                name: newName
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const updatedData = await response.json();
        if (typeof debugLog === 'function') debugLog('✅ Department updated:', updatedData);

        // 変更履歴を記録
        const deptArray = window.departments || departments;
        const department = deptArray.find(d => d.id === departmentId);
        const beforeData = department ? { ...department } : { name: originalName };
        const afterData = { ...beforeData, name: newName };

        if (typeof window.addChangeHistory === 'function') {
            await window.addChangeHistory(
                '部署名変更',
                'department',
                departmentId,
                beforeData,
                afterData,
                `部署名を「${originalName}」から「${newName}」に変更しました`
            );
        }

        // 監査ログを記録
        if (typeof logAudit === 'function') {
            await logAudit({
                action: 'update',
                targetType: 'department',
                targetId: departmentId,
                targetName: newName,
                beforeData: beforeData,
                afterData: afterData,
                changeSummary: `部署名を「${originalName}」から「${newName}」に変更`
            });
        }

        // データを再読み込み
        if (typeof window.loadData === 'function') {
            await window.loadData();
        }

        showNotification(`部署名を「${newName}」に変更しました`, 'success');

    } catch (error) {
        console.error('Failed to save department name:', error);
        showNotification('部署名の変更に失敗しました', 'error');

        // 元の名前に戻す
        restoreOriginalElement(originalName);
    }

    // 編集状態をリセット
    resetEditState();
}

/**
 * インライン編集をキャンセル
 */
function cancelInlineEdit() {
    if (!currentEditState.isEditing) {
        return;
    }

    if (typeof debugLog === 'function') debugLog('❌ Inline edit cancelled');

    // 元の表示に戻す
    restoreOriginalElement(currentEditState.originalName);

    // 編集状態をリセット
    resetEditState();
}

/**
 * 元の要素の内容を復元
 * @param {string} text - 表示するテキスト
 */
function restoreOriginalElement(text) {
    const targetElement = currentEditState.targetElement;

    if (targetElement) {
        targetElement.innerHTML = text;

        // ツリービューの場合、editingクラスを削除
        const treeBox = targetElement.closest('.tree-dept-box-compact');
        if (treeBox) {
            treeBox.classList.remove('editing');
        }
    }
}

/**
 * 編集状態をリセット
 */
function resetEditState() {
    currentEditState = {
        isEditing: false,
        departmentId: null,
        originalName: null,
        inputElement: null,
        targetElement: null
    };
}

// ============================================
// クイック部署追加モーダル
// ============================================

/**
 * クイック部署追加モーダルを表示
 * @param {string|null} parentId - 親部署ID（nullの場合はトップレベル）
 * @param {Object} referenceDept - 参照元の部署（同階層追加の場合）
 */
function showQuickAddDepartmentModal(parentId, referenceDept) {
    // 既存のモーダルを削除
    const existingModal = document.getElementById('quickAddDeptModal');
    if (existingModal) {
        existingModal.remove();
    }

    // 親部署の情報を取得
    const deptArray = window.departments || departments;
    const parentDept = parentId ? deptArray.find(d => d.id === parentId) : null;

    // モーダルを作成
    const modal = document.createElement('div');
    modal.id = 'quickAddDeptModal';
    modal.className = 'quick-add-dept-modal';

    // 追加タイプを判定
    const isChildAdd = referenceDept && parentId === referenceDept.id;
    const addTypeText = isChildAdd ? '子部署を追加' : '同階層に部署を追加';
    const addTypeIcon = isChildAdd ? 'fa-level-down-alt' : 'fa-plus';

    modal.innerHTML = `
        <div class="quick-add-dept-content">
            <div class="quick-add-dept-title">
                <i class="fas ${addTypeIcon}"></i>
                ${addTypeText}
            </div>

            <div class="quick-add-dept-form">
                <div class="quick-add-dept-info">
                    ${isChildAdd ? `
                        <dt>親部署:</dt> ${referenceDept.name}
                    ` : `
                        <dt>同階層:</dt> ${referenceDept ? referenceDept.name : 'トップレベル'}
                        ${parentDept ? `<br><dt>親部署:</dt> ${parentDept.name}` : ''}
                    `}
                </div>

                <div class="quick-add-dept-field">
                    <label for="quickDeptName">部署名 <span style="color: #dc2626;">*</span></label>
                    <input type="text" id="quickDeptName" placeholder="例: 営業部、開発チーム" autofocus>
                </div>

                <div class="quick-add-dept-buttons">
                    <button type="button" class="quick-add-btn-secondary" onclick="closeQuickAddModal()">
                        キャンセル
                    </button>
                    <button type="button" class="quick-add-btn-primary" onclick="executeQuickAddDepartment('${parentId || ''}')">
                        <i class="fas fa-plus"></i> 追加
                    </button>
                </div>
            </div>
        </div>
    `;

    // モーダルを追加
    document.body.appendChild(modal);

    // 背景クリックで閉じる
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeQuickAddModal();
        }
    });

    // Enterキーで追加
    const input = document.getElementById('quickDeptName');
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            executeQuickAddDepartment(parentId || '');
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeQuickAddModal();
        }
    });

    // フォーカス
    setTimeout(() => input.focus(), 100);

    if (typeof debugLog === 'function') debugLog(`📝 Quick add modal shown (parentId: ${parentId || 'null'}, type: ${addTypeText})`);
}

/**
 * クイック部署追加モーダルを閉じる
 */
function closeQuickAddModal() {
    const modal = document.getElementById('quickAddDeptModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * クイック部署追加を実行
 * @param {string} parentId - 親部署ID（空文字の場合はnull）
 */
async function executeQuickAddDepartment(parentId) {
    const nameInput = document.getElementById('quickDeptName');
    const name = nameInput.value.trim();

    // 入力検証
    if (!name) {
        showNotification('部署名を入力してください', 'warning');
        nameInput.focus();
        return;
    }

    // 重複チェック
    const deptArray = window.departments || departments;
    const duplicate = deptArray.find(d => d.name === name);
    if (duplicate) {
        showNotification(`「${name}」という部署は既に存在します`, 'warning');
        nameInput.focus();
        nameInput.select();
        return;
    }

    if (typeof debugLog === 'function') debugLog(`➕ Adding department: "${name}" (parent: ${parentId || 'null'})`);

    // モーダルを閉じる
    closeQuickAddModal();

    // ローディング表示
    showNotification('部署を追加中...', 'info');

    try {
        // ソート順序を計算
        const sortOrder = deptArray.length + 1;

        // 部署データを作成
        const departmentData = {
            name: name,
            parent_id: parentId || null,
            sort_order: sortOrder
        };

        // Supabaseに追加
        const response = await fetch(`${SUPABASE_REST_URL}/departments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(departmentData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const newDept = await response.json();
        if (typeof debugLog === 'function') debugLog('✅ Department added:', newDept);

        // 変更履歴を記録
        if (typeof window.addChangeHistory === 'function') {
            await window.addChangeHistory(
                '部署追加',
                'department',
                newDept[0]?.id || 'unknown',
                null,
                departmentData,
                `部署「${name}」を追加しました`
            );
        }

        // 監査ログを記録
        if (typeof logAudit === 'function') {
            await logAudit({
                action: 'create',
                targetType: 'department',
                targetId: newDept[0]?.id || 'unknown',
                targetName: name,
                beforeData: null,
                afterData: departmentData,
                changeSummary: `部署「${name}」を追加`
            });
        }

        // データを再読み込み
        if (typeof window.loadData === 'function') {
            await window.loadData();
        }

        showNotification(`部署「${name}」を追加しました`, 'success');

    } catch (error) {
        console.error('Failed to add department:', error);
        showNotification('部署の追加に失敗しました', 'error');
    }
}

// ============================================
// 部署要素へのイベント設定
// ============================================

/**
 * 部署要素に編集機能を設定
 * ビューがレンダリングされた後に呼び出す
 */
function attachDepartmentEditorEvents() {
    if (typeof debugLog === 'function') debugLog('🔗 Attaching department editor events...');

    // ツリービューの部署ボックス
    document.querySelectorAll('.tree-dept-box-compact').forEach(box => {
        const deptId = box.dataset.deptId;
        if (!deptId) return;

        // 右クリックイベント
        box.addEventListener('contextmenu', (e) => {
            showContextMenu(e, deptId);
        });

        // ダブルクリックでインライン編集
        const nameElement = box.querySelector('.tree-dept-name-compact');
        if (nameElement) {
            nameElement.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                startInlineEditForDepartment(deptId);
            });
        }
    });

    // カードビューの部署セクション
    document.querySelectorAll('.card-dept-section').forEach(section => {
        // IDから部署IDを抽出（dept-{id}の形式）
        const sectionId = section.id;
        const deptId = sectionId ? sectionId.replace('dept-', '') : null;
        if (!deptId) return;

        // 右クリックイベント（ヘッダー部分のみ）
        const header = section.querySelector('.card-dept-header');
        if (header) {
            header.addEventListener('contextmenu', (e) => {
                showContextMenu(e, deptId);
            });
        }

        // ダブルクリックでインライン編集（タイトル部分のみ）
        const title = section.querySelector('.card-dept-title h3');
        if (title) {
            title.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                startInlineEditForDepartment(deptId);
            });
        }
    });

    if (typeof debugLog === 'function') debugLog('✅ Department editor events attached');
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * 通知を表示（既存の関数を使用）
 * @param {string} message - メッセージ
 * @param {string} type - タイプ（success, error, warning, info）
 */
function showDeptEditorNotification(message, type) {
    if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// ============================================
// グローバルエクスポート
// ============================================

// 初期化関数
window.initializeDepartmentEditor = initializeDepartmentEditor;

// コンテキストメニュー
window.showContextMenu = showContextMenu;
window.hideContextMenu = hideContextMenu;

// インライン編集
window.startInlineEditForDepartment = startInlineEditForDepartment;
window.cancelInlineEdit = cancelInlineEdit;

// クイック部署追加
window.showQuickAddDepartmentModal = showQuickAddDepartmentModal;
window.closeQuickAddModal = closeQuickAddModal;
window.executeQuickAddDepartment = executeQuickAddDepartment;

// イベント設定
window.attachDepartmentEditorEvents = attachDepartmentEditorEvents;

if (typeof logModuleLoaded === 'function') {
    logModuleLoaded('department-editor.js');
}

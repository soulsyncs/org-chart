/**
 * org-chart ツリー表示強化モジュール
 * Phase 3: ツリー表示改善
 *
 * 機能:
 * - 役職順ソート
 * - 役職名バッジ表示（レベル別色分け）
 * - 兼務者表示改善
 * - 未設定フィールドハイライト
 *
 * 作成日: 2026-01-25
 */

// ============================================
// 役職レベル別カラー設定
// ============================================

const ROLE_LEVEL_COLORS = {
    6: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', label: '代表' },
    5: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', label: '管理部' },
    4: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', label: '部長' },
    3: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', label: '課長' },
    2: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', label: '一般' },
    1: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', label: '業務委託' },
    0: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', label: '未設定' }
};

// 未設定時のデフォルトレベル（最下位）
const DEFAULT_ROLE_LEVEL = 999;

// ============================================
// 役職順ソート
// ============================================

/**
 * 部署の社員を役職レベル順にソートして取得
 * @param {string} deptId - 部署ID
 * @returns {Array} - ソートされた社員配列
 */
function getEmployeesSortedByRole(deptId) {
    if (!FEATURE_FLAGS.ENABLE_ROLE_SORTING) {
        // フィーチャーフラグが無効な場合は既存の動作
        return getEmployeesForDepartment(deptId);
    }

    const deptEmployees = getEmployeesForDepartment(deptId);

    return deptEmployees.sort((a, b) => {
        const levelA = getRoleLevel(a.role_id);
        const levelB = getRoleLevel(b.role_id);

        // レベルが高い順（数字が大きい順）にソート
        if (levelA !== levelB) {
            return levelB - levelA;
        }

        // 同じレベルの場合は名前でソート
        return a.name.localeCompare(b.name, 'ja');
    });
}

/**
 * 部署に所属する社員を取得（主所属 + 兼務）
 * @param {string} deptId - 部署ID
 * @returns {Array} - 社員配列
 */
function getEmployeesForDepartment(deptId) {
    return employees.filter(e => {
        // 主所属
        if (e.department_id === deptId) return true;

        // 兼務チェック
        try {
            const depts = JSON.parse(e.departments || '[]');
            return depts.some(d => d.department_id === deptId);
        } catch (err) {
            return false;
        }
    });
}

/**
 * 役職IDからレベルを取得
 * @param {string} roleId - 役職ID
 * @returns {number} - レベル（見つからない場合は0）
 */
function getRoleLevel(roleId) {
    if (!roleId) return 0;
    const role = roles.find(r => r.id === roleId);
    return role ? role.level : 0;
}

// ============================================
// 役職バッジ表示
// ============================================

/**
 * 役職バッジのHTMLを生成
 * @param {string} roleId - 役職ID
 * @param {boolean} compact - コンパクト表示かどうか
 * @returns {string} - バッジのHTML
 */
function createRoleBadge(roleId, compact = false) {
    if (!FEATURE_FLAGS.ENABLE_ROLE_BADGES) {
        // フィーチャーフラグが無効な場合は空文字を返す
        return '';
    }

    const role = roles.find(r => r.id === roleId);
    const level = role ? role.level : 0;
    const roleName = role ? role.name : '';

    const colors = ROLE_LEVEL_COLORS[level] || ROLE_LEVEL_COLORS[0];

    if (compact) {
        // ツリー表示用のコンパクトバッジ
        return `<span class="role-badge-compact ${colors.bg} ${colors.text} ${colors.border}"
                      title="${roleName || '役職未設定'}">${roleName ? roleName.charAt(0) : '?'}</span>`;
    }

    // 通常バッジ
    return `<span class="role-badge ${colors.bg} ${colors.text} ${colors.border}">
                ${roleName || '未設定'}
            </span>`;
}

/**
 * 役職バッジのスタイルを取得
 * @param {string} roleId - 役職ID
 * @returns {Object} - スタイル情報
 */
function getRoleBadgeStyle(roleId) {
    const role = roles.find(r => r.id === roleId);
    const level = role ? role.level : 0;
    return ROLE_LEVEL_COLORS[level] || ROLE_LEVEL_COLORS[0];
}

// ============================================
// 兼務者表示
// ============================================

/**
 * 社員が指定部署で兼務かどうかをチェック
 * @param {Object} emp - 社員オブジェクト
 * @param {string} deptId - 表示中の部署ID
 * @returns {boolean}
 */
function isConcurrentDepartment(emp, deptId) {
    return emp.department_id !== deptId;
}

/**
 * 兼務情報を取得
 * @param {Object} emp - 社員オブジェクト
 * @returns {Array} - 兼務先部署情報の配列
 */
function getConcurrentDepartments(emp) {
    try {
        return JSON.parse(emp.departments || '[]');
    } catch (e) {
        return [];
    }
}

/**
 * 社員の主所属部署名を取得
 * @param {Object} emp - 社員オブジェクト
 * @returns {string} - 部署名
 */
function getPrimaryDepartmentName(emp) {
    const dept = departments.find(d => d.id === emp.department_id);
    return dept ? dept.name : '未所属';
}

/**
 * 兼務者用のツールチップテキストを生成
 * @param {Object} emp - 社員オブジェクト
 * @param {string} currentDeptId - 現在表示中の部署ID
 * @returns {string}
 */
function getConcurrentTooltip(emp, currentDeptId) {
    if (!isConcurrentDepartment(emp, currentDeptId)) return '';

    const primaryDept = getPrimaryDepartmentName(emp);
    const concurrentDepts = getConcurrentDepartments(emp);
    const currentConcurrent = concurrentDepts.find(d => d.department_id === currentDeptId);
    const position = currentConcurrent?.position || '（役職未設定）';

    return `主所属: ${primaryDept}\n兼務先役職: ${position}`;
}

// ============================================
// 未設定フィールドハイライト
// ============================================

/**
 * 社員の未設定フィールドを取得
 * @param {Object} emp - 社員オブジェクト
 * @returns {Array} - 未設定フィールド名の配列
 */
function getUnsetFields(emp) {
    if (!FEATURE_FLAGS.ENABLE_UNSET_HIGHLIGHT) {
        return [];
    }

    const unsetFields = [];

    // 役職未設定
    if (!emp.role_id) {
        unsetFields.push('役職');
    }

    // ChatWork ID未設定（カラムが存在する場合のみ）
    if (typeof hasChatworkAccountIdColumn !== 'undefined' && hasChatworkAccountIdColumn) {
        if (!emp.chatwork_account_id) {
            unsetFields.push('ChatWork ID');
        }
    }

    return unsetFields;
}

/**
 * 未設定フィールドがあるかチェック
 * @param {Object} emp - 社員オブジェクト
 * @returns {boolean}
 */
function hasUnsetFields(emp) {
    return getUnsetFields(emp).length > 0;
}

/**
 * 未設定フィールドのツールチップテキストを生成
 * @param {Object} emp - 社員オブジェクト
 * @returns {string}
 */
function getUnsetFieldsTooltip(emp) {
    const unsetFields = getUnsetFields(emp);
    if (unsetFields.length === 0) return '';

    return `未設定: ${unsetFields.join(', ')}`;
}

/**
 * 未設定警告バッジのHTMLを生成
 * @param {Object} emp - 社員オブジェクト
 * @returns {string}
 */
function createUnsetWarningBadge(emp) {
    if (!hasUnsetFields(emp)) return '';

    const tooltip = getUnsetFieldsTooltip(emp);
    return `<span class="unset-warning-badge" title="${tooltip}">⚠️</span>`;
}

// ============================================
// 強化された社員カード生成
// ============================================

/**
 * 強化された社員カードを生成（Phase 3対応）
 * @param {Object} emp - 社員オブジェクト
 * @param {string} currentDeptId - 現在の部署ID
 * @returns {HTMLElement}
 */
function createEnhancedEmployeeCard(emp, currentDeptId = null) {
    const card = document.createElement('div');
    card.className = 'employee-card-mini';
    card.dataset.empId = emp.id;

    // 兼務チェック
    const isConcurrent = currentDeptId && isConcurrentDepartment(emp, currentDeptId);

    // 兼務先での役職を取得
    let displayPosition = emp.position || '';
    if (isConcurrent) {
        const concurrentDepts = getConcurrentDepartments(emp);
        const concurrentDept = concurrentDepts.find(d => d.department_id === currentDeptId);
        if (concurrentDept && concurrentDept.position) {
            displayPosition = concurrentDept.position;
        }
    }

    // 雇用形態のマーカー色
    const typeColor = emp.employment_type === '社員' ? '#3b82f6' :
                      emp.employment_type === '業務委託' ? '#f59e0b' : '#10b981';

    // 未設定フィールドがある場合のクラス
    const unsetClass = hasUnsetFields(emp) ? 'has-unset-fields' : '';

    // 兼務の場合のクラス
    const concurrentClass = isConcurrent ? 'is-concurrent' : '';

    card.className = `employee-card-mini ${unsetClass} ${concurrentClass}`;

    // ツールチップ
    const tooltips = [];
    if (isConcurrent) {
        tooltips.push(getConcurrentTooltip(emp, currentDeptId));
    }
    if (hasUnsetFields(emp)) {
        tooltips.push(getUnsetFieldsTooltip(emp));
    }
    const tooltipText = tooltips.join('\n');

    // カードHTML生成
    card.innerHTML = `
        <span class="mini-card-marker" style="background: ${typeColor}"></span>
        <span class="mini-card-name ${isConcurrent ? 'text-gray-500' : ''}"
              onclick="showEmployeeDetail('${emp.id}')"
              ${tooltipText ? `title="${tooltipText}"` : ''}>
            ${emp.name}
        </span>
        ${createRoleBadge(emp.role_id, true)}
        ${displayPosition ? `<span class="mini-card-pos">${displayPosition}</span>` : ''}
        ${isConcurrent ? '<span class="mini-card-tag concurrent-tag" title="' + getConcurrentTooltip(emp, currentDeptId) + '">兼</span>' : ''}
        ${createUnsetWarningBadge(emp)}
        <div class="mini-card-actions">
            <button onclick="event.stopPropagation(); editEmployee('${emp.id}')" class="mini-card-btn mini-card-btn-edit" title="編集">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="event.stopPropagation(); confirmDeleteEmployee('${emp.id}')" class="mini-card-btn mini-card-btn-delete" title="削除">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return card;
}

/**
 * 強化されたツリー社員アイテムを生成（Phase 3対応）
 * @param {Object} emp - 社員オブジェクト
 * @param {string} currentDeptId - 現在の部署ID
 * @returns {HTMLElement}
 */
function createEnhancedTreeEmployeeItem(emp, currentDeptId) {
    const empItem = document.createElement('div');
    empItem.className = 'tree-emp-item-compact';
    empItem.draggable = true;
    empItem.dataset.empId = emp.id;

    // 兼務チェック
    const isConcurrent = currentDeptId && isConcurrentDepartment(emp, currentDeptId);

    // 未設定フィールドがある場合のクラス
    if (hasUnsetFields(emp)) {
        empItem.classList.add('has-unset-fields');
    }

    // 兼務の場合のクラス
    if (isConcurrent) {
        empItem.classList.add('is-concurrent');
    }

    // ツールチップ
    const tooltips = [];
    if (isConcurrent) {
        tooltips.push(getConcurrentTooltip(emp, currentDeptId));
    }
    if (hasUnsetFields(emp)) {
        tooltips.push(getUnsetFieldsTooltip(emp));
    }
    const tooltipText = tooltips.join('\n');

    // HTMLを生成
    empItem.innerHTML = `
        <span class="tree-emp-name ${isConcurrent ? 'text-gray-500' : ''}"
              ${tooltipText ? `title="${tooltipText}"` : ''}>
            ${emp.name}
        </span>
        ${FEATURE_FLAGS.ENABLE_ROLE_BADGES ? createRoleBadge(emp.role_id, true) : ''}
        ${isConcurrent ? '<span class="tree-concurrent-tag">兼</span>' : ''}
        ${createUnsetWarningBadge(emp)}
    `;

    // クリックイベント
    empItem.onclick = (e) => {
        if (!empItem.classList.contains('dragging')) {
            showEmployeeDetail(emp.id);
        }
    };

    // ドラッグイベント
    empItem.addEventListener('dragstart', (e) => {
        empItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', emp.id);
    });

    empItem.addEventListener('dragend', (e) => {
        empItem.classList.remove('dragging');
    });

    return empItem;
}

// ============================================
// スタイル注入
// ============================================

/**
 * Phase 3用のスタイルを注入
 */
function injectPhase3Styles() {
    if (document.getElementById('phase3-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'phase3-styles';
    styleEl.textContent = `
        /* 役職バッジ */
        .role-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 500;
            border: 1px solid;
            margin-left: 4px;
        }

        .role-badge-compact {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            font-size: 10px;
            font-weight: 600;
            border: 1px solid;
            margin-left: 4px;
            flex-shrink: 0;
        }

        /* 未設定警告 */
        .unset-warning-badge {
            display: inline-flex;
            align-items: center;
            font-size: 12px;
            margin-left: 4px;
            cursor: help;
        }

        .has-unset-fields {
            background-color: #fef3c7 !important;
            border-left: 3px solid #f59e0b !important;
        }

        /* 兼務者表示 */
        .is-concurrent .tree-emp-name,
        .is-concurrent .mini-card-name {
            color: #6b7280;
        }

        .tree-concurrent-tag,
        .concurrent-tag {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 1px 6px;
            background: #e0e7ff;
            color: #4338ca;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            margin-left: 4px;
        }

        /* ツリービューの社員アイテム強化 */
        .tree-emp-item-compact {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }

        .tree-emp-item-compact:hover {
            background-color: #f3f4f6;
        }

        .tree-emp-item-compact.dragging {
            opacity: 0.5;
        }
    `;

    document.head.appendChild(styleEl);
}

// ============================================
// 初期化
// ============================================

/**
 * Phase 3機能を初期化
 */
function initializePhase3() {
    injectPhase3Styles();
    console.log('✅ Phase 3: Tree enhancements initialized');
}

// ============================================
// グローバルエクスポート
// ============================================

window.getEmployeesSortedByRole = getEmployeesSortedByRole;
window.getEmployeesForDepartment = getEmployeesForDepartment;
window.getRoleLevel = getRoleLevel;
window.createRoleBadge = createRoleBadge;
window.getRoleBadgeStyle = getRoleBadgeStyle;
window.isConcurrentDepartment = isConcurrentDepartment;
window.getConcurrentDepartments = getConcurrentDepartments;
window.getPrimaryDepartmentName = getPrimaryDepartmentName;
window.getConcurrentTooltip = getConcurrentTooltip;
window.getUnsetFields = getUnsetFields;
window.hasUnsetFields = hasUnsetFields;
window.getUnsetFieldsTooltip = getUnsetFieldsTooltip;
window.createUnsetWarningBadge = createUnsetWarningBadge;
window.createEnhancedEmployeeCard = createEnhancedEmployeeCard;
window.createEnhancedTreeEmployeeItem = createEnhancedTreeEmployeeItem;
window.initializePhase3 = initializePhase3;
window.ROLE_LEVEL_COLORS = ROLE_LEVEL_COLORS;

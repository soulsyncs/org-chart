/**
 * org-chart カードビューモジュール
 * Phase 7: コードモジュール分割
 *
 * カード形式での組織図表示機能を提供
 *
 * 作成日: 2026-01-25
 */

// ============================================
// カード表示レンダリング
// ============================================

/**
 * カードビューをレンダリング
 * @param {HTMLElement} container - コンテナ要素
 */
function renderCardView(container) {
    const topLevelDepts = departments.filter(d => !d.parent_id || d.parent_id === 'null');
    topLevelDepts.forEach(dept => {
        const section = createDepartmentSectionWithOrder(dept);
        container.appendChild(section);
    });
}

/**
 * 部署セクションの作成（department_order対応）
 * @param {Object} dept - 部署オブジェクト
 * @returns {HTMLElement}
 */
function createDepartmentSectionWithOrder(dept) {
    const section = document.createElement('div');
    section.className = 'card-dept-section';
    section.id = `dept-${dept.id}`;

    // 部署の社員数を計算
    const deptEmpCount = employees.filter(e => {
        if (e.department_id === dept.id) return true;
        try {
            const depts = JSON.parse(e.departments || '[]');
            return depts.some(d => d.department_id === dept.id);
        } catch (err) {
            return false;
        }
    }).length;

    // 部署ヘッダー
    const header = document.createElement('div');
    header.className = 'card-dept-header';
    header.innerHTML = `
        <div class="card-dept-title">
            <h3>${dept.name}</h3>
            <span class="card-dept-count">(${deptEmpCount}名)</span>
        </div>
        <div class="card-dept-buttons">
            <button onclick="editDepartment('${dept.id}')" class="btn-icon-sm" title="編集">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="confirmDeleteDepartment('${dept.id}')" class="btn-icon-sm btn-icon-danger" title="削除">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    section.appendChild(header);

    // ドラッグ&ドロップハンドラー（Phase 4対応）
    section.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        section.classList.add('drag-over');
    });

    section.addEventListener('dragleave', (e) => {
        if (e.target === section) {
            section.classList.remove('drag-over');
        }
    });

    section.addEventListener('drop', async (e) => {
        e.preventDefault();
        section.classList.remove('drag-over');

        if (typeof handleEnhancedDrop === 'function' && FEATURE_FLAGS && FEATURE_FLAGS.ENABLE_SHIFT_DROP_CONCURRENT) {
            await handleEnhancedDrop(e, dept.id);
        } else {
            const employeeId = e.dataTransfer.getData('text/plain');
            if (employeeId && typeof moveEmployeeToDepartment === 'function') {
                await moveEmployeeToDepartment(employeeId, dept.id);
            }
        }
    });

    // この部署の社員（主所属のみ）
    // Phase 3: 役職順ソートが有効な場合はそちらを優先、無効なら department_order でソート
    let deptEmployees = employees.filter(e => e.department_id === dept.id);
    if (typeof getRoleLevel === 'function' && FEATURE_FLAGS && FEATURE_FLAGS.ENABLE_ROLE_SORTING) {
        deptEmployees = deptEmployees.sort((a, b) => {
            const levelA = getRoleLevel(a.role_id);
            const levelB = getRoleLevel(b.role_id);
            if (levelA !== levelB) return levelB - levelA;
            return a.name.localeCompare(b.name, 'ja');
        });
    } else {
        deptEmployees = deptEmployees.sort((a, b) => (a.department_order || 0) - (b.department_order || 0));
    }

    // 社員グリッド
    if (deptEmployees.length > 0) {
        const empGrid = document.createElement('div');
        empGrid.className = 'card-employee-grid';
        empGrid.id = `employees-${dept.id}`;
        empGrid.dataset.deptId = dept.id;

        deptEmployees.forEach(emp => {
            const empCard = createEmployeeCard(emp, dept.id);
            empGrid.appendChild(empCard);
        });

        section.appendChild(empGrid);
    }

    // 子部署
    const childDepts = departments.filter(d => d.parent_id === dept.id);
    if (childDepts.length > 0) {
        const childContainer = document.createElement('div');
        childContainer.className = 'card-children-container';

        childDepts.forEach(childDept => {
            const childSection = createDepartmentSectionWithOrder(childDept);
            childContainer.appendChild(childSection);
        });

        section.appendChild(childContainer);
    }

    return section;
}

/**
 * 部署セクションの作成（基本版）
 * @param {Object} dept - 部署オブジェクト
 * @returns {HTMLElement}
 */
function createDepartmentSection(dept) {
    const section = document.createElement('div');
    section.className = 'card-dept-section';
    section.id = `dept-${dept.id}`;

    // 部署の社員数を計算
    const deptEmpCount = employees.filter(e => {
        if (e.department_id === dept.id) return true;
        try {
            const depts = JSON.parse(e.departments || '[]');
            return depts.some(d => d.department_id === dept.id);
        } catch (err) {
            return false;
        }
    }).length;

    // 部署ヘッダー
    const header = document.createElement('div');
    header.className = 'card-dept-header';
    header.innerHTML = `
        <div class="card-dept-title">
            <h3>${dept.name}</h3>
            <span class="card-dept-count">(${deptEmpCount}名)</span>
        </div>
        <div class="card-dept-buttons">
            <button onclick="editDepartment('${dept.id}')" class="btn-icon-sm" title="編集">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="confirmDeleteDepartment('${dept.id}')" class="btn-icon-sm btn-icon-danger" title="削除">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    section.appendChild(header);

    // ドラッグ&ドロップハンドラー（Phase 4対応）
    section.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        section.classList.add('drag-over');
    });

    section.addEventListener('dragleave', (e) => {
        // 子要素へのdragleaveを無視
        if (e.target === section) {
            section.classList.remove('drag-over');
        }
    });

    section.addEventListener('drop', async (e) => {
        e.preventDefault();
        section.classList.remove('drag-over');

        // Phase 4: 強化されたドロップハンドラーを使用
        if (typeof handleEnhancedDrop === 'function' && FEATURE_FLAGS && FEATURE_FLAGS.ENABLE_SHIFT_DROP_CONCURRENT) {
            await handleEnhancedDrop(e, dept.id);
        } else {
            const employeeId = e.dataTransfer.getData('text/plain');
            if (employeeId && typeof moveEmployeeToDepartment === 'function') {
                await moveEmployeeToDepartment(employeeId, dept.id);
            }
        }
    });

    // この部署の社員（主所属 + 兼務）- Phase 3: 役職順ソート対応
    let deptEmployees;
    if (typeof getEmployeesSortedByRole === 'function' && FEATURE_FLAGS && FEATURE_FLAGS.ENABLE_ROLE_SORTING) {
        deptEmployees = getEmployeesSortedByRole(dept.id);
    } else {
        deptEmployees = employees.filter(e => {
            // 主所属がこの部署
            if (e.department_id === dept.id) return true;

            // 兼務でこの部署に所属
            try {
                const depts = JSON.parse(e.departments || '[]');
                return depts.some(d => d.department_id === dept.id);
            } catch (err) {
                return false;
            }
        });
    }

    // 社員グリッド
    if (deptEmployees.length > 0) {
        const empGrid = document.createElement('div');
        empGrid.className = 'card-employee-grid';

        deptEmployees.forEach(emp => {
            const empCard = createEmployeeCard(emp, dept.id);
            empGrid.appendChild(empCard);
        });

        section.appendChild(empGrid);
    }

    // 子部署
    const childDepts = departments.filter(d => d.parent_id === dept.id);
    if (childDepts.length > 0) {
        const childContainer = document.createElement('div');
        childContainer.className = 'card-children-container';

        childDepts.forEach(childDept => {
            const childSection = createDepartmentSection(childDept);
            childContainer.appendChild(childSection);
        });

        section.appendChild(childContainer);
    }

    return section;
}

/**
 * 社員カードの作成（超コンパクト版：名前＋役職のみ）
 * @param {Object} emp - 社員オブジェクト
 * @param {string} currentDeptId - 現在の部署ID
 * @returns {HTMLElement}
 */
function createEmployeeCard(emp, currentDeptId = null) {
    // Phase 3: 強化された社員カードを使用（フィーチャーフラグ有効時）
    if (typeof createEnhancedEmployeeCard === 'function' && FEATURE_FLAGS &&
        (FEATURE_FLAGS.ENABLE_ROLE_BADGES || FEATURE_FLAGS.ENABLE_UNSET_HIGHLIGHT)) {
        return createEnhancedEmployeeCard(emp, currentDeptId);
    }

    // フォールバック: 従来の実装
    const card = document.createElement('div');
    card.className = 'employee-card-mini';
    card.dataset.empId = emp.id;

    // 兼務先で表示されているかチェック
    const isConcurrent = currentDeptId && emp.department_id !== currentDeptId;

    // 兼務先での役職を取得
    let displayPosition = emp.position || '';
    if (isConcurrent) {
        try {
            const depts = JSON.parse(emp.departments || '[]');
            const concurrentDept = depts.find(d => d.department_id === currentDeptId);
            if (concurrentDept && concurrentDept.position) {
                displayPosition = concurrentDept.position;
            }
        } catch(e) {}
    }

    // 雇用形態のマーカー色
    const typeColor = emp.employment_type === '社員' ? '#3b82f6' :
                      emp.employment_type === '業務委託' ? '#f59e0b' : '#10b981';

    // 名前とアバター
    const avatar = emp.avatar ?
        `<img src="${emp.avatar}" class="emp-avatar-mini">` :
        `<div class="emp-avatar-mini emp-avatar-default">${emp.name.charAt(0)}</div>`;

    card.innerHTML = `
        <div class="emp-marker" style="background: ${typeColor}"></div>
        ${avatar}
        <div class="emp-info-mini">
            <span class="emp-name-mini">${emp.name}</span>
            ${displayPosition ? `<span class="emp-position-mini">${displayPosition}</span>` : ''}
            ${isConcurrent ? '<span class="concurrent-badge">[兼]</span>' : ''}
        </div>
    `;

    // クリックイベント
    card.onclick = () => showEmployeeDetail(emp.id);

    // ドラッグ可能に設定
    card.draggable = true;
    card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', emp.id);
    });

    card.addEventListener('dragend', (e) => {
        card.classList.remove('dragging');
    });

    return card;
}

/**
 * コンパクト社員カードの作成
 * @param {Object} emp - 社員オブジェクト
 * @param {string} deptId - 部署ID
 * @returns {HTMLElement}
 */
function createCompactEmployeeCard(emp, deptId) {
    const isMainDept = emp.department_id === deptId;
    const position = isMainDept ? emp.position : getConcurrentPosition(emp, deptId);

    const card = document.createElement('div');
    card.className = 'bg-white p-3 rounded-lg shadow-sm border-l-4 border-purple-500 hover:shadow-md transition cursor-pointer';
    card.onclick = () => showEmployeeDetail(emp.id);

    const avatar = emp.avatar ?
        `<img src="${emp.avatar}" class="w-10 h-10 rounded-full object-cover">` :
        `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">${emp.name.charAt(0)}</div>`;

    card.innerHTML = `
        <div class="flex items-center gap-3">
            ${avatar}
            <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-800 truncate">${emp.name}</p>
                <p class="text-xs text-gray-600">${position}</p>
                ${!isMainDept ? '<span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded mt-1">兼務</span>' : ''}
            </div>
        </div>
    `;

    return card;
}

// ============================================
// 部署内ドラッグ&ドロップ（SortableJS）
// ============================================

/**
 * 部署内のドラッグ&ドロップを初期化
 */
function initializeDepartmentSorting() {
    const deptSections = document.querySelectorAll('.card-dept-section');

    deptSections.forEach(section => {
        const empGrid = section.querySelector('.card-employee-grid');
        if (!empGrid) return;

        // SortableJSの初期化
        if (typeof Sortable !== 'undefined') {
            Sortable.create(empGrid, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                group: false,
                onEnd: async (evt) => {
                    await handleEmployeeReorder(evt);
                }
            });
        }
    });
}

/**
 * 社員の順番変更を処理
 * @param {Object} evt - Sortableイベント
 */
async function handleEmployeeReorder(evt) {
    const empGrid = evt.from;
    const deptId = empGrid.closest('.card-dept-section').id.replace('dept-', '');

    // 新しい順番を計算
    const items = empGrid.querySelectorAll('.employee-card-mini');
    const updatePromises = [];

    items.forEach((item, index) => {
        const empId = item.dataset.empId;
        const employee = employees.find(e => e.id === empId);

        if (employee && (employee.department_order || 0) !== index) {
            const updatedEmployee = {...employee, department_order: index};

            // Supabaseに更新
            const updatePromise = fetch(`${SUPABASE_REST_URL}/employees?id=eq.${empId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify(updatedEmployee)
            }).then(response => {
                if (!response.ok) throw new Error(`Failed to update employee ${empId}`);
                const idx = employees.findIndex(e => e.id === empId);
                if (idx !== -1) {
                    employees[idx] = updatedEmployee;
                }
                return updatedEmployee;
            });

            updatePromises.push(updatePromise);
        }
    });

    if (updatePromises.length === 0) return;

    try {
        await Promise.all(updatePromises);

        // 変更履歴に記録
        const dept = departments.find(d => d.id === deptId);
        const orderMap = {};
        items.forEach((item, index) => {
            orderMap[item.dataset.empId] = index;
        });

        if (typeof addChangeHistory === 'function') {
            await addChangeHistory(
                '部署内順番変更',
                'employee_order',
                deptId,
                null,
                orderMap,
                `${dept.name}内の社員順番を変更しました（ドラッグ&ドロップ）`
            );
        }

        showNotification('社員の順番を更新しました', 'success');
    } catch (error) {
        console.error('順番更新エラー:', error);
        showNotification('順番の更新に失敗しました。ページを再読み込みしてください。', 'error');
        if (typeof loadData === 'function') {
            await loadData();
        }
    }
}

/**
 * 部署内の社員をdepartment_orderでソート
 * @param {string} deptId - 部署ID
 * @returns {Array}
 */
function sortEmployeesByDepartmentOrder(deptId) {
    const deptEmps = employees.filter(e => e.department_id === deptId);
    return deptEmps.sort((a, b) => {
        const orderA = a.department_order || 0;
        const orderB = b.department_order || 0;
        return orderA - orderB;
    });
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * 部署の社員数を取得
 * @param {string} deptId - 部署ID
 * @returns {number}
 */
function getEmployeeCountInDepartment(deptId) {
    return employees.filter(e => {
        if (e.department_id === deptId) return true;
        try {
            const depts = JSON.parse(e.departments || '[]');
            return depts.some(d => d.department_id === deptId);
        } catch(err) {
            return false;
        }
    }).length;
}

/**
 * 兼務先での役職を取得
 * @param {Object} emp - 社員オブジェクト
 * @param {string} deptId - 部署ID
 * @returns {string}
 */
function getConcurrentPosition(emp, deptId) {
    try {
        const depts = JSON.parse(emp.departments || '[]');
        const dept = depts.find(d => d.department_id === deptId);
        return dept ? dept.position : emp.position;
    } catch(err) {
        return emp.position;
    }
}

// ============================================
// グローバルエクスポート
// ============================================

window.renderCardView = renderCardView;
window.createDepartmentSectionWithOrder = createDepartmentSectionWithOrder;
window.createDepartmentSection = createDepartmentSection;
window.createEmployeeCard = createEmployeeCard;
window.createCompactEmployeeCard = createCompactEmployeeCard;
window.initializeDepartmentSorting = initializeDepartmentSorting;
window.handleEmployeeReorder = handleEmployeeReorder;
window.sortEmployeesByDepartmentOrder = sortEmployeesByDepartmentOrder;
window.getEmployeeCountInDepartment = getEmployeeCountInDepartment;
window.getConcurrentPosition = getConcurrentPosition;

console.log('✅ views/card-view.js loaded');

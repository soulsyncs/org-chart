/**
 * org-chart ツリービューモジュール
 * Phase 7: コードモジュール分割
 *
 * ツリー形式での組織図表示機能を提供
 *
 * 作成日: 2026-01-25
 */

// ============================================
// ツリー表示レンダリング
// ============================================

/**
 * ツリービューをレンダリング
 * @param {HTMLElement} container - コンテナ要素
 */
function renderTreeView(container) {
    container.className = 'tree-view-container';

    const tree = document.createElement('div');
    tree.className = 'tree-compact';

    const topLevelDepts = departments.filter(d => !d.parent_id || d.parent_id === 'null');
    topLevelDepts.forEach(dept => {
        const treeNode = createTreeNodeCompact(dept);
        tree.appendChild(treeNode);
    });

    container.appendChild(tree);
}

/**
 * コンパクトなツリーノード作成
 * @param {Object} dept - 部署オブジェクト
 * @returns {HTMLElement}
 */
function createTreeNodeCompact(dept) {
    const node = document.createElement('div');
    node.className = 'tree-node-compact';

    // 部署ボックス（コンパクト）
    const deptBox = document.createElement('div');
    deptBox.className = 'tree-dept-box-compact';
    deptBox.dataset.deptId = dept.id;
    deptBox.innerHTML = `<span class="tree-dept-name-compact">${dept.name}</span>`;
    deptBox.onclick = () => showDepartmentDetail(dept.id);

    // ドロップゾーンとして設定
    deptBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        deptBox.classList.add('drag-over');
    });

    deptBox.addEventListener('dragleave', (e) => {
        deptBox.classList.remove('drag-over');
    });

    deptBox.addEventListener('drop', async (e) => {
        e.preventDefault();
        deptBox.classList.remove('drag-over');

        // Phase 4: 強化されたドロップハンドラーを使用
        if (typeof handleEnhancedDrop === 'function' && FEATURE_FLAGS && FEATURE_FLAGS.ENABLE_SHIFT_DROP_CONCURRENT) {
            await handleEnhancedDrop(e, dept.id);
        } else {
            const employeeId = e.dataTransfer.getData('text/plain');
            const targetDeptId = dept.id;
            await moveEmployeeToDepartment(employeeId, targetDeptId);
        }
    });

    node.appendChild(deptBox);

    // ノード全体もドロップゾーンとして設定（より広い範囲でドロップ可能に）
    node.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        deptBox.classList.add('drag-over');
    });

    node.addEventListener('dragleave', (e) => {
        // 子要素へのleaveを無視
        if (!node.contains(e.relatedTarget)) {
            deptBox.classList.remove('drag-over');
        }
    });

    node.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        deptBox.classList.remove('drag-over');

        const employeeId = e.dataTransfer.getData('text/plain');
        console.log('📦 Drop event:', { employeeId, targetDept: dept.name, deptId: dept.id });
        if (!employeeId) return;

        // 既にこの部署の社員かチェック
        const employee = (window.employees || employees).find(emp => emp.id === employeeId);
        console.log('📋 Found employee:', employee ? employee.name : 'NOT FOUND', 'Current dept:', employee?.department_id, 'Target:', dept.id);

        if (employee && employee.department_id === dept.id) {
            console.log('⏭️ Same department, skipping');
            return; // 同じ部署なのでスキップ
        }

        console.log('🔄 Calling moveEmployeeToDepartment...');
        if (typeof handleEnhancedDrop === 'function' && FEATURE_FLAGS && FEATURE_FLAGS.ENABLE_SHIFT_DROP_CONCURRENT) {
            await handleEnhancedDrop(e, dept.id);
        } else if (typeof moveEmployeeToDepartment === 'function') {
            console.log('✅ moveEmployeeToDepartment exists, calling...');
            await moveEmployeeToDepartment(employeeId, dept.id);
        }
    });

    // 社員リスト（Phase 3: 役職順ソート対応）
    let deptEmployees;
    if (typeof getEmployeesSortedByRole === 'function' && FEATURE_FLAGS && FEATURE_FLAGS.ENABLE_ROLE_SORTING) {
        deptEmployees = getEmployeesSortedByRole(dept.id);
    } else {
        deptEmployees = employees.filter(e => {
            if (e.department_id === dept.id) return true;
            try {
                const depts = JSON.parse(e.departments || '[]');
                return depts.some(d => d.department_id === dept.id);
            } catch(err) {
                return false;
            }
        });
    }

    if (deptEmployees.length > 0) {
        const empList = document.createElement('div');
        empList.className = 'tree-emp-list-compact';

        deptEmployees.forEach(emp => {
            // Phase 3: 強化された社員アイテムを使用
            let empItem;
            if (typeof createEnhancedTreeEmployeeItem === 'function') {
                empItem = createEnhancedTreeEmployeeItem(emp, dept.id);
            } else {
                // フォールバック: 従来の実装
                empItem = createTreeEmployeeItem(emp, dept.id);
            }

            empList.appendChild(empItem);
        });

        node.appendChild(empList);
    }

    // 子部署（sort_order順にソート）
    const childDepts = departments
        .filter(d => d.parent_id === dept.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    if (childDepts.length > 0) {
        const children = document.createElement('div');
        children.className = 'tree-children-compact';

        childDepts.forEach(child => {
            const childNode = createTreeNodeCompact(child);
            children.appendChild(childNode);
        });

        node.appendChild(children);
    }

    return node;
}

/**
 * ツリー用社員アイテムの作成（基本版）
 * @param {Object} emp - 社員オブジェクト
 * @param {string} deptId - 部署ID
 * @returns {HTMLElement}
 */
function createTreeEmployeeItem(emp, deptId) {
    const empItem = document.createElement('div');
    empItem.className = 'tree-emp-item-compact';
    empItem.draggable = true;
    empItem.dataset.empId = emp.id;
    empItem.innerHTML = `<span class="tree-emp-name">${emp.name}</span>`;

    empItem.onclick = (e) => {
        if (!empItem.classList.contains('dragging')) {
            showEmployeeDetail(emp.id);
        }
    };

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
// 部署詳細・移動処理
// ============================================

/**
 * 部署詳細表示
 * @param {string} deptId - 部署ID
 */
function showDepartmentDetail(deptId) {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;

    const empCount = employees.filter(e => e.department_id === deptId).length;

    // モーダルがあればそちらを使用、なければアラート
    if (typeof showDepartmentDetailModal === 'function') {
        showDepartmentDetailModal(dept, empCount);
    } else {
        alert(`部署名: ${dept.name}\n社員数: ${empCount}名\n\n編集・削除はカード表示から行えます`);
    }
}

/**
 * 社員の部署移動処理（ドラッグ&ドロップ用）
 * @param {string} employeeId - 社員ID
 * @param {string} targetDeptId - 移動先部署ID
 */
async function moveEmployeeToDepartment(employeeId, targetDeptId) {
    console.log('🚚 moveEmployeeToDepartment called:', { employeeId, targetDeptId });

    // window経由でグローバル変数にアクセス
    const empArray = window.employees || employees;
    const deptArray = window.departments || departments;

    console.log('📊 Data available:', { employees: empArray.length, departments: deptArray.length });

    const employee = empArray.find(e => e.id === employeeId);
    const targetDept = deptArray.find(d => d.id === targetDeptId);

    console.log('🔍 Found:', { employee: employee?.name, targetDept: targetDept?.name });

    if (!employee || !targetDept) {
        console.error('❌ Employee or department not found!');
        showNotification('社員または部署が見つかりません', 'error');
        return;
    }

    // 同じ部署への移動はスキップ
    if (employee.department_id === targetDeptId) {
        showNotification('既に同じ部署に所属しています', 'info');
        return;
    }

    const currentDept = deptArray.find(d => d.id === employee.department_id);

    console.log('💬 Showing confirmation modal...');
    console.log('📌 showConfirmModal available:', typeof showConfirmModal);

    // 確認モーダル
    const confirmMsg = `
        <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-3">社員を移動しますか？</h3>
            <dl class="space-y-2">
                <div class="flex"><dt class="font-semibold w-32">氏名:</dt><dd>${employee.name}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">移動元:</dt><dd>${currentDept ? currentDept.name : '不明'}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">移動先:</dt><dd class="text-blue-600 font-bold">${targetDept.name}</dd></div>
            </dl>
            <p class="mt-3 text-sm text-gray-600">※主所属部署が変更されます</p>
        </div>
    `;

    console.log('⏳ Calling showConfirmModal...');
    console.log('📌 window.showConfirmModal available:', typeof window.showConfirmModal);

    if (typeof window.showConfirmModal !== 'function') {
        console.error('❌ showConfirmModal is not available!');
        showNotification('確認モーダルが利用できません', 'error');
        return;
    }

    const result = await window.showConfirmModal(confirmMsg);
    console.log('✅ Confirmation result:', result);
    if (!result) {
        console.log('❌ User cancelled');
        return;
    }

    try {
        // 移動前のデータを保存
        const beforeData = { ...employee };

        // departmentsフィールド（JSON）を更新
        let updatedDepartments = [];
        try {
            // 既存のdepartmentsを解析
            const existingDepts = JSON.parse(employee.departments || '[]');

            // 元の主所属を削除し、新しい主所属を追加
            updatedDepartments = existingDepts.filter(d => d.department_id !== employee.department_id);

            // 新しい主所属を先頭に追加
            updatedDepartments.unshift({
                department_id: targetDeptId,
                position: employee.position || '',
                is_main: true
            });

            // 兼務の is_main を false に設定
            updatedDepartments = updatedDepartments.map((d, index) => ({
                ...d,
                is_main: index === 0
            }));
        } catch (err) {
            // departmentsがない場合は新規作成
            updatedDepartments = [{
                department_id: targetDeptId,
                position: employee.position || '',
                is_main: true
            }];
        }

        // 部署移動を実行（department_id と departments の両方を更新）
        const response = await fetch(`${SUPABASE_REST_URL}/employees?id=eq.${employeeId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                department_id: targetDeptId,
                departments: JSON.stringify(updatedDepartments)
            })
        });

        if (!response.ok) {
            throw new Error('部署移動に失敗しました');
        }

        // 変更履歴に記録
        if (typeof window.addChangeHistory === 'function') {
            await window.addChangeHistory('社員部署移動', '社員', beforeData, {
                ...beforeData,
                department_id: targetDeptId
            });
        }

        showNotification(`${employee.name}さんを${targetDept.name}に移動しました`, 'success');

        // データ再読み込み
        if (typeof window.loadData === 'function') {
            await window.loadData();
        }

    } catch (error) {
        console.error('部署移動エラー:', error);
        showNotification('部署移動に失敗しました', 'error');
    }
}

// ============================================
// グローバルエクスポート
// ============================================

window.renderTreeView = renderTreeView;
window.createTreeNodeCompact = createTreeNodeCompact;
window.createTreeEmployeeItem = createTreeEmployeeItem;
window.showDepartmentDetail = showDepartmentDetail;
window.moveEmployeeToDepartment = moveEmployeeToDepartment;

console.log('✅ views/tree-view.js loaded');

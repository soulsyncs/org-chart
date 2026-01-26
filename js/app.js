// ============================================
// グローバル変数（state.jsで定義済み、後方互換性のため再宣言）
// Phase 7: 将来的にはstate.jsの関数を使用することを推奨
// ============================================

// state.jsで初期化済みのため、ここでは再宣言しない
// departments, employees, changeHistory, roles, currentViewMode, hasChatworkAccountIdColumn
// これらはstate.jsからwindowオブジェクト経由でアクセス可能

// スキーマチェック関数
async function checkSchemaExtensions() {
    try {
        // 1件取得してカラム存在を確認
        const response = await fetch(`${SUPABASE_REST_URL}/employees?select=chatwork_account_id&limit=1`, {
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
            }
        });
        if (response.ok) {
            window.hasChatworkAccountIdColumn = true;
            if (typeof debugLog === 'function') debugLog('✅ chatwork_account_id column detected');
        }
    } catch (e) {
        if (typeof debugLog === 'function') debugLog('ℹ️ chatwork_account_id column not yet added');
    }
}

// 権限管理（viewModeはstate.jsで定義済み）

// Supabase設定はconfig.jsで定義済み（SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_REST_URL）

// URLパラメータをチェック
function checkViewMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    
    if (mode === 'view') {
        window.viewMode = 'view';
        // 閲覧専用モードのスタイルを適用
        document.body.classList.add('view-only-mode');
        showNotification('閲覧専用モードで表示しています', 'info');
    }
    
    applyViewModeStyles();
}

// 閲覧専用モードのスタイル適用
function applyViewModeStyles() {
    // 既存のスタイルを削除
    const existingStyle = document.getElementById('view-only-styles');
    if (existingStyle) existingStyle.remove();
    document.body.classList.remove('view-only-mode');

    if (window.viewMode === 'view') {
        // bodyにクラスを追加
        document.body.classList.add('view-only-mode');

        // 編集ボタンを全て非表示にするCSS
        const style = document.createElement('style');
        style.id = 'view-only-styles';
        style.textContent = `
            /* 編集系ボタンを全て非表示 */
            .view-only-mode button[class*="bg-red"],
            .view-only-mode button[class*="bg-blue"],
            .view-only-mode button[class*="bg-green"],
            .view-only-mode button[class*="bg-yellow"],
            .view-only-mode button[class*="bg-orange"],
            .view-only-mode button[class*="bg-teal"],
            .view-only-mode [onclick*="Add"],
            .view-only-mode [onclick*="add"],
            .view-only-mode [onclick*="Edit"],
            .view-only-mode [onclick*="edit"],
            .view-only-mode [onclick*="Delete"],
            .view-only-mode [onclick*="delete"],
            .view-only-mode [onclick*="Move"],
            .view-only-mode [onclick*="move"],
            .view-only-mode [onclick*="Import"],
            .view-only-mode [onclick*="import"],
            .view-only-mode [onclick*="sync"],
            .view-only-mode [onclick*="Sync"] {
                display: none !important;
            }

            /* 許可するボタン（閲覧系）を再表示 */
            .view-only-mode button[onclick*="refresh"],
            .view-only-mode button[onclick*="Refresh"],
            .view-only-mode button[onclick*="export"],
            .view-only-mode button[onclick*="Export"],
            .view-only-mode button[onclick*="pdf"],
            .view-only-mode button[onclick*="PDF"],
            .view-only-mode button[onclick*="filter"],
            .view-only-mode button[onclick*="Filter"],
            .view-only-mode button[onclick*="search"],
            .view-only-mode button[onclick*="Search"],
            .view-only-mode button[onclick*="view"],
            .view-only-mode button[onclick*="View"],
            .view-only-mode button[onclick*="close"],
            .view-only-mode button[onclick*="Close"],
            .view-only-mode button[onclick*="setViewMode"],
            .view-only-mode button[class*="bg-gray"] {
                display: inline-flex !important;
            }

            /* モーダル内の編集・削除ボタンを非表示 */
            .view-only-mode .modal button:not([onclick*="close"]):not([onclick*="Close"]) {
                display: none !important;
            }
            .view-only-mode .modal button[onclick*="close"],
            .view-only-mode .modal button[onclick*="Close"],
            .view-only-mode .modal button:contains("閉じる") {
                display: inline-flex !important;
            }

            /* ヘッダーをグレーに */
            .view-only-mode header {
                background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%) !important;
            }

            /* ドラッグ&ドロップを無効化 */
            .view-only-mode [draggable="true"] {
                pointer-events: none;
                cursor: default;
            }
        `;
        document.head.appendChild(style);

        // JavaScriptでボタンを直接非表示（より確実）
        hideEditButtons();

        // ヘッダーに閲覧専用バッジを追加
        setTimeout(() => {
            const header = document.querySelector('header h1');
            if (header && !header.querySelector('.view-only-badge')) {
                const badge = document.createElement('span');
                badge.className = 'view-only-badge';
                badge.style.cssText = 'background: #ef4444; color: white; padding: 4px 12px; border-radius: 6px; font-size: 14px; margin-left: 10px;';
                badge.textContent = '閲覧専用';
                header.appendChild(badge);
            }
        }, 100);
    }
}

// 編集ボタンを直接非表示にする
function hideEditButtons() {
    if (window.viewMode !== 'view') return;

    // テキストで編集系ボタンを検索して非表示
    const editKeywords = ['追加', '編集', '削除', '異動', '同期', 'インポート'];
    const allowKeywords = ['閉じる', 'エクスポート', 'PDF', '統計', '監査', '品質', '変更履歴', 'Chatwork', '閲覧'];

    document.querySelectorAll('button').forEach(btn => {
        const text = btn.textContent || '';
        const isEditButton = editKeywords.some(keyword => text.includes(keyword));
        const isAllowedButton = allowKeywords.some(keyword => text.includes(keyword));

        if (isEditButton && !isAllowedButton) {
            btn.style.display = 'none';
        }
    });
}

// MutationObserverで動的に追加されるボタンも非表示に
const viewModeObserver = new MutationObserver(() => {
    if (window.viewMode === 'view') {
        hideEditButtons();
    }
});
viewModeObserver.observe(document.body, { childList: true, subtree: true });

// URLコピー機能を追加
function copyViewOnlyURL() {
    const baseURL = window.location.href.split('?')[0];
    const viewOnlyURL = baseURL + '?mode=view';
    
    navigator.clipboard.writeText(viewOnlyURL).then(() => {
        showNotification('閲覧専用URLをコピーしました', 'success');
    }).catch(() => {
        showNotification('URLのコピーに失敗しました', 'error');
    });
}



// データの読み込み
async function loadData() {
    try {
        // 部署データの読み込み
        const deptResponse = await fetch(`${SUPABASE_REST_URL}/departments?limit=100`, {
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        });
        const deptData = await deptResponse.json();
        departments = deptData || [];

        // 社員データの読み込み
        const empResponse = await fetch(`${SUPABASE_REST_URL}/employees?limit=200`, {
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        });
        const empData = await empResponse.json();
        employees = empData || [];

        // 変更履歴の読み込み（テーブルが存在しない場合はスキップ）
        try {
            const historyResponse = await fetch(`${SUPABASE_REST_URL}/change_history?limit=100&order=created_at.desc`, {
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            });
            if (historyResponse.ok) {
                const historyData = await historyResponse.json();
                changeHistory = Array.isArray(historyData) ? historyData : [];
            } else {
                // テーブルが存在しない場合などはエラーを無視
                if (typeof debugLog === 'function') debugLog('change_history table not available, skipping...');
                changeHistory = [];
            }
        } catch (err) {
            if (typeof debugLog === 'function') debugLog('change_history load skipped:', err.message);
            changeHistory = [];
        }

        // 役職データの読み込み（Phase 3.5対応）
        try {
            const rolesResponse = await fetch(`${SUPABASE_REST_URL}/roles?is_active=eq.true&order=level.desc,display_order.asc`, {
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            });
            if (rolesResponse.ok) {
                const rolesData = await rolesResponse.json();
                roles = Array.isArray(rolesData) ? rolesData : [];
                if (typeof debugLog === 'function') debugLog('Loaded roles:', roles.length, 'items');
            } else {
                if (typeof debugLog === 'function') debugLog('roles table not available, skipping...');
                roles = [];
            }
        } catch (err) {
            if (typeof debugLog === 'function') debugLog('roles load skipped:', err.message);
            roles = [];
        }

        // window変数を更新（他モジュールからアクセス可能にする）
        window.employees = employees;
        window.departments = departments;
        window.roles = roles;

        // UIの更新
        updateStatistics();
        renderOrganizationChart();
        populateDepartmentSelects();
        populateEmployeeSelects();
        populateRoleSelects();
    } catch (error) {
        console.error('データの読み込みエラー:', error);
        showNotification('データの読み込みに失敗しました', 'error');
    }
}

// 統計情報の更新
function updateStatistics() {
    const totalEmps = employees.length;
    const regularEmps = employees.filter(e => e.employment_type === '社員').length;
    const contractorEmps = employees.filter(e => e.employment_type === '業務委託').length;
    const totalDepts = departments.length;

    document.getElementById('totalEmployees').textContent = totalEmps;
    document.getElementById('regularEmployees').textContent = regularEmps;
    document.getElementById('contractors').textContent = contractorEmps;
    document.getElementById('totalDepartments').textContent = totalDepts;
}

// 組織図のレンダリング
function renderOrganizationChart() {
    const container = document.getElementById('chartContainer');
    container.innerHTML = '';

    // 表示モードに応じてレンダリング
    if (window.currentViewMode === 'card') {
        // カード表示（デフォルト）
        const topLevelDepts = departments
            .filter(d => !d.parent_id || d.parent_id === 'null')
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        topLevelDepts.forEach(dept => {
            const deptSection = createDepartmentSectionWithOrder(dept);
            container.appendChild(deptSection);
        });
        // ドラッグ&ドロップの初期化
        setTimeout(() => {
            initializeDragAndDrop();
            initializeDepartmentSorting();
        }, 100);
    } else if (window.currentViewMode === 'tree') {
        renderTreeView(container);
    } else if (window.currentViewMode === 'list') {
        renderListView(container);
    }

    // 部署エディターのイベントを再設定（ダブルクリック・右クリック）
    if (typeof attachDepartmentEditorEvents === 'function') {
        setTimeout(() => {
            attachDepartmentEditorEvents();
        }, 150);
    }
}

// ============================================
// ビュー関数（Phase 7: views/ モジュールに移動済み）
// - views/card-view.js: createDepartmentSectionWithOrder, createDepartmentSection, createEmployeeCard, etc.
// - views/tree-view.js: renderTreeView, createTreeNodeCompact, moveEmployeeToDepartment
// - views/list-view.js: renderListView
// ============================================

// 部署セレクトボックスの更新
function populateDepartmentSelects() {
    const selects = ['empDepartment', 'deptParent', 'moveEmpDepartment', 'editEmpDepartment', 'editDeptParent', 'filterDepartment'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        const currentValue = select.value;
        select.innerHTML = '';
        
        if (selectId === 'deptParent' || selectId === 'editDeptParent') {
            const noneOption = document.createElement('option');
            noneOption.value = '';
            noneOption.textContent = 'なし（トップレベル）';
            select.appendChild(noneOption);
        }
        
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            select.appendChild(option);
        });
        
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

// 社員セレクトボックスの更新
function populateEmployeeSelects() {
    const select = document.getElementById('moveEmpId');
    if (!select) return;

    select.innerHTML = '';

    employees.forEach(emp => {
        const dept = departments.find(d => d.id === emp.department_id);
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = `${emp.name} (${dept ? dept.name : '未所属'})`;
        select.appendChild(option);
    });
}

// 役職セレクトボックスの更新（Phase 3.5対応）
function populateRoleSelects() {
    const selects = ['empRoleId', 'editEmpRoleId'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">役職を選択...</option>';

        // rolesテーブルから読み込んだデータを使用
        // rolesがない場合（マイグレーション前）はpositionフィールドにフォールバック
        if (roles && roles.length > 0) {
            roles.forEach(role => {
                const option = document.createElement('option');
                option.value = role.id;
                option.textContent = `${role.name}（Level ${role.level}）`;
                select.appendChild(option);
            });
        } else {
            // フォールバック: 既存のpositionから一意な役職を抽出
            const positionSet = new Set();
            employees.forEach(e => {
                if (e.position) positionSet.add(e.position);
            });
            Array.from(positionSet).forEach(pos => {
                const option = document.createElement('option');
                option.value = pos;  // rolesがない場合はposition名をそのまま使用
                option.textContent = pos;
                select.appendChild(option);
            });
        }

        if (currentValue) {
            select.value = currentValue;
        }
    });
}

// 役職IDから役職名を取得するヘルパー関数
function getRoleName(roleId) {
    if (!roleId) return '';
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : roleId;  // 見つからない場合はIDをそのまま返す
}

// 社員追加
async function addEmployee(event) {
    event.preventDefault();

    // 権限チェック
    if (typeof canEdit === 'function' && !canEdit('社員追加')) {
        return;
    }

    // バリデーション: 必須項目チェック
    const requiredFields = [
        { id: 'empName', label: '氏名' },
        { id: 'empDepartment', label: '主所属部署' },
        { id: 'empType', label: '雇用形態' }
    ];
    
    let hasError = false;
    
    // 既存のエラーメッセージをクリア
    document.querySelectorAll('.validation-error').forEach(el => el.remove());
    
    // 各必須項目をチェック
    requiredFields.forEach(field => {
        const input = document.getElementById(field.id);
        const value = input.value.trim();
        
        if (!value) {
            hasError = true;
            
            // エラーメッセージを表示
            const errorMsg = document.createElement('span');
            errorMsg.className = 'validation-error text-red-600 text-sm ml-2';
            errorMsg.textContent = '※必須項目です。入力してください';
            
            // 入力フィールドの後ろに挿入
            if (input.parentElement) {
                input.parentElement.appendChild(errorMsg);
            } else {
                input.insertAdjacentElement('afterend', errorMsg);
            }
            
            // 入力フィールドを赤枠にする
            input.classList.add('border-red-500', 'border-2');
        } else {
            // エラーがない場合は赤枠を削除
            input.classList.remove('border-red-500', 'border-2');
        }
    });
    
    // エラーがある場合は処理を中断
    if (hasError) {
        showNotification('必須項目を入力してください', 'error');
        return;
    }
    
    // 写真のアップロード処理
    let avatarUrl = '';
    const avatarFile = document.getElementById('empAvatar').files[0];
    if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile);
    }
    
    // 兼務部署の取得
    const additionalDepts = getAdditionalDepartments(
        '#additionalDepartments',
        '[data-add-dept-select]',
        '[data-add-dept-position]'
    );
    
    // 主部署を含む全部署リスト
    const mainDeptId = document.getElementById('empDepartment').value;

    // 役職の取得（Phase 3.5対応）
    let mainRoleId = null;
    let mainPosition = '';
    const addRoleSelect = document.getElementById('empRoleId');
    const addPositionInput = document.getElementById('empPosition');

    if (addRoleSelect && addRoleSelect.value) {
        mainRoleId = addRoleSelect.value;
        mainPosition = getRoleName(mainRoleId);
    } else if (addPositionInput) {
        mainPosition = addPositionInput.value;
    }

    const allDepartments = [
        { department_id: mainDeptId, position: mainPosition, role_id: mainRoleId, is_main: true },
        ...additionalDepts.map(d => ({ ...d, is_main: false }))
    ];
    
    // スキル・資格の処理
    const skills = getSelectedSkills('empSkillsCheckboxes', 'empSkillsOther');
    const certificationsText = document.getElementById('empCertifications').value;
    const certifications = certificationsText ? certificationsText.split(',').map(s => s.trim()).filter(s => s) : [];
    
    const employeeData = {
        name: document.getElementById('empName').value,
        department_id: mainDeptId,
        departments: JSON.stringify(allDepartments),
        position: mainPosition || null,
        role_id: mainRoleId,  // Phase 3.5対応
        email_company: document.getElementById('empEmailCompany').value || null,
        email_gmail: document.getElementById('empEmailGmail').value || null,
        email_shared: document.getElementById('empEmailShared').value || null,
        phone: document.getElementById('empPhone').value || null,
        employment_type: document.getElementById('empType').value || '社員',
        birthday: document.getElementById('empBirthday').value || null,
        profile_url: document.getElementById('empProfileUrl').value || null,
        avatar: avatarUrl || null,
        hire_date: document.getElementById('empHireDate').value || null,
        resignation_date: document.getElementById('empResignationDate').value || null,
        is_active: document.getElementById('empIsActive').checked,
        skills: JSON.stringify(skills),
        certifications: JSON.stringify(certifications),
        evaluation: document.getElementById('empEvaluation').value || '-',
        goal_achievement: parseInt(document.getElementById('empGoalAchievement').value) || 0,
        notes: document.getElementById('empNotes').value || null
    };

    // ソウルくん連携: chatwork_account_idカラムが存在する場合のみ追加
    if (window.hasChatworkAccountIdColumn) {
        employeeData.chatwork_account_id = document.getElementById('empChatworkId').value || null;
    }
    
    // 誕生日をGoogle Calendarに同期
    if (employeeData.birthday) {
        await syncBirthdayToGoogleCalendar(employeeData.name, employeeData.birthday);
    }

    // プレビュー確認
    const dept = departments.find(d => d.id === employeeData.department_id);
    const confirmMsg = `
        <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-3">以下の内容で社員を追加しますか？</h3>
            <dl class="space-y-2">
                <div class="flex"><dt class="font-semibold w-32">氏名:</dt><dd>${employeeData.name}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">部署:</dt><dd>${dept.name}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">役職:</dt><dd>${employeeData.position || '-'}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">雇用形態:</dt><dd>${employeeData.employment_type}</dd></div>
            </dl>
        </div>
    `;

    // 追加モーダルを先に閉じる
    closeModal('addEmployeeModal');
    
    // 少し遅延させてから確認ダイアログを表示
    setTimeout(() => {
        showConfirmModalCallback(confirmMsg, async () => {
            try {
                const response = await fetch(`${SUPABASE_REST_URL}/employees`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'apikey': SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(employeeData)
                });

                if (response.ok) {
                    const addedEmployee = await response.json();
                    // 変更履歴を記録
                    await addChangeHistory('社員追加', 'employee', addedEmployee[0].id, null, addedEmployee[0],
                        `${employeeData.name}を${dept.name}に追加しました`);

                    // Phase 5: 監査ログ記録
                    if (typeof logEmployeeAction === 'function') {
                        await logEmployeeAction('create', addedEmployee[0], null);
                    }

                    // Chatwork通知
                    notifyEmployeeAdded(addedEmployee[0]);

                    document.getElementById('addEmployeeForm').reset();
                    document.getElementById('avatarPreview').innerHTML = '';
                    document.getElementById('additionalDepartments').innerHTML = '';
                    await loadData();
                    showNotification('社員を追加しました', 'success');
                } else {
                    const errorText = await response.text();
                    console.error('社員追加エラー:', errorText);
                    throw new Error('追加に失敗しました: ' + errorText);
                }
            } catch (error) {
                console.error('社員追加エラー:', error);
                showNotification('社員の追加に失敗しました', 'error');
            }
        });
    }, 100);
}

// 部署追加
async function addDepartment(event) {
    event.preventDefault();

    // 権限チェック
    if (typeof canEdit === 'function' && !canEdit('部署追加')) {
        return;
    }

    const departmentData = {
        name: document.getElementById('deptName').value,
        parent_id: document.getElementById('deptParent').value || null,
        sort_order: departments.length + 1
    };
    
    // descriptionが入力されている場合のみ追加
    const descInput = document.getElementById('deptDescription');
    if (descInput && descInput.value && descInput.value.trim()) {
        departmentData.description = descInput.value.trim();
    }

    const parentDept = departments.find(d => d.id === departmentData.parent_id);
    const confirmMsg = `
        <div class="bg-green-50 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-3">以下の内容で部署を追加しますか？</h3>
            <dl class="space-y-2">
                <div class="flex"><dt class="font-semibold w-32">部署名:</dt><dd>${departmentData.name}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">親部署:</dt><dd>${parentDept ? parentDept.name : 'なし'}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">説明:</dt><dd>${departmentData.description || '-'}</dd></div>
            </dl>
        </div>
    `;

    const result = await showConfirmModal(confirmMsg);
    if (!result) return;
    
    try {
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

        if (response.ok) {
            const addedDepartment = await response.json();
            await addChangeHistory('部署追加', '部署', null, addedDepartment[0]);

            // Phase 5: 監査ログ記録
            if (typeof logDepartmentAction === 'function') {
                await logDepartmentAction('create', addedDepartment[0], null);
            }

            closeModal('addDepartmentModal');
            document.getElementById('addDepartmentForm').reset();
            await loadData();
            showNotification('部署を追加しました', 'success');
        } else {
            const errorText = await response.text();
            console.error('部署追加エラー:', errorText);
            throw new Error('追加に失敗しました: ' + errorText);
        }
    } catch (error) {
        console.error('部署追加エラー:', error);
        showNotification('部署の追加に失敗しました', 'error');
    }
}

// 社員異動
async function moveEmployee(event) {
    event.preventDefault();

    // 権限チェック
    if (typeof canEdit === 'function' && !canEdit('社員異動')) {
        return;
    }

    const empId = document.getElementById('moveEmpId').value;
    const newDeptId = document.getElementById('moveEmpDepartment').value;
    
    const employee = employees.find(e => e.id === empId);
    const oldDept = departments.find(d => d.id === employee.department_id);
    const newDept = departments.find(d => d.id === newDeptId);

    const confirmMsg = `
        <div class="bg-yellow-50 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-3">以下の内容で異動しますか？</h3>
            <dl class="space-y-2">
                <div class="flex"><dt class="font-semibold w-32">社員:</dt><dd>${employee.name}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">現在の部署:</dt><dd>${oldDept.name}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">異動先:</dt><dd class="text-blue-600 font-bold">${newDept.name}</dd></div>
            </dl>
        </div>
    `;

    const result = await showConfirmModal(confirmMsg);
    if (!result) return;
    
    try {
        const beforeData = {...employee};
        const updatedEmployee = {...employee, department_id: newDeptId};
        
        const response = await fetch(`${SUPABASE_REST_URL}/employees?id=eq.${empId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ department_id: newDeptId })
        });

        if (response.ok) {
            await addChangeHistory('社員異動', '社員', beforeData, updatedEmployee);
            
            closeModal('moveEmployeeModal');
            await loadData();
            showNotification('社員を異動しました', 'success');
        } else {
            throw new Error('異動に失敗しました');
        }
    } catch (error) {
        console.error('社員異動エラー:', error);
        showNotification('社員の異動に失敗しました', 'error');
    }
}

// 社員削除確認
async function confirmDeleteEmployee(empId) {
    // 権限チェック
    if (typeof canEdit === 'function' && !canEdit('社員削除')) {
        return;
    }

    const employee = employees.find(e => e.id === empId);
    if (!employee) {
        showNotification('社員が見つかりません', 'error');
        return;
    }
    
    const dept = departments.find(d => d.id === employee.department_id);
    
    const confirmMsg = `
        <div class="bg-red-50 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-3 text-red-600">
                <i class="fas fa-exclamation-triangle mr-2"></i>本当に削除しますか？
            </h3>
            <dl class="space-y-2">
                <div class="flex"><dt class="font-semibold w-32">氏名:</dt><dd>${employee.name}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">部署:</dt><dd>${dept ? dept.name : '未所属'}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">役職:</dt><dd>${employee.position || '-'}</dd></div>
            </dl>
            <p class="mt-3 text-sm text-red-600">この操作は取り消せません。</p>
        </div>
    `;

    const result = await showConfirmModal(confirmMsg);
    if (!result) return;
    
    try {
        const response = await fetch(`${SUPABASE_REST_URL}/employees?id=eq.${empId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            }
        });

        if (response.ok || response.status === 204) {
            await addChangeHistory('社員削除', '社員', employee, null);

            // Phase 5: 監査ログ記録
            if (typeof logEmployeeAction === 'function') {
                await logEmployeeAction('delete', employee, employee);
            }

            await loadData();
            showNotification('社員を削除しました', 'success');
        } else {
            throw new Error('削除に失敗しました');
        }
    } catch (error) {
        console.error('社員削除エラー:', error);
        showNotification('社員の削除に失敗しました', 'error');
    }
}

// 部署削除確認
async function confirmDeleteDepartment(deptId) {
    // 権限チェック
    if (typeof canEdit === 'function' && !canEdit('部署削除')) {
        return;
    }

    const dept = departments.find(d => d.id === deptId);
    if (!dept) {
        showNotification('部署が見つかりません', 'error');
        return;
    }
    
    const deptEmployees = employees.filter(e => e.department_id === deptId);
    
    if (deptEmployees.length > 0) {
        showNotification('この部署には社員が所属しています。先に社員を移動または削除してください。', 'error');
        return;
    }

    const confirmMsg = `
        <div class="bg-red-50 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-3 text-red-600">
                <i class="fas fa-exclamation-triangle mr-2"></i>本当に削除しますか？
            </h3>
            <dl class="space-y-2">
                <div class="flex"><dt class="font-semibold w-32">部署名:</dt><dd>${dept.name}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">説明:</dt><dd>${dept.description || '-'}</dd></div>
            </dl>
            <p class="mt-3 text-sm text-red-600">この操作は取り消せません。</p>
        </div>
    `;

    const result = await showConfirmModal(confirmMsg);
    if (!result) return;
    
    try {
        const response = await fetch(`${SUPABASE_REST_URL}/departments?id=eq.${deptId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            }
        });

        if (response.ok || response.status === 204) {
            await addChangeHistory('部署削除', '部署', dept, null);

            // Phase 5: 監査ログ記録
            if (typeof logDepartmentAction === 'function') {
                await logDepartmentAction('delete', dept, dept);
            }

            await loadData();
            showNotification('部署を削除しました', 'success');
        } else {
            throw new Error('削除に失敗しました');
        }
    } catch (error) {
        console.error('部署削除エラー:', error);
        showNotification('部署の削除に失敗しました', 'error');
    }
}

// 変更履歴の追加
async function addChangeHistory(actionType, targetType, targetId, beforeData, afterData, description) {
    // target_idがオブジェクトの場合はIDを取得
    let resolvedTargetId = targetId;
    if (targetId && typeof targetId === 'object') {
        resolvedTargetId = targetId.id || null;
    }

    const historyData = {
        // id は自動生成（uuid）
        operation: actionType,  // テーブルのカラム名に合わせる
        target_type: targetType,
        target_id: resolvedTargetId,
        before_data: beforeData ? JSON.stringify(beforeData) : null,
        after_data: afterData ? JSON.stringify(afterData) : null,
        description: description || null,
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(`${SUPABASE_REST_URL}/change_history`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(historyData)
        });
    } catch (error) {
        console.error('履歴記録エラー:', error);
    }
}

// 変更履歴の表示
async function showHistory() {
    try {
        const response = await fetch(`${SUPABASE_REST_URL}/change_history?limit=50&order=created_at.desc`, {
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            }
        });
        const data = await response.json();
        changeHistory = Array.isArray(data) ? data : (data.data || []);

        const content = document.getElementById('historyContent');
        content.innerHTML = '';

        if (changeHistory.length === 0) {
            content.innerHTML = '<p class="text-center text-gray-500 py-8">変更履歴はありません</p>';
        } else {
            changeHistory.forEach(history => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                
                const date = new Date(history.created_at);
                const formattedDate = `${date.getFullYear()}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
                
                // 復元ボタンの表示判定
                const canRestore = history.before_data && 
                                  (history.action_type === '社員削除' || 
                                   history.action_type === '社員編集' || 
                                   history.action_type === '社員異動' ||
                                   history.action_type === '部署削除' || 
                                   history.action_type === '部署編集');
                
                const restoreButton = canRestore ? 
                    `<button onclick="restoreFromHistory('${history.id}')" class="btn bg-orange-500 text-white text-sm px-3 py-1 mt-2">
                        <i class="fas fa-undo mr-1"></i>取り消し
                    </button>` : '';
                
                historyItem.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <span class="badge badge-employee">${history.action_type}</span>
                        <span class="text-sm text-gray-500">${formattedDate}</span>
                    </div>
                    <p class="text-gray-700">${history.description}</p>
                    ${restoreButton}
                `;
                
                content.appendChild(historyItem);
            });
        }

        openModal('historyModal');
    } catch (error) {
        console.error('履歴取得エラー:', error);
        showNotification('履歴の取得に失敗しました', 'error');
    }
}

// データのエクスポート
function exportData() {
    const exportData = {
        departments: departments,
        employees: employees,
        changeHistory: changeHistory,
        exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `organization-data-${new Date().getTime()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('データをエクスポートしました', 'success');
}

// 組織図のフィルタリング
function filterOrganization() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterDept = document.getElementById('filterDepartment')?.value || '';
    const filterEmpType = document.getElementById('filterEmploymentType')?.value || '';
    const filterSkill = document.getElementById('filterSkill')?.value || '';
    const filterActive = document.getElementById('filterActiveStatus')?.value || 'active';
    
    const container = document.getElementById('chartContainer');
    container.innerHTML = '';

    // フィルター条件に合う社員を抽出
    let filteredEmployees = employees.filter(e => {
        // 検索語でフィルター
        if (searchTerm && !e.name.toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        // 部署フィルター
        if (filterDept) {
            const isInDept = e.department_id === filterDept;
            const isInConcurrentDept = (() => {
                try {
                    const depts = JSON.parse(e.departments || '[]');
                    return depts.some(d => d.department_id === filterDept);
                } catch(err) {
                    return false;
                }
            })();
            if (!isInDept && !isInConcurrentDept) return false;
        }
        
        // 雇用形態フィルター
        if (filterEmpType && e.employment_type !== filterEmpType) {
            return false;
        }
        
        // スキルフィルター
        if (filterSkill) {
            try {
                const skills = JSON.parse(e.skills || '[]');
                if (!skills.includes(filterSkill)) return false;
            } catch(err) {
                return false;
            }
        }
        
        // 在籍状況フィルター
        if (filterActive === 'active' && e.is_active === false) return false;
        if (filterActive === 'inactive' && e.is_active !== false) return false;
        
        return true;
    });

    // フィルター結果がない場合
    if (filteredEmployees.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">条件に合う社員がいません</p>';
        updateStatistics();
        return;
    }

    // フィルター結果の部署を抽出
    const relevantDeptIds = new Set();
    filteredEmployees.forEach(e => {
        relevantDeptIds.add(e.department_id);
        try {
            const depts = JSON.parse(e.departments || '[]');
            depts.forEach(d => relevantDeptIds.add(d.department_id));
        } catch(err) {}
    });

    const relevantDepts = departments.filter(d => relevantDeptIds.has(d.id));

    // 部署ごとに表示
    relevantDepts.forEach(dept => {
        const deptSection = createDepartmentSection(dept);
        container.appendChild(deptSection);
    });
    
    // 統計を更新（フィルター結果を反映）
    updateFilteredStatistics(filteredEmployees);
}

function updateFilteredStatistics(filteredEmployees) {
    const totalEmps = filteredEmployees.length;
    const regularEmps = filteredEmployees.filter(e => e.employment_type === '社員').length;
    const contractorEmps = filteredEmployees.filter(e => e.employment_type === '業務委託').length;
    
    document.getElementById('totalEmployees').textContent = totalEmps;
    document.getElementById('regularEmployees').textContent = regularEmps;
    document.getElementById('contractors').textContent = contractorEmps;
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    if (document.getElementById('filterDepartment')) document.getElementById('filterDepartment').value = '';
    if (document.getElementById('filterEmploymentType')) document.getElementById('filterEmploymentType').value = '';
    if (document.getElementById('filterSkill')) document.getElementById('filterSkill').value = '';
    if (document.getElementById('filterActiveStatus')) document.getElementById('filterActiveStatus').value = 'active';
    renderOrganizationChart();
}

// データの更新
async function refreshData() {
    showNotification('データを更新しています...', 'info');
    await loadData();
    showNotification('データを更新しました', 'success');
}

// モーダル関連
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showAddEmployeeModal() {
    openModal('addEmployeeModal');
}

function showAddDepartmentModal() {
    openModal('addDepartmentModal');
}

function showMoveEmployeeModal() {
    openModal('moveEmployeeModal');
}

// 確認モーダル（Promise版）
function showConfirmModal(message) {
    return new Promise((resolve) => {
        document.getElementById('confirmContent').innerHTML = message;
        
        // Yesボタン
        document.getElementById('confirmYes').onclick = () => {
            closeModal('confirmModal');
            resolve(true);
        };
        
        // Noボタン
        document.getElementById('confirmNo').onclick = () => {
            closeModal('confirmModal');
            resolve(false);
        };
        
        openModal('confirmModal');
    });
}

// 確認モーダル（コールバック版 - 互換性のため残す）
function showConfirmModalCallback(message, onConfirm) {
    document.getElementById('confirmContent').innerHTML = message;
    document.getElementById('confirmYes').onclick = () => {
        closeModal('confirmModal');
        onConfirm();
    };
    openModal('confirmModal');
}

// 通知表示
function showNotification(message, type = 'info', duration = 3000) {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg animate-fade-in`;
    notification.style.zIndex = '9999'; // 最前面に表示
    notification.style.maxWidth = '400px';
    
    // HTMLコンテンツを直接挿入（ボタンなどが機能するように）
    const contentDiv = document.createElement('div');
    contentDiv.className = 'flex items-center gap-3';
    
    const icon = document.createElement('i');
    icon.className = `fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}`;
    
    const messageDiv = document.createElement('div');
    messageDiv.innerHTML = message; // HTMLをサポート
    
    contentDiv.appendChild(icon);
    contentDiv.appendChild(messageDiv);
    notification.appendChild(contentDiv);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// ユーティリティ関数はutils.jsで定義済み
// generateId() はutils.jsからwindow経由でアクセス可能

// ============================================
// 新機能: 社員編集
// ============================================
function editEmployee(empId) {
    const employee = employees.find(e => e.id === empId);
    if (!employee) return;
    
    // フォームに現在の値を設定
    document.getElementById('editEmpId').value = employee.id;
    document.getElementById('editEmpName').value = employee.name;
    document.getElementById('editEmpDepartment').value = employee.department_id;

    // 役職ドロップダウンの設定（Phase 3.5対応）
    // role_idがある場合はそれを使用、なければpositionから役職を検索
    populateRoleSelects();
    const editRoleSelect = document.getElementById('editEmpRoleId');
    if (editRoleSelect) {
        if (employee.role_id) {
            editRoleSelect.value = employee.role_id;
        } else if (employee.position && roles.length > 0) {
            // positionから一致する役職を検索
            const matchingRole = roles.find(r => r.name === employee.position);
            if (matchingRole) {
                editRoleSelect.value = matchingRole.id;
            }
        }
    }
    // 後方互換性: editEmpPositionがまだHTMLに存在する場合
    const editPositionInput = document.getElementById('editEmpPosition');
    if (editPositionInput) {
        editPositionInput.value = employee.position || '';
    }

    document.getElementById('editEmpEmailCompany').value = employee.email_company || '';
    document.getElementById('editEmpEmailGmail').value = employee.email_gmail || '';
    document.getElementById('editEmpEmailShared').value = employee.email_shared || '';
    document.getElementById('editEmpPhone').value = employee.phone || '';
    document.getElementById('editEmpType').value = employee.employment_type;
    document.getElementById('editEmpBirthday').value = employee.birthday || '';
    document.getElementById('editEmpProfileUrl').value = employee.profile_url || '';
    document.getElementById('editEmpHireDate').value = employee.hire_date || '';
    document.getElementById('editEmpResignationDate').value = employee.resignation_date || '';
    document.getElementById('editEmpIsActive').checked = employee.is_active !== false;
    document.getElementById('editEmpEvaluation').value = employee.evaluation || '-';
    document.getElementById('editEmpGoalAchievement').value = employee.goal_achievement || 0;
    document.getElementById('editEmpNotes').value = employee.notes || '';

    // ChatWork ID（ソウルくん連携）
    const editChatworkIdInput = document.getElementById('editEmpChatworkId');
    if (editChatworkIdInput) {
        editChatworkIdInput.value = employee.chatwork_account_id || '';
    }
    
    // スキル・資格の表示
    try {
        const skills = JSON.parse(employee.skills || '[]');
        setSelectedSkills('editEmpSkillsCheckboxes', 'editEmpSkillsOther', skills);
    } catch(e) {
        setSelectedSkills('editEmpSkillsCheckboxes', 'editEmpSkillsOther', []);
    }
    
    try {
        const certifications = JSON.parse(employee.certifications || '[]');
        document.getElementById('editEmpCertifications').value = certifications.join(', ');
    } catch(e) {
        document.getElementById('editEmpCertifications').value = '';
    }
    
    // 兼務部署の表示
    let additionalDepts = [];
    try {
        const depts = JSON.parse(employee.departments || '[]');
        additionalDepts = depts.filter(d => !d.is_main);
    } catch(e) {
        console.error('兼務部署データの解析エラー:', e);
    }
    
    const container = document.getElementById('editAdditionalDepartments');
    renderAdditionalDepartments(container, additionalDepts);
    
    // アバタープレビュー
    if (employee.avatar) {
        document.getElementById('editAvatarPreview').innerHTML = `
            <img src="${employee.avatar}" class="avatar-preview" alt="現在の写真">
        `;
    }
    
    populateDepartmentSelects();
    document.getElementById('editEmpDepartment').value = employee.department_id;
    openModal('editEmployeeModal');
}

async function updateEmployee(event) {
    event.preventDefault();

    // 権限チェック
    if (typeof canEdit === 'function' && !canEdit('社員編集')) {
        return;
    }

    const empId = document.getElementById('editEmpId').value;
    const employee = employees.find(e => e.id === empId);
    const beforeData = {...employee};
    
    // 写真のアップロード処理
    let avatarUrl = employee.avatar;
    const avatarFile = document.getElementById('editEmpAvatar').files[0];
    if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile);
    }
    
    // 兼務部署の取得
    const additionalDepts = getAdditionalDepartments(
        '#editAdditionalDepartments',
        '[data-edit-dept-select]',
        '[data-edit-dept-position]'
    );
    
    // 主部署を含む全部署リスト
    const mainDeptId = document.getElementById('editEmpDepartment').value;

    // 役職の取得（Phase 3.5対応）
    // role_idドロップダウンがあればそれを使用、なければ従来のpositionテキスト入力を使用
    let mainRoleId = null;
    let mainPosition = '';
    const editRoleSelect = document.getElementById('editEmpRoleId');
    const editPositionInput = document.getElementById('editEmpPosition');

    if (editRoleSelect && editRoleSelect.value) {
        mainRoleId = editRoleSelect.value;
        // role_idから役職名を取得（後方互換性のためpositionにも設定）
        mainPosition = getRoleName(mainRoleId);
    } else if (editPositionInput) {
        // フォールバック: 従来のposition入力
        mainPosition = editPositionInput.value;
    }

    const allDepartments = [
        { department_id: mainDeptId, position: mainPosition, role_id: mainRoleId, is_main: true },
        ...additionalDepts.map(d => ({ ...d, is_main: false }))
    ];
    
    // スキル・資格の処理
    const skills = getSelectedSkills('editEmpSkillsCheckboxes', 'editEmpSkillsOther');
    const certificationsText = document.getElementById('editEmpCertifications').value;
    const certifications = certificationsText ? certificationsText.split(',').map(s => s.trim()).filter(s => s) : [];
    
    const updatedEmployee = {
        ...employee,
        name: document.getElementById('editEmpName').value,
        department_id: mainDeptId,
        departments: JSON.stringify(allDepartments),
        position: mainPosition,
        role_id: mainRoleId,  // Phase 3.5対応: 役職IDを追加
        email_company: document.getElementById('editEmpEmailCompany').value,
        email_gmail: document.getElementById('editEmpEmailGmail').value,
        email_shared: document.getElementById('editEmpEmailShared').value,
        phone: document.getElementById('editEmpPhone').value,
        employment_type: document.getElementById('editEmpType').value,
        birthday: document.getElementById('editEmpBirthday').value,
        profile_url: document.getElementById('editEmpProfileUrl').value,
        avatar: avatarUrl,
        hire_date: document.getElementById('editEmpHireDate').value,
        resignation_date: document.getElementById('editEmpResignationDate').value,
        is_active: document.getElementById('editEmpIsActive').checked,
        skills: JSON.stringify(skills),
        certifications: JSON.stringify(certifications),
        evaluation: document.getElementById('editEmpEvaluation').value,
        goal_achievement: parseInt(document.getElementById('editEmpGoalAchievement').value) || 0,
        notes: document.getElementById('editEmpNotes').value
    };

    // ソウルくん連携: chatwork_account_idカラムが存在する場合のみ追加
    if (window.hasChatworkAccountIdColumn) {
        updatedEmployee.chatwork_account_id = document.getElementById('editEmpChatworkId').value || null;
    }
    
    // 誕生日をGoogle Calendarに同期
    if (updatedEmployee.birthday && updatedEmployee.birthday !== beforeData.birthday) {
        await syncBirthdayToGoogleCalendar(updatedEmployee.name, updatedEmployee.birthday);
    }

    const dept = departments.find(d => d.id === updatedEmployee.department_id);
    const confirmMsg = `
        <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-3">以下の内容で更新しますか？</h3>
            <dl class="space-y-2">
                <div class="flex"><dt class="font-semibold w-32">氏名:</dt><dd>${updatedEmployee.name}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">部署:</dt><dd>${dept.name}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">役職:</dt><dd>${updatedEmployee.position || '-'}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">雇用形態:</dt><dd>${updatedEmployee.employment_type}</dd></div>
            </dl>
        </div>
    `;

    // 編集モーダルを先に閉じる
    closeModal('editEmployeeModal');
    
    // 少し遅延させてから確認ダイアログを表示
    setTimeout(() => {
        showConfirmModalCallback(confirmMsg, async () => {
            try {
                // 空の値をnullに変換
                const cleanedData = {
                    name: updatedEmployee.name,
                    department_id: updatedEmployee.department_id,
                    departments: updatedEmployee.departments,
                    position: updatedEmployee.position || null,
                    role_id: updatedEmployee.role_id || null,  // Phase 3.5対応
                    email_company: updatedEmployee.email_company || null,
                    email_gmail: updatedEmployee.email_gmail || null,
                    email_shared: updatedEmployee.email_shared || null,
                    phone: updatedEmployee.phone || null,
                    employment_type: updatedEmployee.employment_type,
                    birthday: updatedEmployee.birthday || null,
                    profile_url: updatedEmployee.profile_url || null,
                    avatar: updatedEmployee.avatar || null,
                    hire_date: updatedEmployee.hire_date || null,
                    resignation_date: updatedEmployee.resignation_date || null,
                    is_active: updatedEmployee.is_active,
                    skills: updatedEmployee.skills,
                    certifications: updatedEmployee.certifications,
                    evaluation: updatedEmployee.evaluation || '-',
                    goal_achievement: updatedEmployee.goal_achievement || 0,
                    notes: updatedEmployee.notes || null
                };
                
                const response = await fetch(`${SUPABASE_REST_URL}/employees?id=eq.${empId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'apikey': SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(cleanedData)
                });

                if (response.ok) {
                    await addChangeHistory('社員編集', '社員', beforeData, updatedEmployee);

                    // Phase 5: 監査ログ記録
                    if (typeof logEmployeeAction === 'function') {
                        await logEmployeeAction('update', updatedEmployee, beforeData);
                    }

                    document.getElementById('editEmployeeForm').reset();
                    document.getElementById('editAvatarPreview').innerHTML = '';
                    document.getElementById('editAdditionalDepartments').innerHTML = '';
                    await loadData();
                    showNotification('社員情報を更新しました', 'success');
                } else {
                    const errorText = await response.text();
                    console.error('社員更新エラー:', errorText);
                    throw new Error('更新に失敗しました: ' + errorText);
                }
            } catch (error) {
                console.error('社員更新エラー:', error);
                showNotification('社員情報の更新に失敗しました', 'error');
            }
        });
    }, 100);
}

// ============================================
// 新機能: 部署編集
// ============================================
function editDepartment(deptId) {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;
    
    // フォームに現在の値を設定
    document.getElementById('editDeptId').value = dept.id;
    document.getElementById('editDeptName').value = dept.name;
    document.getElementById('editDeptParent').value = dept.parent_id || '';
    document.getElementById('editDeptDescription').value = dept.description || '';
    
    populateDepartmentSelects();
    // 自分自身を親部署の選択肢から除外
    const parentSelect = document.getElementById('editDeptParent');
    Array.from(parentSelect.options).forEach(option => {
        if (option.value === deptId) {
            option.disabled = true;
        }
    });
    
    openModal('editDepartmentModal');
}

async function updateDepartment(event) {
    event.preventDefault();

    // 権限チェック
    if (typeof canEdit === 'function' && !canEdit('部署編集')) {
        return;
    }

    const deptId = document.getElementById('editDeptId').value;
    const dept = departments.find(d => d.id === deptId);
    const beforeData = {...dept};
    
    const updatedDept = {
        ...dept,
        name: document.getElementById('editDeptName').value,
        parent_id: document.getElementById('editDeptParent').value || null,
        description: document.getElementById('editDeptDescription').value
    };

    const parentDept = departments.find(d => d.id === updatedDept.parent_id);
    const confirmMsg = `
        <div class="bg-green-50 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-3">以下の内容で更新しますか？</h3>
            <dl class="space-y-2">
                <div class="flex"><dt class="font-semibold w-32">部署名:</dt><dd>${updatedDept.name}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">親部署:</dt><dd>${parentDept ? parentDept.name : 'なし'}</dd></div>
                <div class="flex"><dt class="font-semibold w-32">説明:</dt><dd>${updatedDept.description || '-'}</dd></div>
            </dl>
        </div>
    `;

    showConfirmModalCallback(confirmMsg, async () => {
        try {
            // 空の値をnullに変換
            const cleanedData = {
                name: updatedDept.name,
                parent_id: updatedDept.parent_id || null,
                description: updatedDept.description || null,
                sort_order: updatedDept.sort_order || 0
            };
            
            const response = await fetch(`${SUPABASE_REST_URL}/departments?id=eq.${deptId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(cleanedData)
            });

            if (response.ok) {
                await addChangeHistory('部署編集', '部署', beforeData, updatedDept);

                // Phase 5: 監査ログ記録
                if (typeof logDepartmentAction === 'function') {
                    await logDepartmentAction('update', updatedDept, beforeData);
                }

                closeModal('editDepartmentModal');
                document.getElementById('editDepartmentForm').reset();
                await loadData();
                showNotification('部署情報を更新しました', 'success');
            } else {
                const errorText = await response.text();
                console.error('部署更新エラー:', errorText);
                throw new Error('更新に失敗しました: ' + errorText);
            }
        } catch (error) {
            console.error('部署更新エラー:', error);
            showNotification('部署情報の更新に失敗しました', 'error');
        }
    });
}

// ============================================
// 新機能: 写真アップロード
// ============================================
function previewAvatar(event, previewId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(previewId).innerHTML = `
                <img src="${e.target.result}" class="avatar-preview" alt="プレビュー">
            `;
        };
        reader.readAsDataURL(file);
    }
}

async function uploadImage(file) {
    // Base64エンコードして保存（本番環境では画像ホスティングサービス使用推奨）
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

// ============================================
// 新機能: PDF印刷
// ============================================
async function printToPDF() {
    showNotification('PDF生成中...（少々お待ちください）', 'info');
    
    // PDF用の専用HTMLを生成
    const pdfContent = generatePDFContent();
    
    // 一時的にページに追加
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = pdfContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm'; // A4幅
    document.body.appendChild(tempDiv);
    
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `組織図_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        await html2pdf().set(opt).from(tempDiv.firstChild).save();
        showNotification('PDFをダウンロードしました', 'success');
    } catch (error) {
        console.error('PDF生成エラー:', error);
        showNotification('PDF生成に失敗しました', 'error');
    } finally {
        // 一時要素を削除
        document.body.removeChild(tempDiv);
    }
}

function generatePDFContent() {
    const today = new Date().toLocaleDateString('ja-JP');
    
    let html = `
        <div style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif; padding: 20px; background: white;">
            <!-- ヘッダー -->
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #667eea; padding-bottom: 20px;">
                <h1 style="color: #667eea; font-size: 28px; margin: 0 0 10px 0;">組織図</h1>
                <h2 style="color: #764ba2; font-size: 20px; margin: 0 0 10px 0;">株式会社ソウルシンクス</h2>
                <p style="color: #666; font-size: 12px; margin: 0;">作成日: ${today}</p>
            </div>
            
            <!-- 統計情報 -->
            <div style="margin-bottom: 30px; padding: 15px; background: #f8fafc; border-radius: 8px;">
                <h3 style="color: #667eea; font-size: 16px; margin: 0 0 15px 0; border-left: 4px solid #667eea; padding-left: 10px;">組織概要</h3>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 150px;">
                        <p style="margin: 5px 0; font-size: 13px; color: #666;">総従業員数: <strong style="font-size: 18px; color: #667eea;">${employees.length}名</strong></p>
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <p style="margin: 5px 0; font-size: 13px; color: #666;">部署数: <strong style="font-size: 18px; color: #764ba2;">${departments.length}部署</strong></p>
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <p style="margin: 5px 0; font-size: 13px; color: #666;">正社員: <strong style="font-size: 18px; color: #43e97b;">${employees.filter(e => e.employment_type === '社員').length}名</strong></p>
                    </div>
                </div>
            </div>
    `;
    
    // 部署ごとに社員リストを生成
    const topLevelDepts = departments
        .filter(d => !d.parent_id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    topLevelDepts.forEach((dept, deptIndex) => {
        html += generateDepartmentPDF(dept, deptIndex > 0);
    });
    
    html += `
            <!-- フッター -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #999; font-size: 11px;">
                <p>© ${new Date().getFullYear()} 株式会社ソウルシンクス - 組織図管理システム</p>
            </div>
        </div>
    `;
    
    return html;
}

function generateDepartmentPDF(dept, addPageBreak = false) {
    const deptEmployees = employees.filter(e => {
        if (e.department_id === dept.id) return true;
        try {
            const depts = JSON.parse(e.departments || '[]');
            return depts.some(d => d.department_id === dept.id);
        } catch(err) {
            return false;
        }
    });
    
    let html = `
        ${addPageBreak ? '<div style="page-break-before: always;"></div>' : ''}
        <div style="margin-bottom: 30px;">
            <!-- 部署ヘッダー -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 20px; border-radius: 12px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 5px 0; font-size: 20px;">${dept.name}</h3>
                ${dept.description ? `<p style="margin: 0; font-size: 12px; opacity: 0.9;">${dept.description}</p>` : ''}
                <p style="margin: 10px 0 0 0; font-size: 14px;"><strong>${deptEmployees.length}名</strong>所属</p>
            </div>
            
            <!-- 社員リスト -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
    `;
    
    deptEmployees.forEach(emp => {
        const isMainDept = emp.department_id === dept.id;
        const position = isMainDept ? emp.position : getConcurrentPosition(emp, dept.id);
        const borderColor = emp.employment_type === '社員' ? '#667eea' : 
                           emp.employment_type === '業務委託' ? '#43e97b' : '#f093fb';
        
        html += `
            <div style="border-left: 4px solid ${borderColor}; background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                    ${emp.avatar ? 
                        `<img src="${emp.avatar}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` :
                        `<div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, ${borderColor}, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">${emp.name.charAt(0)}</div>`
                    }
                    <div style="flex: 1;">
                        <p style="margin: 0; font-weight: bold; font-size: 14px; color: #1a202c;">${emp.name}</p>
                        <p style="margin: 3px 0 0 0; font-size: 11px; color: #666;">${position || '役職未設定'}</p>
                    </div>
                </div>
                <div style="font-size: 11px; color: #666; line-height: 1.6;">
                    ${emp.employment_type ? `<p style="margin: 3px 0;"><span style="display: inline-block; padding: 2px 8px; background: ${
                        emp.employment_type === '社員' ? '#e0e7ff' : 
                        emp.employment_type === '業務委託' ? '#d1fae5' : '#fef3c7'
                    }; border-radius: 4px; font-size: 10px;">${emp.employment_type}</span></p>` : ''}
                    ${!isMainDept ? '<p style="margin: 3px 0;"><span style="display: inline-block; padding: 2px 8px; background: #fef3c7; color: #92400e; border-radius: 4px; font-size: 10px;">兼務</span></p>' : ''}
                    ${emp.email_company ? `<p style="margin: 3px 0;">📧 ${emp.email_company}</p>` : ''}
                    ${emp.phone ? `<p style="margin: 3px 0;">📞 ${emp.phone}</p>` : ''}
                    ${emp.hire_date ? `<p style="margin: 3px 0;">入社: ${emp.hire_date}</p>` : ''}
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    // 子部署を再帰的に追加
    const childDepts = departments.filter(d => d.parent_id === dept.id);
    childDepts.forEach(childDept => {
        html += generateDepartmentPDF(childDept, false);
    });
    
    return html;
}

// ============================================
// 新機能: データインポート
// ============================================
function showImportModal() {
    openModal('importDataModal');
}

async function importData() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('ファイルを選択してください', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // データの検証
            if (!importedData.departments || !importedData.employees) {
                throw new Error('無効なデータ形式です');
            }
            
            const confirmMsg = `
                <div class="bg-yellow-50 p-4 rounded-lg">
                    <h3 class="font-bold text-lg mb-3">以下のデータをインポートしますか？</h3>
                    <dl class="space-y-2">
                        <div class="flex"><dt class="font-semibold w-32">部署数:</dt><dd>${importedData.departments.length}件</dd></div>
                        <div class="flex"><dt class="font-semibold w-32">社員数:</dt><dd>${importedData.employees.length}件</dd></div>
                    </dl>
                    <p class="mt-3 text-sm text-yellow-800">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        既存データに追加されます
                    </p>
                </div>
            `;
            
            showConfirmModalCallback(confirmMsg, async () => {
                try {
                    // 部署をインポート
                    for (const dept of importedData.departments) {
                        await fetch(`${SUPABASE_REST_URL}/departments`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                'apikey': SUPABASE_ANON_KEY,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation'
                            },
                            body: JSON.stringify(dept)
                        });
                    }
                    
                    // 社員をインポート
                    for (const emp of importedData.employees) {
                        await fetch(`${SUPABASE_REST_URL}/employees`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                'apikey': SUPABASE_ANON_KEY,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation'
                            },
                            body: JSON.stringify(emp)
                        });
                    }
                    
                    await addChangeHistory('データインポート', 'system', 'import', null, importedData, 
                        `${importedData.departments.length}部署、${importedData.employees.length}名の社員をインポートしました`);
                    
                    closeModal('importDataModal');
                    fileInput.value = '';
                    await loadData();
                    showNotification('データをインポートしました', 'success');
                } catch (error) {
                    console.error('インポートエラー:', error);
                    showNotification('データのインポートに失敗しました', 'error');
                }
            });
        } catch (error) {
            console.error('ファイル読み込みエラー:', error);
            showNotification('ファイルの読み込みに失敗しました', 'error');
        }
    };
    
    reader.readAsText(file);
}

// ============================================
// 新機能: ドラッグ&ドロップ
// ============================================
function initializeDragAndDrop() {
    const employeeCards = document.querySelectorAll('.employee-card');
    
    employeeCards.forEach(card => {
        card.setAttribute('draggable', 'true');
        
        card.addEventListener('dragstart', function(e) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', this.dataset.empId);
            this.classList.add('dragging');
        });
        
        card.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });
    });
    
    const deptSections = document.querySelectorAll('.dept-section');
    
    deptSections.forEach(section => {
        section.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.classList.add('drag-over');
        });
        
        section.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });
        
        section.addEventListener('drop', async function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            const empId = e.dataTransfer.getData('text/plain');
            const newDeptId = this.id.replace('dept-', '');
            
            const employee = employees.find(emp => emp.id === empId);
            if (employee && employee.department_id !== newDeptId) {
                const oldDept = departments.find(d => d.id === employee.department_id);
                const newDept = departments.find(d => d.id === newDeptId);
                
                const confirmMsg = `
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h3 class="font-bold text-lg mb-3">ドラッグ&ドロップで異動しますか？</h3>
                        <dl class="space-y-2">
                            <div class="flex"><dt class="font-semibold w-32">社員:</dt><dd>${employee.name}</dd></div>
                            <div class="flex"><dt class="font-semibold w-32">現在:</dt><dd>${oldDept.name}</dd></div>
                            <div class="flex"><dt class="font-semibold w-32">異動先:</dt><dd class="text-blue-600 font-bold">${newDept.name}</dd></div>
                        </dl>
                    </div>
                `;
                
                showConfirmModalCallback(confirmMsg, async () => {
                    const beforeData = {...employee};
                    const updatedEmployee = {...employee, department_id: newDeptId};
                    
                    try {
                        const response = await fetch(`${SUPABASE_REST_URL}/employees?id=eq.${empId}`, {
                            method: 'PUT',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(updatedEmployee)
                        });

                        if (response.ok) {
                            await addChangeHistory('社員異動', 'employee', empId, beforeData, updatedEmployee, 
                                `${employee.name}を${oldDept.name}から${newDept.name}に異動しました（ドラッグ&ドロップ）`);
                            
                            await loadData();
                            showNotification('社員を異動しました', 'success');
                        }
                    } catch (error) {
                        console.error('異動エラー:', error);
                        showNotification('異動に失敗しました', 'error');
                    }
                });
            }
        });
    });
}

// ============================================
// 新機能: 変更履歴からの復元
// ============================================
async function restoreFromHistory(historyId) {
    const history = changeHistory.find(h => h.id === historyId);
    if (!history || !history.before_data) {
        showNotification('復元できるデータがありません', 'error');
        return;
    }
    
    const beforeData = JSON.parse(history.before_data);
    const confirmMsg = `
        <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-3 text-orange-600">
                <i class="fas fa-undo mr-2"></i>この変更を取り消しますか？
            </h3>
            <p class="mb-3">${history.description}</p>
            <p class="text-sm text-gray-600">
                変更日時: ${new Date(history.created_at).toLocaleString('ja-JP')}
            </p>
        </div>
    `;
    
    showConfirmModalCallback(confirmMsg, async () => {
        try {
            if (history.target_type === 'employee') {
                if (history.action_type === '社員削除') {
                    // 削除された社員を復元（idを削除してSupabaseに自動生成させる）
                    const { id, ...dataWithoutId } = beforeData;
                    await fetch(`${SUPABASE_REST_URL}/employees`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'apikey': SUPABASE_ANON_KEY,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(dataWithoutId)
                    });
                } else {
                    // 変更前の状態に戻す（idは除外）
                    const { id, created_at, ...dataWithoutId } = beforeData;
                    await fetch(`${SUPABASE_REST_URL}/employees?id=eq.${history.target_id}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'apikey': SUPABASE_ANON_KEY,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(dataWithoutId)
                    });
                }
            } else if (history.target_type === 'department') {
                if (history.action_type === '部署削除') {
                    // 削除された部署を復元（idを削除してSupabaseに自動生成させる）
                    const { id, ...dataWithoutId } = beforeData;
                    await fetch(`${SUPABASE_REST_URL}/departments`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'apikey': SUPABASE_ANON_KEY,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(dataWithoutId)
                    });
                } else {
                    // 変更前の状態に戻す（idとcreated_atは除外）
                    const { id, created_at, ...dataWithoutId } = beforeData;
                    await fetch(`${SUPABASE_REST_URL}/departments?id=eq.${history.target_id}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'apikey': SUPABASE_ANON_KEY,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(dataWithoutId)
                    });
                }
            }
            
            await addChangeHistory('変更の取り消し', history.target_type, history.target_id, 
                null, beforeData, `${history.description}を取り消しました`);
            
            await loadData();
            showNotification('変更を取り消しました', 'success');
        } catch (error) {
            console.error('復元エラー:', error);
            showNotification('復元に失敗しました', 'error');
        }
    });
}

// ============================================
// 新機能: 複数部署管理
// ============================================
function addDepartmentField() {
    window.additionalDeptCounter++;
    const container = document.getElementById('additionalDepartments');
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'flex gap-2 mb-2';
    fieldGroup.id = `addDept-${window.additionalDeptCounter}`;
    
    fieldGroup.innerHTML = `
        <select class="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg" data-add-dept-select>
            <option value="">部署を選択</option>
            ${departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
        </select>
        <input type="text" placeholder="役職" class="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg" data-add-dept-position>
        <button type="button" onclick="removeDepartmentField('addDept-${window.additionalDeptCounter}')" 
                class="btn bg-red-500 text-white px-3">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(fieldGroup);
}

function addEditDepartmentField() {
    window.additionalDeptCounter++;
    const container = document.getElementById('editAdditionalDepartments');
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'flex gap-2 mb-2';
    fieldGroup.id = `editDept-${window.additionalDeptCounter}`;
    
    fieldGroup.innerHTML = `
        <select class="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg" data-edit-dept-select>
            <option value="">部署を選択</option>
            ${departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
        </select>
        <input type="text" placeholder="役職" class="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg" data-edit-dept-position>
        <button type="button" onclick="removeDepartmentField('editDept-${window.additionalDeptCounter}')" 
                class="btn bg-red-500 text-white px-3">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(fieldGroup);
}

function removeDepartmentField(id) {
    const field = document.getElementById(id);
    if (field) field.remove();
}

function getAdditionalDepartments(containerSelector, deptSelector, posSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return [];
    
    const deptSelects = container.querySelectorAll(deptSelector);
    const posInputs = container.querySelectorAll(posSelector);
    const additionalDepts = [];
    
    deptSelects.forEach((select, index) => {
        const deptId = select.value;
        const position = posInputs[index].value;
        if (deptId) {
            additionalDepts.push({
                department_id: deptId,
                position: position || ''
            });
        }
    });
    
    return additionalDepts;
}

function renderAdditionalDepartments(container, additionalDepts) {
    container.innerHTML = '';
    if (!additionalDepts || additionalDepts.length === 0) return;
    
    additionalDepts.forEach(dept => {
        window.additionalDeptCounter++;
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'flex gap-2 mb-2';
        fieldGroup.id = `editDept-${window.additionalDeptCounter}`;
        
        fieldGroup.innerHTML = `
            <select class="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg" data-edit-dept-select>
                <option value="">部署を選択</option>
                ${departments.map(d => `<option value="${d.id}" ${d.id === dept.department_id ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
            <input type="text" placeholder="役職" value="${dept.position || ''}" 
                   class="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg" data-edit-dept-position>
            <button type="button" onclick="removeDepartmentField('editDept-${window.additionalDeptCounter}')" 
                    class="btn bg-red-500 text-white px-3">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(fieldGroup);
    });
}

// ============================================
// 新機能: Google Calendar連携
// ============================================
async function syncBirthdayToGoogleCalendar(name, birthday) {
    // 静的サイトの制約により、Google Calendar APIの直接呼び出しは不可
    // 代わりに、以下の2つの実用的な方法を提供：
    // 1. Google Calendarに直接追加するリンクを生成
    // 2. iCalendarファイル(.ics)をダウンロード可能にする
    
    if (typeof debugLog === 'function') debugLog(`誕生日登録: ${name} - ${birthday}`);
    
    // 通知で、ユーザーに選択肢を提示
    const year = new Date(birthday).getFullYear();
    const month = new Date(birthday).getMonth() + 1;
    const day = new Date(birthday).getDate();
    
    showNotification(
        `<div class="text-white">${name}さんの誕生日（${birthday}）を登録しました。</div>` +
        `<button onclick="addToGoogleCalendar('${name}', '${birthday}')" class="notification-btn">` +
        `<i class="fas fa-calendar-plus mr-2"></i>Google Calendarに追加` +
        `</button>` +
        `<button onclick="downloadICS('${name}', '${birthday}')" class="notification-btn">` +
        `<i class="fas fa-download mr-2"></i>iCalendarファイルをダウンロード` +
        `</button>`,
        'success',
        10000
    );
}

// Google Calendarに直接追加するリンクを開く
function addToGoogleCalendar(name, birthday) {
    const date = new Date(birthday);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // 毎年繰り返す誕生日イベント
    const title = `🎂 ${name}さんの誕生日`;
    const details = `${name}さんの誕生日です。おめでとうございます！`;
    const startDate = `${year}${month}${day}`;
    
    // Google Calendarの追加URL
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${encodeURIComponent(title)}` +
        `&dates=${startDate}/${startDate}` +
        `&details=${encodeURIComponent(details)}` +
        `&recur=RRULE:FREQ=YEARLY` + // 毎年繰り返し
        `&ctz=Asia/Tokyo`;
    
    window.open(url, '_blank');
}

// iCalendarファイル(.ics)をダウンロード
function downloadICS(name, birthday) {
    const date = new Date(birthday);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // iCalendar形式のファイル内容を生成
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//組織図管理システム//Birthday Reminder//JA',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${year}${month}${day}`,
        `DTEND;VALUE=DATE:${year}${month}${day}`,
        'RRULE:FREQ=YEARLY', // 毎年繰り返し
        `SUMMARY:🎂 ${name}さんの誕生日`,
        `DESCRIPTION:${name}さんの誕生日です。おめでとうございます！`,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'BEGIN:VALARM',
        'TRIGGER:-PT24H', // 24時間前に通知
        'ACTION:DISPLAY',
        `DESCRIPTION:明日は${name}さんの誕生日です`,
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    
    // Blobを作成してダウンロード
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `birthday_${name}_${birthday}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    showNotification('iCalendarファイルをダウンロードしました', 'success');
}

// ============================================
// 社員詳細表示
// ============================================

function showEmployeeDetail(empId) {
    window.currentDetailEmployeeId = empId;
    const employee = employees.find(e => e.id === empId);
    if (!employee) return;
    
    const dept = departments.find(d => d.id === employee.department_id);
    const badgeClass = employee.employment_type === '社員' ? 'badge-employee' : 
                      employee.employment_type === '業務委託' ? 'badge-contractor' : 'badge-part';
    
    // アバター表示
    const avatarHtml = employee.avatar ? 
        `<img src="${employee.avatar}" class="w-24 h-24 rounded-full object-cover mx-auto mb-4" alt="${employee.name}">` :
        `<div class="w-24 h-24 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">
            ${employee.name.charAt(0)}
        </div>`;
    
    // 兼務部署の表示
    let additionalDeptsHtml = '';
    try {
        const depts = JSON.parse(employee.departments || '[]');
        const additional = depts.filter(d => !d.is_main);
        if (additional.length > 0) {
            additionalDeptsHtml = '<div class="mb-4"><h4 class="font-semibold text-gray-700 mb-2">兼務部署:</h4>';
            additional.forEach(d => {
                const dept = departments.find(dep => dep.id === d.department_id);
                if (dept) {
                    additionalDeptsHtml += `<div class="text-sm text-blue-600 mb-1">• ${dept.name}${d.position ? ' (' + d.position + ')' : ''}</div>`;
                }
            });
            additionalDeptsHtml += '</div>';
        }
    } catch(e) {
        console.error('兼務部署表示エラー:', e);
    }
    
    // スキル・資格の表示
    let skillsHtml = '';
    try {
        const skills = JSON.parse(employee.skills || '[]');
        if (skills.length > 0) {
            skillsHtml = '<div class="mb-4"><h4 class="font-semibold text-gray-700 mb-2">スキル:</h4><div class="flex flex-wrap gap-2">';
            skills.forEach(skill => {
                skillsHtml += `<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">${skill}</span>`;
            });
            skillsHtml += '</div></div>';
        }
    } catch(e) {}
    
    let certificationsHtml = '';
    try {
        const certifications = JSON.parse(employee.certifications || '[]');
        if (certifications.length > 0) {
            certificationsHtml = '<div class="mb-4"><h4 class="font-semibold text-gray-700 mb-2">資格:</h4><div class="flex flex-wrap gap-2">';
            certifications.forEach(cert => {
                certificationsHtml += `<span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">${cert}</span>`;
            });
            certificationsHtml += '</div></div>';
        }
    } catch(e) {}
    
    // 在籍年数の計算
    let tenureHtml = '';
    if (employee.hire_date) {
        const hireDate = new Date(employee.hire_date);
        const now = employee.is_active ? new Date() : (employee.resignation_date ? new Date(employee.resignation_date) : new Date());
        const years = Math.floor((now - hireDate) / (365.25 * 24 * 60 * 60 * 1000));
        const months = Math.floor((now - hireDate) / (30 * 24 * 60 * 60 * 1000)) % 12;
        tenureHtml = `<div class="text-sm text-gray-600 mb-2">在籍期間: ${years}年${months}ヶ月</div>`;
    }
    
    // 評価の表示
    let evaluationHtml = '';
    if (employee.evaluation && employee.evaluation !== '-') {
        const evalColors = {
            'S': 'bg-purple-100 text-purple-800',
            'A': 'bg-blue-100 text-blue-800',
            'B': 'bg-green-100 text-green-800',
            'C': 'bg-yellow-100 text-yellow-800',
            'D': 'bg-red-100 text-red-800'
        };
        evaluationHtml = `<span class="px-3 py-1 ${evalColors[employee.evaluation]} rounded-full text-sm font-bold">評価: ${employee.evaluation}</span>`;
    }
    
    let goalHtml = '';
    if (employee.goal_achievement) {
        const color = employee.goal_achievement >= 100 ? 'text-green-600' : employee.goal_achievement >= 80 ? 'text-blue-600' : 'text-orange-600';
        goalHtml = `<span class="${color} font-semibold">目標達成率: ${employee.goal_achievement}%</span>`;
    }
    
    const content = `
        <div class="text-center">
            ${avatarHtml}
            <h3 class="text-2xl font-bold text-gray-800 mb-2">${employee.name}</h3>
            <p class="text-lg text-gray-600 mb-2">${employee.position || '-'}</p>
            <p class="text-gray-500 mb-4">${dept ? dept.name : '未所属'}</p>
            <span class="badge ${badgeClass} mb-4">${employee.employment_type}</span>
            ${employee.is_active === false ? '<span class="badge bg-gray-400 text-white ml-2">退職</span>' : ''}
        </div>
        
        <div class="border-t border-gray-200 my-4"></div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            ${employee.email_company ? `
                <div>
                    <p class="text-gray-500">会社メール</p>
                    <p class="font-semibold"><i class="fas fa-envelope mr-2"></i>${employee.email_company}</p>
                </div>
            ` : ''}
            ${employee.email_gmail ? `
                <div>
                    <p class="text-gray-500">Gmail</p>
                    <p class="font-semibold"><i class="fab fa-google mr-2"></i>${employee.email_gmail}</p>
                </div>
            ` : ''}
            ${employee.phone ? `
                <div>
                    <p class="text-gray-500">電話番号</p>
                    <p class="font-semibold"><i class="fas fa-phone mr-2"></i>${employee.phone}</p>
                </div>
            ` : ''}
            ${employee.birthday ? `
                <div>
                    <p class="text-gray-500">誕生日</p>
                    <p class="font-semibold"><i class="fas fa-birthday-cake mr-2"></i>${employee.birthday}</p>
                </div>
            ` : ''}
            ${employee.hire_date ? `
                <div>
                    <p class="text-gray-500">入社日</p>
                    <p class="font-semibold"><i class="fas fa-calendar mr-2"></i>${employee.hire_date}</p>
                </div>
            ` : ''}
            ${employee.resignation_date ? `
                <div>
                    <p class="text-gray-500">退社日</p>
                    <p class="font-semibold"><i class="fas fa-calendar-times mr-2"></i>${employee.resignation_date}</p>
                </div>
            ` : ''}
        </div>
        
        ${tenureHtml}
        
        ${additionalDeptsHtml}
        
        ${employee.profile_url ? `
            <div class="mb-4">
                <a href="${employee.profile_url}" target="_blank" class="text-blue-600 hover:underline">
                    <i class="fas fa-id-card mr-2"></i>プロフィールページを開く
                </a>
            </div>
        ` : ''}
        
        ${skillsHtml}
        ${certificationsHtml}
        
        ${evaluationHtml || goalHtml ? `
            <div class="mb-4 flex gap-4 items-center">
                ${evaluationHtml}
                ${goalHtml}
            </div>
        ` : ''}
        
        ${employee.notes ? `
            <div class="mb-4">
                <h4 class="font-semibold text-gray-700 mb-2">備考:</h4>
                <p class="text-gray-600 whitespace-pre-wrap">${employee.notes}</p>
            </div>
        ` : ''}
        
        <div class="border-t border-gray-200 my-4"></div>
        
        <div class="flex gap-3 justify-center">
            <button onclick="editEmployeeFromDetail()" class="btn bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition">
                <i class="fas fa-edit mr-2"></i>編集
            </button>
            <button onclick="confirmDeleteEmployeeFromDetail()" class="btn bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition">
                <i class="fas fa-trash mr-2"></i>削除
            </button>
            <button onclick="closeModal('employeeDetailModal')" class="btn bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition">
                閉じる
            </button>
        </div>
    `;
    
    document.getElementById('employeeDetailContent').innerHTML = content;
    openModal('employeeDetailModal');
}

function editEmployeeFromDetail() {
    closeModal('employeeDetailModal');
    setTimeout(() => {
        editEmployee(window.currentDetailEmployeeId);
    }, 100);
}

function confirmDeleteEmployeeFromDetail() {
    closeModal('employeeDetailModal');
    setTimeout(() => {
        confirmDeleteEmployee(window.currentDetailEmployeeId);
    }, 100);
}

// ============================================
// 統計情報
// ============================================
function showStatisticsModal() {
    const stats = calculateStatistics();
    const content = generateStatisticsHTML(stats);
    document.getElementById('statisticsContent').innerHTML = content;
    openModal('statisticsModal');
}

function calculateStatistics() {
    const stats = {
        total: employees.length,
        active: employees.filter(e => e.is_active !== false).length,
        inactive: employees.filter(e => e.is_active === false).length,
        byEmploymentType: {},
        byDepartment: {},
        bySkill: {},
        byEvaluation: {},
        averageGoal: 0,
        averageTenure: 0
    };
    
    // 雇用形態別
    employees.forEach(e => {
        stats.byEmploymentType[e.employment_type] = (stats.byEmploymentType[e.employment_type] || 0) + 1;
    });
    
    // 部署別
    departments.forEach(dept => {
        const deptEmployees = employees.filter(e => {
            if (e.department_id === dept.id) return true;
            try {
                const depts = JSON.parse(e.departments || '[]');
                return depts.some(d => d.department_id === dept.id);
            } catch(err) {
                return false;
            }
        });
        
        stats.byDepartment[dept.name] = {
            total: deptEmployees.length,
            regular: deptEmployees.filter(e => e.employment_type === '社員').length,
            contractor: deptEmployees.filter(e => e.employment_type === '業務委託').length,
            parttime: deptEmployees.filter(e => e.employment_type === 'パート').length
        };
    });
    
    // スキル別
    employees.forEach(e => {
        try {
            const skills = JSON.parse(e.skills || '[]');
            skills.forEach(skill => {
                stats.bySkill[skill] = (stats.bySkill[skill] || 0) + 1;
            });
        } catch(err) {}
    });
    
    // 評価別
    employees.forEach(e => {
        if (e.evaluation && e.evaluation !== '-') {
            stats.byEvaluation[e.evaluation] = (stats.byEvaluation[e.evaluation] || 0) + 1;
        }
    });
    
    // 平均目標達成率
    const goalsData = employees.filter(e => e.goal_achievement).map(e => e.goal_achievement);
    if (goalsData.length > 0) {
        stats.averageGoal = Math.round(goalsData.reduce((a, b) => a + b, 0) / goalsData.length);
    }
    
    // 平均在籍期間
    const tenureData = employees.filter(e => e.hire_date && e.is_active !== false).map(e => {
        const hireDate = new Date(e.hire_date);
        const now = new Date();
        return (now - hireDate) / (365.25 * 24 * 60 * 60 * 1000);
    });
    if (tenureData.length > 0) {
        stats.averageTenure = (tenureData.reduce((a, b) => a + b, 0) / tenureData.length).toFixed(1);
    }
    
    return stats;
}

function generateStatisticsHTML(stats) {
    // スキルをカウント順にソート
    const topSkills = Object.entries(stats.bySkill)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    return `
        <div class="space-y-6">
            <!-- 全体統計 -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-purple-50 p-4 rounded-lg">
                    <p class="text-sm text-purple-600 font-semibold">総従業員数</p>
                    <p class="text-3xl font-bold text-purple-800">${stats.total}</p>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <p class="text-sm text-green-600 font-semibold">在籍中</p>
                    <p class="text-3xl font-bold text-green-800">${stats.active}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="text-sm text-gray-600 font-semibold">退職者</p>
                    <p class="text-3xl font-bold text-gray-800">${stats.inactive}</p>
                </div>
                <div class="bg-blue-50 p-4 rounded-lg">
                    <p class="text-sm text-blue-600 font-semibold">平均在籍年数</p>
                    <p class="text-3xl font-bold text-blue-800">${stats.averageTenure}年</p>
                </div>
            </div>
            
            <!-- 雇用形態別 -->
            <div class="bg-white border rounded-lg p-4">
                <h3 class="font-semibold text-lg mb-3 flex items-center">
                    <i class="fas fa-user-tie mr-2 text-blue-600"></i>雇用形態別
                </h3>
                <div class="grid grid-cols-3 gap-4">
                    ${Object.entries(stats.byEmploymentType).map(([type, count]) => `
                        <div class="text-center p-3 bg-gray-50 rounded">
                            <p class="text-sm text-gray-600">${type}</p>
                            <p class="text-2xl font-bold text-gray-800">${count}名</p>
                            <p class="text-xs text-gray-500">${Math.round(count / stats.total * 100)}%</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- 部署別 -->
            <div class="bg-white border rounded-lg p-4">
                <h3 class="font-semibold text-lg mb-3 flex items-center">
                    <i class="fas fa-building mr-2 text-purple-600"></i>部署別人数
                </h3>
                <div class="max-h-96 overflow-y-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="text-left p-2">部署名</th>
                                <th class="text-center p-2">合計</th>
                                <th class="text-center p-2">社員</th>
                                <th class="text-center p-2">業務委託</th>
                                <th class="text-center p-2">パート</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(stats.byDepartment)
                                .filter(([_, data]) => data.total > 0)
                                .sort((a, b) => b[1].total - a[1].total)
                                .map(([deptName, data]) => `
                                    <tr class="border-t">
                                        <td class="p-2 font-medium">${deptName}</td>
                                        <td class="text-center p-2 font-bold">${data.total}</td>
                                        <td class="text-center p-2">${data.regular}</td>
                                        <td class="text-center p-2">${data.contractor}</td>
                                        <td class="text-center p-2">${data.parttime}</td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- スキル統計 -->
            <div class="bg-white border rounded-lg p-4">
                <h3 class="font-semibold text-lg mb-3 flex items-center">
                    <i class="fas fa-star mr-2 text-yellow-600"></i>トップ10スキル
                </h3>
                <div class="space-y-2">
                    ${topSkills.map(([skill, count]) => `
                        <div class="flex items-center">
                            <div class="w-32 text-sm font-medium">${skill}</div>
                            <div class="flex-1 bg-gray-200 rounded-full h-6 relative">
                                <div class="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2" 
                                     style="width: ${Math.round(count / stats.total * 100)}%">
                                    <span class="text-xs text-white font-bold">${count}名</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${Object.keys(stats.byEvaluation).length > 0 ? `
                <!-- 評価分布 -->
                <div class="bg-white border rounded-lg p-4">
                    <h3 class="font-semibold text-lg mb-3 flex items-center">
                        <i class="fas fa-award mr-2 text-red-600"></i>評価分布
                    </h3>
                    <div class="grid grid-cols-5 gap-2">
                        ${['S', 'A', 'B', 'C', 'D'].map(rank => {
                            const count = stats.byEvaluation[rank] || 0;
                            const colors = {
                                'S': 'bg-purple-100 text-purple-800',
                                'A': 'bg-blue-100 text-blue-800',
                                'B': 'bg-green-100 text-green-800',
                                'C': 'bg-yellow-100 text-yellow-800',
                                'D': 'bg-red-100 text-red-800'
                            };
                            return `
                                <div class="text-center p-3 ${colors[rank]} rounded">
                                    <p class="text-lg font-bold">${rank}</p>
                                    <p class="text-2xl font-bold">${count}</p>
                                    <p class="text-xs">名</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${stats.averageGoal > 0 ? `
                        <div class="mt-4 text-center">
                            <p class="text-sm text-gray-600">平均目標達成率</p>
                            <p class="text-3xl font-bold ${stats.averageGoal >= 100 ? 'text-green-600' : 'text-orange-600'}">
                                ${stats.averageGoal}%
                            </p>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

// ============================================
// スキル選択関連
// ============================================
function toggleOtherSkill(checkbox, otherId) {
    const otherInput = document.getElementById(otherId);
    if (checkbox.checked) {
        otherInput.style.display = 'block';
    } else {
        otherInput.style.display = 'none';
        otherInput.value = '';
    }
}

function getSelectedSkills(checkboxesId, otherId) {
    const container = document.getElementById(checkboxesId);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    const skills = [];
    
    checkboxes.forEach(cb => {
        if (cb.value === 'その他') {
            const otherValue = document.getElementById(otherId).value.trim();
            if (otherValue) {
                skills.push(otherValue);
            }
        } else {
            skills.push(cb.value);
        }
    });
    
    return skills;
}

function setSelectedSkills(checkboxesId, otherId, skills) {
    const container = document.getElementById(checkboxesId);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    
    // すべてのチェックを外す
    checkboxes.forEach(cb => cb.checked = false);
    
    // 標準スキルのリスト
    const standardSkills = ['営業', 'マーケティング', '企画', '広報・PR', '人事', '総務', '経理・財務', '法務', 
                           'デザイン', 'プログラミング', 'Webデザイン', '動画編集', 'SNS運用', 'ライティング',
                           'データ分析', 'プロジェクト管理', 'カスタマーサポート', '採用', '教育研修', 'コンサルティング'];
    
    let otherSkills = [];
    
    skills.forEach(skill => {
        if (standardSkills.includes(skill)) {
            // 標準スキルの場合、チェックボックスを選択
            const checkbox = Array.from(checkboxes).find(cb => cb.value === skill);
            if (checkbox) checkbox.checked = true;
        } else {
            // その他のスキル
            otherSkills.push(skill);
        }
    });
    
    // その他のスキルがある場合
    if (otherSkills.length > 0) {
        const otherCheckbox = Array.from(checkboxes).find(cb => cb.value === 'その他');
        if (otherCheckbox) {
            otherCheckbox.checked = true;
            const otherInput = document.getElementById(otherId);
            otherInput.style.display = 'block';
            otherInput.value = otherSkills.join(', ');
        }
    }
}

// ============================================
// CSV/Excelインポート
// ============================================
function showImportModal() {
    openModal('importDataModal');
}

async function importData() {
    const file = document.getElementById('importFile').files[0];
    if (!file) {
        showNotification('ファイルを選択してください', 'error');
        return;
    }
    
    const fileName = file.name.toLowerCase();
    
    try {
        if (fileName.endsWith('.json')) {
            await importJSON(file);
        } else if (fileName.endsWith('.csv')) {
            await importCSV(file);
        } else {
            showNotification('対応していないファイル形式です', 'error');
        }
    } catch (error) {
        console.error('インポートエラー:', error);
        showNotification('インポートに失敗しました', 'error');
    }
}

async function importJSON(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    
    let importedCount = 0;
    
    if (data.employees && Array.isArray(data.employees)) {
        for (const emp of data.employees) {
            try {
                // idを削除（Supabaseが自動生成）
                const { id, ...empWithoutId } = emp;
                await fetch(`${SUPABASE_REST_URL}/employees`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'apikey': SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(empWithoutId)
                });
                importedCount++;
            } catch(err) {
                console.error('社員インポートエラー:', err);
            }
        }
    }
    
    closeModal('importDataModal');
    await loadData();
    showNotification(`${importedCount}名の社員をインポートしました`, 'success');
}

async function importCSV(file) {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
        showNotification('CSVファイルが空です', 'error');
        return;
    }
    
    // ヘッダー行を解析
    const headers = parseCSVLine(lines[0]);
    let importedCount = 0;
    
    // データ行を解析
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0) continue;
        
        const empData = {
            name: '',
            department_id: '',
            departments: '[]',
            position: '',
            employment_type: '社員',
            is_active: true,
            email_company: '',
            email_gmail: '',
            email_shared: '',
            phone: '',
            birthday: '',
            hire_date: '',
            skills: '[]',
            certifications: '[]'
        };
        
        headers.forEach((header, index) => {
            const value = values[index] || '';
            const headerLower = header.toLowerCase().trim();
            
            // 日本語とEnglish両対応
            if (headerLower === '氏名' || headerLower === 'name' || headerLower === '名前') {
                empData.name = value;
            }
            else if (headerLower === '主所属部署id' || headerLower === 'department_id' || headerLower === '部署id') {
                empData.department_id = value;
            }
            else if (headerLower === '部署' || headerLower === 'department' || headerLower === '部署名') {
                const dept = departments.find(d => d.name === value);
                if (dept) empData.department_id = dept.id;
            }
            else if (headerLower === '主役職' || headerLower === 'position' || headerLower === '役職') {
                empData.position = value;
            }
            else if (headerLower === '雇用形態' || headerLower === 'employment_type') {
                empData.employment_type = value;
            }
            else if (headerLower === '会社メール' || headerLower === 'email_company' || headerLower === '会社メールアドレス') {
                empData.email_company = value;
            }
            else if (headerLower === 'gmail' || headerLower === 'gmailアカウント') {
                empData.email_gmail = value;
            }
            else if (headerLower === '共有メール' || headerLower === 'email_shared' || headerLower === '共有先メールアドレス') {
                empData.email_shared = value;
            }
            else if (headerLower === '電話' || headerLower === 'phone' || headerLower === '電話番号') {
                empData.phone = value;
            }
            else if (headerLower === '誕生日' || headerLower === 'birthday') {
                empData.birthday = value;
            }
            else if (headerLower === '入社日' || headerLower === 'hire_date') {
                empData.hire_date = value;
            }
            else if (headerLower === 'スキル' || headerLower === 'skills') {
                const skillArray = value.split(',').map(s => s.trim()).filter(s => s);
                empData.skills = JSON.stringify(skillArray);
            }
            else if (headerLower === '資格' || headerLower === 'certifications') {
                const certArray = value.split(',').map(s => s.trim()).filter(s => s);
                empData.certifications = JSON.stringify(certArray);
            }
            else if (headerLower === 'プロフィールurl' || headerLower === 'profile_url') {
                empData.profile_url = value;
            }
            else if (headerLower === '評価' || headerLower === 'evaluation') {
                empData.evaluation = value;
            }
            else if (headerLower === '目標達成率' || headerLower === 'goal_achievement') {
                empData.goal_achievement = value ? parseInt(value) : null;
            }
            else if (headerLower === '備考' || headerLower === 'notes') {
                empData.notes = value;
            }
        });
        
        if (empData.name) {
            try {
                await fetch(`${SUPABASE_REST_URL}/employees`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'apikey': SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(empData)
                });
                importedCount++;
            } catch(err) {
                console.error('社員インポートエラー:', err);
            }
        }
    }
    
    closeModal('importDataModal');
    await loadData();
    showNotification(`${importedCount}名の社員をインポートしました`, 'success');
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// インポートファイルのプレビュー
async function previewImportFile() {
    const file = document.getElementById('importFile').files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    const previewDiv = document.getElementById('importPreview');
    const previewContent = document.getElementById('importPreviewContent');
    
    try {
        if (fileName.endsWith('.json')) {
            const text = await file.text();
            const data = JSON.parse(text);
            const empCount = data.employees ? data.employees.length : 0;
            previewContent.innerHTML = `<p><strong>${empCount}名</strong>の社員データが検出されました。</p>`;
            previewDiv.style.display = 'block';
        } else if (fileName.endsWith('.csv')) {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            const dataCount = Math.max(0, lines.length - 1); // ヘッダー除く
            previewContent.innerHTML = `<p><strong>${dataCount}名</strong>の社員データが検出されました。</p>`;
            previewDiv.style.display = 'block';
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            previewContent.innerHTML = `<p class="text-yellow-600">⚠️ Excel形式（.xlsx/.xls）は現在テスト中です。CSV形式での利用を推奨します。</p>`;
            previewDiv.style.display = 'block';
        } else {
            previewDiv.style.display = 'none';
        }
    } catch (error) {
        console.error('プレビューエラー:', error);
        previewContent.innerHTML = `<p class="text-red-600">ファイルの読み込みに失敗しました。</p>`;
        previewDiv.style.display = 'block';
    }
}

function downloadTemplate() {
    const csvContent = `氏名,主所属部署ID,主役職,雇用形態,会社メール,Gmail,共有メール,電話番号,誕生日,入社日,スキル,資格,評価,目標達成率,備考
山田太郎,dept-001,マネージャー,社員,yamada@company.com,yamada@gmail.com,sales@company.com,090-1234-5678,1990-01-01,2020-04-01,"営業,マーケティング",普通自動車免許,A,120,リーダー候補
田中花子,dept-002,担当者,社員,tanaka@company.com,tanaka@gmail.com,,090-2345-6789,1992-05-15,2021-06-01,"人事,採用",TOEIC800,B,95,`;
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '社員インポートテンプレート.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    showNotification('テンプレートをダウンロードしました', 'success');
}

// ============================================
// 表示モード切替
// ============================================

function setViewMode(mode) {
    window.currentViewMode = mode;
    
    // ボタンのスタイル更新
    document.querySelectorAll('[id^="viewMode"]').forEach(btn => {
        btn.style.background = '';
        btn.classList.add('text-gray-700', 'hover:bg-gray-200');
        btn.classList.remove('text-white');
    });
    
    const activeBtn = document.getElementById('viewMode' + mode.charAt(0).toUpperCase() + mode.slice(1));
    activeBtn.style.background = '#E74C3C';
    activeBtn.classList.add('text-white');
    activeBtn.classList.remove('text-gray-700', 'hover:bg-gray-200');
    
    // 組織図を再レンダリング
    renderOrganizationChart();
}

function renderOrganizationByMode() {
    const orgChartDiv = document.getElementById('orgChart');
    orgChartDiv.innerHTML = '';

    if (window.currentViewMode === 'card') {
        renderCardView(orgChartDiv);
    } else if (window.currentViewMode === 'tree') {
        renderTreeView(orgChartDiv);
    } else if (window.currentViewMode === 'list') {
        renderListView(orgChartDiv);
    }

    // 部署エディターのイベントを再設定（ダブルクリック・右クリック）
    if (typeof attachDepartmentEditorEvents === 'function') {
        // 少し遅延させてDOMが完全に構築されるのを待つ
        setTimeout(() => {
            attachDepartmentEditorEvents();
        }, 50);
    }
}

// ============================================
// レンダリング関数（Phase 7: views/ モジュールに移動済み）
// renderCardView, renderTreeView, renderListView,
// createTreeNodeCompact, createCompactEmployeeCard,
// showDepartmentDetail, moveEmployeeToDepartment,
// getEmployeeCountInDepartment, getConcurrentPosition
// は views/card-view.js, views/tree-view.js, views/list-view.js で定義
// ============================================

// ============================================
// Chatwork通知連携
// Phase 7: features/chatwork.js に移動済み
// ============================================

// ============================================
// ソウルくん同期機能
// Phase 7: features/sync.js に移動済み
// ============================================

// モーダル外クリックで閉じる（残存：モーダル共通処理）
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// Chatwork設定モーダルオープン時の処理
const _originalOpenModal = typeof openModal === 'function' ? openModal : null;
if (_originalOpenModal) {
    window.openModal = function(modalId) {
        if (modalId === 'chatworkSettingsModal' && typeof loadChatworkSettings === 'function') {
            loadChatworkSettings();
        }
        _originalOpenModal(modalId);
    };
}

// グローバルエクスポート（他モジュールから呼び出し可能にする）
window.showConfirmModal = showConfirmModal;
window.showConfirmModalCallback = showConfirmModalCallback;
window.loadData = loadData;
window.addChangeHistory = addChangeHistory;
window.employees = employees;
window.departments = departments;

// ページ読み込み完了時の初期化（ファイル末尾に配置）
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof debugLog === 'function') debugLog('DOMContentLoaded: JavaScript is fully loaded');

    // Phase 2: 認証初期化（URLパラメータより先に実行）
    if (typeof initializeAuth === 'function') {
        await initializeAuth();
    }

    // Phase 3: ツリー表示強化初期化
    if (typeof initializePhase3 === 'function') {
        initializePhase3();
    }

    // Phase 4: ドラッグ&ドロップ強化初期化
    if (typeof initializePhase4 === 'function') {
        initializePhase4();
    }

    // Phase 6: ダッシュボード初期化
    if (typeof initializePhase6 === 'function') {
        initializePhase6();
    }

    // 部署エディター初期化（インライン編集・右クリックメニュー）
    if (typeof initializeDepartmentEditor === 'function') {
        initializeDepartmentEditor();
    }

    checkViewMode();
    await checkSchemaExtensions();  // スキーマ拡張チェック（ソウルくん連携）
    loadData();
});

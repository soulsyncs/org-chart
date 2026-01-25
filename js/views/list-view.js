/**
 * org-chart リストビューモジュール
 * Phase 7: コードモジュール分割
 *
 * リスト形式での組織図表示機能を提供
 *
 * 作成日: 2026-01-25
 */

// ============================================
// リスト表示レンダリング
// ============================================

/**
 * リストビューをレンダリング
 * @param {HTMLElement} container - コンテナ要素
 */
function renderListView(container) {
    container.className = 'list-view';

    const table = document.createElement('div');
    table.className = 'bg-white rounded-lg shadow-md overflow-hidden';

    let html = `
        <table class="w-full">
            <thead class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <tr>
                    <th class="px-4 py-3 text-left">氏名</th>
                    <th class="px-4 py-3 text-left">部署</th>
                    <th class="px-4 py-3 text-left">役職</th>
                    <th class="px-4 py-3 text-left">雇用形態</th>
                    <th class="px-4 py-3 text-left">連絡先</th>
                    <th class="px-4 py-3 text-left">操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    employees.forEach((emp, index) => {
        const dept = departments.find(d => d.id === emp.department_id);
        const deptName = dept ? dept.name : '未所属';
        const bgClass = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';

        // 役職表示（role_id対応）
        let positionDisplay = emp.position || '-';
        if (emp.role_id && typeof roles !== 'undefined') {
            const role = roles.find(r => r.id === emp.role_id);
            if (role) {
                positionDisplay = role.name;
            }
        }

        html += `
            <tr class="${bgClass} hover:bg-purple-50 transition cursor-pointer" onclick="showEmployeeDetail('${emp.id}')">
                <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                        ${emp.avatar ?
                            `<img src="${emp.avatar}" class="w-8 h-8 rounded-full object-cover">` :
                            `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">${emp.name.charAt(0)}</div>`
                        }
                        <span class="font-semibold">${emp.name}</span>
                    </div>
                </td>
                <td class="px-4 py-3">${escapeHtmlForList(deptName)}</td>
                <td class="px-4 py-3">${escapeHtmlForList(positionDisplay)}</td>
                <td class="px-4 py-3">
                    <span class="inline-block px-2 py-1 rounded text-xs ${
                        emp.employment_type === '社員' ? 'bg-blue-100 text-blue-800' :
                        emp.employment_type === '業務委託' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                    }">${escapeHtmlForList(emp.employment_type)}</span>
                </td>
                <td class="px-4 py-3 text-sm">
                    ${emp.email_company ? `<div>${escapeHtmlForList(emp.email_company)}</div>` : ''}
                    ${emp.phone ? `<div>${escapeHtmlForList(emp.phone)}</div>` : ''}
                </td>
                <td class="px-4 py-3">
                    <div class="flex gap-2">
                        <button onclick="event.stopPropagation(); editEmployee('${emp.id}')" class="text-blue-600 hover:text-blue-800" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="event.stopPropagation(); confirmDeleteEmployee('${emp.id}')" class="text-red-600 hover:text-red-800" title="削除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    table.innerHTML = html;
    container.appendChild(table);
}

/**
 * フィルタ付きリストビューをレンダリング
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} filters - フィルタオプション
 */
function renderFilteredListView(container, filters = {}) {
    container.className = 'list-view';

    // フィルタリング
    let filteredEmployees = [...employees];

    if (filters.department_id) {
        filteredEmployees = filteredEmployees.filter(e => e.department_id === filters.department_id);
    }

    if (filters.employment_type) {
        filteredEmployees = filteredEmployees.filter(e => e.employment_type === filters.employment_type);
    }

    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredEmployees = filteredEmployees.filter(e =>
            e.name.toLowerCase().includes(searchLower) ||
            (e.position && e.position.toLowerCase().includes(searchLower)) ||
            (e.email_company && e.email_company.toLowerCase().includes(searchLower))
        );
    }

    // ソート
    if (filters.sortBy) {
        const sortKey = filters.sortBy;
        const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;

        filteredEmployees.sort((a, b) => {
            const valA = a[sortKey] || '';
            const valB = b[sortKey] || '';

            if (typeof valA === 'string') {
                return valA.localeCompare(valB, 'ja') * sortOrder;
            }
            return (valA - valB) * sortOrder;
        });
    }

    // テーブル作成
    const table = document.createElement('div');
    table.className = 'bg-white rounded-lg shadow-md overflow-hidden';

    let html = `
        <div class="p-4 bg-gray-100 border-b">
            <p class="text-sm text-gray-600">
                ${filteredEmployees.length}件表示 / 全${employees.length}件
            </p>
        </div>
        <table class="w-full">
            <thead class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <tr>
                    <th class="px-4 py-3 text-left cursor-pointer hover:bg-purple-700" data-sort="name">
                        氏名 <i class="fas fa-sort ml-1"></i>
                    </th>
                    <th class="px-4 py-3 text-left">部署</th>
                    <th class="px-4 py-3 text-left cursor-pointer hover:bg-purple-700" data-sort="position">
                        役職 <i class="fas fa-sort ml-1"></i>
                    </th>
                    <th class="px-4 py-3 text-left cursor-pointer hover:bg-purple-700" data-sort="employment_type">
                        雇用形態 <i class="fas fa-sort ml-1"></i>
                    </th>
                    <th class="px-4 py-3 text-left">連絡先</th>
                    <th class="px-4 py-3 text-left">操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (filteredEmployees.length === 0) {
        html += `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                    該当する社員がいません
                </td>
            </tr>
        `;
    } else {
        filteredEmployees.forEach((emp, index) => {
            const dept = departments.find(d => d.id === emp.department_id);
            const deptName = dept ? dept.name : '未所属';
            const bgClass = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';

            html += `
                <tr class="${bgClass} hover:bg-purple-50 transition cursor-pointer" onclick="showEmployeeDetail('${emp.id}')">
                    <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                            ${emp.avatar ?
                                `<img src="${emp.avatar}" class="w-8 h-8 rounded-full object-cover">` :
                                `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">${emp.name.charAt(0)}</div>`
                            }
                            <span class="font-semibold">${escapeHtmlForList(emp.name)}</span>
                        </div>
                    </td>
                    <td class="px-4 py-3">${escapeHtmlForList(deptName)}</td>
                    <td class="px-4 py-3">${escapeHtmlForList(emp.position || '-')}</td>
                    <td class="px-4 py-3">
                        <span class="inline-block px-2 py-1 rounded text-xs ${
                            emp.employment_type === '社員' ? 'bg-blue-100 text-blue-800' :
                            emp.employment_type === '業務委託' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                        }">${escapeHtmlForList(emp.employment_type)}</span>
                    </td>
                    <td class="px-4 py-3 text-sm">
                        ${emp.email_company ? `<div>${escapeHtmlForList(emp.email_company)}</div>` : ''}
                        ${emp.phone ? `<div>${escapeHtmlForList(emp.phone)}</div>` : ''}
                    </td>
                    <td class="px-4 py-3">
                        <div class="flex gap-2">
                            <button onclick="event.stopPropagation(); editEmployee('${emp.id}')" class="text-blue-600 hover:text-blue-800" title="編集">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="event.stopPropagation(); confirmDeleteEmployee('${emp.id}')" class="text-red-600 hover:text-red-800" title="削除">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }

    html += `
            </tbody>
        </table>
    `;

    table.innerHTML = html;
    container.appendChild(table);
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * HTMLエスケープ（リスト用）
 * @param {string} str - 文字列
 * @returns {string}
 */
function escapeHtmlForList(str) {
    if (!str) return '';
    // グローバルのescapeHtml関数があればそれを使用
    if (typeof escapeHtml === 'function') {
        return escapeHtml(str);
    }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * リストビューをエクスポート用のデータに変換
 * @returns {Array}
 */
function getListViewData() {
    return employees.map(emp => {
        const dept = departments.find(d => d.id === emp.department_id);
        return {
            name: emp.name,
            department: dept ? dept.name : '未所属',
            position: emp.position || '',
            employment_type: emp.employment_type,
            email: emp.email_company || '',
            phone: emp.phone || ''
        };
    });
}

// ============================================
// グローバルエクスポート
// ============================================

window.renderListView = renderListView;
window.renderFilteredListView = renderFilteredListView;
window.escapeHtmlForList = escapeHtmlForList;
window.getListViewData = getListViewData;

console.log('✅ views/list-view.js loaded');

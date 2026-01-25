/**
 * org-chart ユーティリティモジュール
 * Phase 7: コードモジュール分割
 *
 * 共通ユーティリティ関数を提供
 *
 * 作成日: 2026-01-25
 */

// ============================================
// ID生成
// ============================================

/**
 * ユニークIDを生成
 * @param {string} prefix - プレフィックス
 * @returns {string}
 */
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * UUIDv4を生成
 * @returns {string}
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ============================================
// 日付・時刻
// ============================================

/**
 * 日付をフォーマット
 * @param {string|Date} date - 日付
 * @param {string} format - フォーマット（'date', 'datetime', 'time'）
 * @returns {string}
 */
function formatDate(date, format = 'date') {
    if (!date) return '-';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    const options = {
        date: { year: 'numeric', month: '2-digit', day: '2-digit' },
        datetime: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' },
        time: { hour: '2-digit', minute: '2-digit' }
    };

    return d.toLocaleString('ja-JP', options[format] || options.date);
}

/**
 * 年齢を計算
 * @param {string} birthday - 誕生日
 * @returns {number|null}
 */
function calculateAge(birthday) {
    if (!birthday) return null;

    const birth = new Date(birthday);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

/**
 * 勤続年数を計算
 * @param {string} hireDate - 入社日
 * @returns {string}
 */
function calculateTenure(hireDate) {
    if (!hireDate) return '-';

    const hire = new Date(hireDate);
    const today = new Date();

    let years = today.getFullYear() - hire.getFullYear();
    let months = today.getMonth() - hire.getMonth();

    if (months < 0) {
        years--;
        months += 12;
    }

    if (years > 0) {
        return months > 0 ? `${years}年${months}ヶ月` : `${years}年`;
    } else {
        return `${months}ヶ月`;
    }
}

// ============================================
// 文字列処理
// ============================================

/**
 * 文字列をトランケート
 * @param {string} str - 文字列
 * @param {number} maxLength - 最大長
 * @returns {string}
 */
function truncate(str, maxLength = 20) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

/**
 * HTMLエスケープ
 * @param {string} str - 文字列
 * @returns {string}
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * CSVセーフな文字列に変換
 * @param {string} str - 文字列
 * @returns {string}
 */
function csvSafe(str) {
    if (!str) return '';
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// ============================================
// 配列・オブジェクト操作
// ============================================

/**
 * 配列をグループ化
 * @param {Array} array - 配列
 * @param {string|Function} key - グループ化キー
 * @returns {Object}
 */
function groupBy(array, key) {
    return array.reduce((result, item) => {
        const keyValue = typeof key === 'function' ? key(item) : item[key];
        (result[keyValue] = result[keyValue] || []).push(item);
        return result;
    }, {});
}

/**
 * オブジェクトの差分を取得
 * @param {Object} obj1 - 比較元
 * @param {Object} obj2 - 比較先
 * @returns {Object} - 差分
 */
function getObjectDiff(obj1, obj2) {
    const diff = {};
    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    for (const key of allKeys) {
        if (JSON.stringify(obj1?.[key]) !== JSON.stringify(obj2?.[key])) {
            diff[key] = {
                before: obj1?.[key],
                after: obj2?.[key]
            };
        }
    }

    return diff;
}

/**
 * ディープクローン
 * @param {*} obj - クローン対象
 * @returns {*}
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));

    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

// ============================================
// バリデーション
// ============================================

/**
 * メールアドレスの形式チェック
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    if (!email) return false;
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

/**
 * 電話番号の形式チェック
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
    if (!phone) return false;
    const pattern = /^[\d\-+() ]+$/;
    return pattern.test(phone);
}

/**
 * 日付の形式チェック
 * @param {string} dateStr
 * @returns {boolean}
 */
function isValidDate(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

// ============================================
// デバウンス・スロットル
// ============================================

/**
 * デバウンス
 * @param {Function} func - 関数
 * @param {number} wait - 待機時間（ミリ秒）
 * @returns {Function}
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * スロットル
 * @param {Function} func - 関数
 * @param {number} limit - 制限時間（ミリ秒）
 * @returns {Function}
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================
// ストレージ
// ============================================

/**
 * ローカルストレージに保存
 * @param {string} key
 * @param {*} value
 */
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Storage save error:', e);
    }
}

/**
 * ローカルストレージから取得
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
function loadFromStorage(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
        console.error('Storage load error:', e);
        return defaultValue;
    }
}

/**
 * ローカルストレージから削除
 * @param {string} key
 */
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.error('Storage remove error:', e);
    }
}

// ============================================
// クリップボード
// ============================================

/**
 * クリップボードにコピー
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // フォールバック
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    } catch (e) {
        console.error('Clipboard copy error:', e);
        return false;
    }
}

// ============================================
// ファイル操作
// ============================================

/**
 * ファイルをダウンロード
 * @param {string} content - コンテンツ
 * @param {string} filename - ファイル名
 * @param {string} mimeType - MIMEタイプ
 */
function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * ファイルを読み込む
 * @param {File} file
 * @returns {Promise<string>}
 */
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// ============================================
// グローバルエクスポート
// ============================================

window.generateId = generateId;
window.generateUUID = generateUUID;
window.formatDate = formatDate;
window.calculateAge = calculateAge;
window.calculateTenure = calculateTenure;
window.truncate = truncate;
window.escapeHtml = escapeHtml;
window.csvSafe = csvSafe;
window.groupBy = groupBy;
window.getObjectDiff = getObjectDiff;
window.deepClone = deepClone;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.isValidDate = isValidDate;
window.debounce = debounce;
window.throttle = throttle;
window.saveToStorage = saveToStorage;
window.loadFromStorage = loadFromStorage;
window.removeFromStorage = removeFromStorage;
window.copyToClipboard = copyToClipboard;
window.downloadFile = downloadFile;
window.readFile = readFile;

console.log('✅ utils.js loaded');

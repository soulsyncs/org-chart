/**
 * org-chart 認証モジュール
 * Phase 2: 認証・権限管理
 *
 * 機能:
 * - Google OAuth ログイン（Supabase Auth）
 * - セッション管理
 * - 権限制御（admin/editor/viewer）
 * - 編集モード自動切替
 *
 * 作成日: 2026-01-25
 */

// ============================================
// グローバル認証状態
// ============================================

let currentUser = null;
let userRole = 'viewer';  // 'admin', 'editor', 'viewer'
let supabaseAuth = null;
let authInitialized = false;

// フィーチャーフラグ（段階的有効化用）
const AUTH_FEATURE_FLAGS = {
    ENABLE_AUTH: true,           // 認証機能を有効化
    ENABLE_RLS: true,            // RLSを有効化
    ALLOW_ANONYMOUS_VIEW: true,  // 未ログインでも閲覧可能
    ALLOW_ANONYMOUS_EDIT: true,  // 未ログインでも編集可能（開発・社内用）
    DEBUG_MODE: false            // デバッグログ出力
};

// ============================================
// Supabase Auth 初期化
// ============================================

/**
 * Supabase Auth クライアントを初期化
 * @returns {Promise<void>}
 */
async function initializeAuth() {
    if (authInitialized) {
        debugLog('Auth already initialized');
        return;
    }

    try {
        // Supabase JS SDKを動的にロード（CDN版）
        if (typeof supabase === 'undefined') {
            debugLog('Supabase SDK not loaded, skipping auth initialization');
            authInitialized = true;
            return;
        }

        // Supabase クライアント作成
        supabaseAuth = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // セッションを確認
        const { data: { session }, error } = await supabaseAuth.auth.getSession();

        if (error) {
            console.error('Session check error:', error);
        }

        if (session?.user) {
            currentUser = session.user;
            userRole = await checkEditPermission(currentUser.email);
            debugLog('User session found:', currentUser.email, 'role:', userRole);
        } else {
            debugLog('No active session');
        }

        // 認証状態変更リスナー
        supabaseAuth.auth.onAuthStateChange(async (event, session) => {
            debugLog('Auth state changed:', event);

            if (event === 'SIGNED_IN' && session?.user) {
                currentUser = session.user;
                userRole = await checkEditPermission(currentUser.email);

                // 編集権限があれば編集モードに
                if (userRole === 'admin' || userRole === 'editor') {
                    viewMode = 'edit';
                } else {
                    viewMode = 'view';
                }

                // 最終ログイン更新
                await updateLastLogin(currentUser.email);

                showNotification(`ログインしました: ${currentUser.email}`, 'success');

            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                userRole = 'viewer';
                viewMode = 'view';

                showNotification('ログアウトしました', 'info');
            }

            applyViewModeStyles();
            updateAuthUI();
        });

        authInitialized = true;
        updateAuthUI();

        // URLパラメータの?mode=viewより認証状態を優先
        if (currentUser && (userRole === 'admin' || userRole === 'editor')) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('mode') !== 'view') {
                viewMode = 'edit';
                applyViewModeStyles();
            }
        }

        debugLog('Auth initialization complete');

    } catch (error) {
        console.error('Auth initialization error:', error);
        authInitialized = true; // エラーでも初期化完了とする
    }
}

// ============================================
// ログイン / ログアウト
// ============================================

/**
 * Google OAuth でログイン
 * @returns {Promise<void>}
 */
async function signInWithGoogle() {
    if (!supabaseAuth) {
        showNotification('認証システムが初期化されていません', 'error');
        return;
    }

    try {
        const { data, error } = await supabaseAuth.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });

        if (error) {
            console.error('Login error:', error);
            showNotification('ログインに失敗しました: ' + error.message, 'error');
        }
        // リダイレクトが発生するため、ここでは成功メッセージは不要

    } catch (error) {
        console.error('Login exception:', error);
        showNotification('ログイン中にエラーが発生しました', 'error');
    }
}

/**
 * ログアウト
 * @returns {Promise<void>}
 */
async function signOut() {
    if (!supabaseAuth) {
        showNotification('認証システムが初期化されていません', 'error');
        return;
    }

    try {
        const { error } = await supabaseAuth.auth.signOut();

        if (error) {
            console.error('Logout error:', error);
            showNotification('ログアウトに失敗しました', 'error');
            return;
        }

        currentUser = null;
        userRole = 'viewer';
        viewMode = 'view';

        applyViewModeStyles();
        updateAuthUI();

    } catch (error) {
        console.error('Logout exception:', error);
        showNotification('ログアウト中にエラーが発生しました', 'error');
    }
}

// ============================================
// 権限チェック
// ============================================

/**
 * ユーザーの編集権限をチェック
 * @param {string} email - ユーザーのメールアドレス
 * @returns {Promise<string>} - 'admin', 'editor', または 'viewer'
 */
async function checkEditPermission(email) {
    if (!email) return 'viewer';

    try {
        const response = await fetch(
            `${SUPABASE_REST_URL}/org_chart_editors?email=eq.${encodeURIComponent(email)}&is_active=eq.true&select=role`,
            {
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        );

        if (!response.ok) {
            debugLog('Permission check failed:', response.status);
            return 'viewer';
        }

        const data = await response.json();

        if (data && data.length > 0) {
            debugLog('User role found:', data[0].role);
            return data[0].role;
        }

        debugLog('User not in editors list');
        return 'viewer';

    } catch (error) {
        console.error('Permission check error:', error);
        return 'viewer';
    }
}

/**
 * 操作前に権限をチェック
 * @param {string} requiredRole - 必要な権限（'admin', 'editor'）
 * @returns {boolean} - 権限があればtrue
 */
function hasPermission(requiredRole = 'editor') {
    // 匿名編集が許可されている場合（開発・社内用）
    if (AUTH_FEATURE_FLAGS.ALLOW_ANONYMOUS_EDIT && !currentUser) {
        // adminが必要な操作はログイン必須
        if (requiredRole === 'admin') {
            return false;
        }
        // editor権限は匿名でも許可
        return true;
    }

    if (!currentUser) {
        return false;
    }

    if (requiredRole === 'admin') {
        return userRole === 'admin';
    }

    if (requiredRole === 'editor') {
        return userRole === 'admin' || userRole === 'editor';
    }

    return true;
}

/**
 * 権限が必要な操作をラップ
 * @param {Function} action - 実行する関数
 * @param {string} requiredRole - 必要な権限
 * @returns {Function} - ラップされた関数
 */
function requireAuth(action, requiredRole = 'editor') {
    return async function(...args) {
        if (!hasPermission(requiredRole)) {
            if (!currentUser) {
                showNotification('この操作にはログインが必要です', 'warning');
                // ログインを促すダイアログを表示
                showLoginPrompt();
            } else {
                const roleText = requiredRole === 'admin' ? '管理者' : '編集者';
                showNotification(`この操作には${roleText}権限が必要です`, 'warning');
            }
            return;
        }
        return action.apply(this, args);
    };
}

// ============================================
// UI更新
// ============================================

/**
 * 認証UIを更新
 */
function updateAuthUI() {
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) {
        debugLog('authContainer not found, skipping UI update');
        return;
    }

    if (currentUser) {
        // ログイン済み
        const avatarUrl = currentUser.user_metadata?.avatar_url || '';
        const displayName = currentUser.user_metadata?.full_name || currentUser.email;

        const roleColors = {
            admin: 'bg-purple-100 text-purple-800',
            editor: 'bg-blue-100 text-blue-800',
            viewer: 'bg-gray-100 text-gray-800'
        };

        const roleLabels = {
            admin: '管理者',
            editor: '編集者',
            viewer: '閲覧者'
        };

        authContainer.innerHTML = `
            <div class="flex items-center gap-2 lg:gap-3">
                ${avatarUrl ? `
                    <img src="${avatarUrl}"
                         alt="${displayName}"
                         class="w-7 h-7 lg:w-8 lg:h-8 rounded-full border-2 border-white shadow-sm"
                         referrerpolicy="no-referrer"
                         onerror="this.style.display='none'">
                ` : `
                    <div class="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <i class="fas fa-user text-gray-600 text-xs"></i>
                    </div>
                `}
                <div class="hidden sm:block">
                    <div class="text-xs lg:text-sm font-medium text-gray-700 max-w-32 lg:max-w-48 truncate" title="${currentUser.email}">
                        ${displayName}
                    </div>
                </div>
                <span class="px-2 py-0.5 text-xs rounded-full ${roleColors[userRole] || roleColors.viewer}">
                    ${roleLabels[userRole] || roleLabels.viewer}
                </span>
                <button onclick="signOut()"
                        class="px-2 lg:px-3 py-1 lg:py-1.5 text-xs lg:text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-1"
                        style="color: #1a1a1a; border: 1px solid #e5e7eb;">
                    <i class="fas fa-sign-out-alt"></i>
                    <span class="hidden lg:inline">ログアウト</span>
                </button>
            </div>
        `;
    } else {
        // 未ログイン
        authContainer.innerHTML = `
            <button onclick="signInWithGoogle()"
                    class="flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 bg-white hover:bg-gray-50 rounded-lg transition shadow-sm"
                    style="border: 1px solid #e5e7eb;">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                     class="w-4 h-4 lg:w-5 lg:h-5" alt="Google">
                <span class="text-xs lg:text-sm font-medium text-gray-700">
                    <span class="hidden sm:inline">Googleで</span>ログイン
                </span>
            </button>
        `;
    }
}

/**
 * ログインを促すダイアログを表示
 */
function showLoginPrompt() {
    const promptHtml = `
        <div class="text-center py-4">
            <div class="mb-4">
                <i class="fas fa-lock text-4xl text-gray-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 mb-2">ログインが必要です</h3>
            <p class="text-sm text-gray-600 mb-4">
                編集機能を使用するにはログインしてください。<br>
                登録された編集者のみが編集できます。
            </p>
            <button onclick="signInWithGoogle(); closeModal('confirmModal');"
                    class="flex items-center justify-center gap-2 mx-auto px-6 py-2 bg-white hover:bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5" alt="Google">
                <span class="font-medium text-gray-700">Googleでログイン</span>
            </button>
        </div>
    `;

    document.getElementById('confirmContent').innerHTML = promptHtml;
    document.getElementById('confirmActions').innerHTML = `
        <button onclick="closeModal('confirmModal')" class="btn bg-gray-200 hover:bg-gray-300 text-gray-800">
            閉じる
        </button>
    `;
    openModal('confirmModal');
}

// ============================================
// 最終ログイン更新
// ============================================

/**
 * 最終ログイン日時を更新
 * @param {string} email - ユーザーのメールアドレス
 */
async function updateLastLogin(email) {
    if (!email) return;

    try {
        const response = await fetch(
            `${SUPABASE_REST_URL}/org_chart_editors?email=eq.${encodeURIComponent(email)}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    last_login_at: new Date().toISOString()
                })
            }
        );

        if (!response.ok) {
            debugLog('Failed to update last login:', response.status);
        }
    } catch (error) {
        debugLog('Update last login error:', error);
    }
}

// ============================================
// ユーティリティ
// ============================================

/**
 * デバッグログ出力
 * @param  {...any} args - ログ引数
 */
function debugLog(...args) {
    if (AUTH_FEATURE_FLAGS.DEBUG_MODE) {
        console.log('[Auth]', ...args);
    }
}

/**
 * 現在のユーザーを取得
 * @returns {Object|null} - ユーザーオブジェクト
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * 現在の役割を取得
 * @returns {string} - 'admin', 'editor', または 'viewer'
 */
function getUserRole() {
    return userRole;
}

/**
 * 認証が初期化されているかチェック
 * @returns {boolean}
 */
function isAuthInitialized() {
    return authInitialized;
}

/**
 * 認証トークンを取得（API呼び出し用）
 * @returns {Promise<string|null>}
 */
async function getAuthToken() {
    if (!supabaseAuth) return null;

    try {
        const { data: { session } } = await supabaseAuth.auth.getSession();
        return session?.access_token || null;
    } catch (error) {
        console.error('Get auth token error:', error);
        return null;
    }
}

// ============================================
// グローバルエクスポート
// ============================================

// グローバルスコープに公開（既存のapp.jsとの互換性のため）
window.initializeAuth = initializeAuth;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.checkEditPermission = checkEditPermission;
window.hasPermission = hasPermission;
window.requireAuth = requireAuth;
window.updateAuthUI = updateAuthUI;
window.getCurrentUser = getCurrentUser;
window.getUserRole = getUserRole;
window.isAuthInitialized = isAuthInitialized;
window.getAuthToken = getAuthToken;
window.AUTH_FEATURE_FLAGS = AUTH_FEATURE_FLAGS;

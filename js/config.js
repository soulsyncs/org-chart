/**
 * org-chart 設定ファイル
 * Phase 2: 認証・権限管理
 * Phase 7: コードモジュール分割（先行実装）
 *
 * このファイルは全てのJSファイルより先に読み込まれる必要があります。
 *
 * 作成日: 2026-01-25
 */

// ============================================
// Supabase 設定
// ============================================

const SUPABASE_URL = 'https://adzxpeboaoiojepcxlyc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkenhwZWJvYW9pb2plcGN4bHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzM4NDEsImV4cCI6MjA4MDc0OTg0MX0.j8cx0JjX0Y7npzTDF5-lyWqKEfVrfJv2148T2iK17as';
const SUPABASE_REST_URL = `${SUPABASE_URL}/rest/v1`;

// ============================================
// ソウルくんAPI 設定
// ============================================

const SOULKUN_API_BASE_URL = 'https://adzxpeboaoiojepcxlyc.supabase.co/functions/v1';

// ============================================
// 環境設定
// ============================================

const ENV = {
    // 開発環境かどうか（localhost or ファイル直接開き）
    isDevelopment: window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1' ||
                   window.location.protocol === 'file:',

    // 本番環境かどうか
    isProduction: window.location.hostname.includes('xserver') ||
                  window.location.hostname.includes('soulsyncs')
};

// ============================================
// フィーチャーフラグ（段階的有効化用）
// ============================================

const FEATURE_FLAGS = {
    // Phase 2: 認証機能
    ENABLE_AUTH: true,
    ENABLE_RLS: true,
    ALLOW_ANONYMOUS_VIEW: true,

    // Phase 3: ツリー表示改善
    ENABLE_ROLE_SORTING: true,
    ENABLE_ROLE_BADGES: true,
    ENABLE_UNSET_HIGHLIGHT: true,

    // Phase 4: ドラッグ&ドロップ強化
    ENABLE_SHIFT_DROP_CONCURRENT: true,

    // Phase 5: 監査ログ
    ENABLE_AUDIT_LOG: true,
    ENABLE_ROLLBACK: true,

    // Phase 6: 品質向上
    ENABLE_DASHBOARD: true,
    ENABLE_SYNC_PREVIEW: true,

    // デバッグモード
    DEBUG_MODE: ENV.isDevelopment
};

// ============================================
// 組織設定
// ============================================

const ORG_CONFIG = {
    // 組織ID（マルチテナント対応用）
    ORGANIZATION_ID: 'org_soulsyncs',

    // 会社名
    COMPANY_NAME: 'Soul Sync\'s合同会社'
};

// ============================================
// UI設定
// ============================================

const UI_CONFIG = {
    // 通知表示時間（ミリ秒）
    NOTIFICATION_DURATION: 3000,

    // ページネーション件数
    PAGE_SIZE: 50,

    // 検索デバウンス時間（ミリ秒）
    SEARCH_DEBOUNCE: 300
};

// ============================================
// グローバルエクスポート
// ============================================

// グローバルスコープに公開（既存コードとの互換性のため）
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.SUPABASE_REST_URL = SUPABASE_REST_URL;
window.SOULKUN_API_BASE_URL = SOULKUN_API_BASE_URL;
window.ENV = ENV;
window.FEATURE_FLAGS = FEATURE_FLAGS;
window.ORG_CONFIG = ORG_CONFIG;
window.UI_CONFIG = UI_CONFIG;

console.log('✅ config.js loaded (Environment:', ENV.isDevelopment ? 'Development' : 'Production', ')');

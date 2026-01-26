# Google OAuth セットアップ記録

## ✅ 完了日: 2026-01-26

## 現在の設定

### Google Cloud Console (soulkun-production)

| 項目 | 値 |
|------|-----|
| プロジェクト | soulkun-production |
| OAuth同意画面 | 外部（**本番環境** ✅） |
| アプリ名 | 組織図管理システム |
| クライアントID | 898513057014-kmpk084u8rfqsmgo6iarcrdhsm8ti9rq.apps.googleusercontent.com |
| JavaScript生成元 | http://localhost:8080, https://org-chart.soulsyncs.jp |
| リダイレクトURI | https://adzxpeboaoiojepcxlyc.supabase.co/auth/v1/callback |

### Supabase (adzxpeboaoiojepcxlyc)

| 項目 | 値 |
|------|-----|
| external_google_enabled | true |
| site_url | http://localhost:8080 |
| uri_allow_list | http://localhost:8080, https://org-chart.soulsyncs.jp, https://www.soulsyncs.jp |

### テストユーザー
- info@soulsyncs.jp

---

## 🚀 本番化手順（Google Cloud Console）

### ステップ1: Google Cloud Consoleにアクセス

https://console.cloud.google.com/apis/credentials/consent?project=soulkun-production

### ステップ2: OAuth同意画面の編集

1. 「アプリを編集」をクリック
2. 以下の情報を入力:

| 項目 | 値 |
|------|-----|
| アプリ名 | 組織図管理システム |
| ユーザーサポートメール | info@soulsyncs.jp |
| アプリのホームページ | https://org-chart.soulsyncs.jp |
| アプリのプライバシーポリシーリンク | https://org-chart.soulsyncs.jp/privacy.html |
| アプリの利用規約リンク | https://org-chart.soulsyncs.jp/terms.html |
| 承認済みドメイン | org-chart.soulsyncs.jp |
| デベロッパーの連絡先メールアドレス | info@soulsyncs.jp |

3. 「保存して次へ」をクリック

### ステップ3: スコープの確認

以下のスコープのみ使用（非機密スコープ）:
- `email` - ユーザーのメールアドレス
- `profile` - ユーザーの基本プロフィール
- `openid` - OpenID Connect認証

※ これらは非機密スコープなので、Google審査は**不要**です。

### ステップ4: 本番公開

1. OAuth同意画面に戻る
2. 「公開ステータス」セクションで「**アプリを公開**」をクリック
3. 確認ダイアログで「**確認**」をクリック

### ステップ5: 確認

- 公開ステータスが「**本番環境**」になっていることを確認
- テストユーザー制限が解除されていることを確認

---

## 動作確認

- [x] ローカル開発環境 (http://localhost:8080)
- [x] 本番環境 (https://org-chart.soulsyncs.jp) ✅ 本番化完了 (2026-01-26)

## トラブルシューティング

### "invalid_client" エラー
- クライアントIDがSupabaseとGoogle Cloud Consoleで一致しているか確認
- OAuthクライアント作成後、数分待ってから再試行

### "redirect_uri_mismatch" エラー
- リダイレクトURIが正確に `https://adzxpeboaoiojepcxlyc.supabase.co/auth/v1/callback` になっているか確認

### テストユーザー以外がログインできない
- OAuth同意画面が「本番環境」になっているか確認
- 上記の本番化手順を実行

### 「このアプリは確認されていません」警告
- 非機密スコープのみ使用の場合、警告は表示されないはず
- 表示される場合は「詳細」→「（アプリ名）に移動」で続行可能

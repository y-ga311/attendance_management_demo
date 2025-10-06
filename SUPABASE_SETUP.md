# Supabase設定ガイド

このアプリケーションをSupabaseと連携させるための設定手順です。

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトの設定から以下の情報を取得：
   - Project URL
   - Anon (public) key
   - Service role key

## 2. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の内容を追加：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 3. データベーススキーマの設定

1. SupabaseダッシュボードのSQLエディタにアクセス
2. `supabase-schema.sql` ファイルの内容をコピー&ペースト
3. SQLを実行してテーブルとポリシーを作成

## 4. 認証設定

1. Supabaseダッシュボードの「Authentication」セクションにアクセス
2. 「Settings」タブで以下を設定：
   - Site URL: `http://localhost:3000` (開発環境)
   - Redirect URLs: `http://localhost:3000/login`
   - Email confirmation: 必要に応じて有効/無効

## 5. アプリケーションの起動

```bash
npm run dev
```

## 6. 初回使用

1. アプリケーションにアクセス
2. 右上の「ログイン」をクリック
3. 新規アカウントを作成
4. ログイン後に出席登録が可能になります

## データベーステーブル

### users
- ユーザープロファイル情報
- 認証情報と連携

### attendance
- 出席データ
- ユーザーと関連付け

### classes
- クラス情報
- 教員が管理

### student_classes
- 学生とクラスの関連
- 多対多の関係

## セキュリティ

- Row Level Security (RLS) が有効
- ユーザーは自分のデータのみアクセス可能
- 管理者は全データにアクセス可能
- 教員は担当クラスのデータにアクセス可能

## トラブルシューティング

### 認証エラー
- 環境変数が正しく設定されているか確認
- Supabaseプロジェクトが有効か確認

### データベースエラー
- SQLスキーマが正しく実行されているか確認
- RLSポリシーが適切に設定されているか確認

### API エラー
- ブラウザの開発者ツールでネットワークタブを確認
- サーバーログでエラーメッセージを確認

-- attend_managementテーブルのRLSポリシーを修正

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Anyone can view attendance records" ON public.attend_management;
DROP POLICY IF EXISTS "Authenticated users can insert attendance records" ON public.attend_management;
DROP POLICY IF EXISTS "Authenticated users can update attendance records" ON public.attend_management;
DROP POLICY IF EXISTS "Only admins can delete attendance records" ON public.attend_management;

-- 新しいポリシーを作成（より緩い設定）
-- 全員が読み取り可能
CREATE POLICY "Anyone can view attendance records" ON public.attend_management FOR SELECT USING (true);

-- 全員が挿入可能（認証不要）
CREATE POLICY "Anyone can insert attendance records" ON public.attend_management FOR INSERT WITH CHECK (true);

-- 全員が更新可能（認証不要）
CREATE POLICY "Anyone can update attendance records" ON public.attend_management FOR UPDATE USING (true);

-- 全員が削除可能（認証不要）
CREATE POLICY "Anyone can delete attendance records" ON public.attend_management FOR DELETE USING (true);

-- または、RLSを一時的に無効化する場合（開発用）
-- ALTER TABLE public.attend_management DISABLE ROW LEVEL SECURITY;

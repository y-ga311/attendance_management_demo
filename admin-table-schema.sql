-- admin テーブル（実際のテーブル構造に合わせて修正）
CREATE TABLE public.admin (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id text UNIQUE NOT NULL,
    name text NOT NULL,
    role text NOT NULL
);

-- RLSを有効化
ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;

-- 全員が読み取り可能（ログイン用）
CREATE POLICY "Admins are viewable by everyone for authentication." ON public.admin FOR SELECT USING (true);

-- 管理者のみが挿入・更新・削除可能（実際の運用では適切な権限管理を行う）
CREATE POLICY "Only authenticated admins can manage admin accounts." ON public.admin FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Only authenticated admins can update admin accounts." ON public.admin FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only authenticated admins can delete admin accounts." ON public.admin FOR DELETE USING (auth.uid() IS NOT NULL);

-- サンプル管理者データ
INSERT INTO public.admin (admin_user_id, name, role)
VALUES
    ('admin', '管理者', 'admin'),
    ('teacher1', '教員1', 'teacher'),
    ('teacher2', '教員2', 'teacher');

-- インデックス作成
CREATE INDEX idx_admin_user_id ON public.admin(admin_user_id);
CREATE INDEX idx_admin_role ON public.admin(role);

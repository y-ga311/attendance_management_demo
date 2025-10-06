-- 出席管理テーブル作成
CREATE TABLE public.attend_management (
    id text NOT NULL,           -- 学籍番号
    name text NOT NULL,         -- 名前
    class text NOT NULL,        -- 所属
    time timestamp with time zone NOT NULL,  -- 時間
    place text,                 -- 場所
    attend text NOT NULL,       -- 出席状況
    created_at timestamp with time zone DEFAULT now() NOT NULL,  -- 作成日時
    updated_at timestamp with time zone DEFAULT now() NOT NULL   -- 更新日時
);

-- 主キー設定（学籍番号と時間の組み合わせ）
ALTER TABLE public.attend_management ADD CONSTRAINT attend_management_pkey PRIMARY KEY (id, time);

-- インデックス作成
CREATE INDEX idx_attend_management_id ON public.attend_management(id);
CREATE INDEX idx_attend_management_class ON public.attend_management(class);
CREATE INDEX idx_attend_management_time ON public.attend_management(time);
CREATE INDEX idx_attend_management_attend ON public.attend_management(attend);

-- RLS（Row Level Security）を有効化
ALTER TABLE public.attend_management ENABLE ROW LEVEL SECURITY;

-- 全員が読み取り可能
CREATE POLICY "Anyone can view attendance records" ON public.attend_management FOR SELECT USING (true);

-- 認証されたユーザーのみが挿入可能
CREATE POLICY "Authenticated users can insert attendance records" ON public.attend_management FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 認証されたユーザーのみが更新可能
CREATE POLICY "Authenticated users can update attendance records" ON public.attend_management FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 管理者のみが削除可能
CREATE POLICY "Only admins can delete attendance records" ON public.attend_management FOR DELETE USING (auth.uid() IS NOT NULL);


-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新日時自動更新トリガー
CREATE TRIGGER update_attend_management_updated_at 
    BEFORE UPDATE ON public.attend_management 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- テーブル情報確認用クエリ
-- SELECT 
--     column_name,
--     data_type,
--     is_nullable,
--     column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'attend_management' 
-- ORDER BY ordinal_position;

-- 授業時間設定テーブルの作成
-- このスクリプトをSupabaseのSQL Editorで実行してください

-- 1. period_settingsテーブルを作成
CREATE TABLE IF NOT EXISTS public.period_settings (
    id SERIAL PRIMARY KEY,
    period VARCHAR(10) NOT NULL UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_period_settings_period ON public.period_settings(period);

-- 3. テーブルとカラムにコメントを追加
COMMENT ON TABLE public.period_settings IS '授業時間設定テーブル';
COMMENT ON COLUMN public.period_settings.id IS '主キー';
COMMENT ON COLUMN public.period_settings.period IS '時限（例: 1限, 2限）';
COMMENT ON COLUMN public.period_settings.start_time IS '開始時間';
COMMENT ON COLUMN public.period_settings.end_time IS '終了時間';
COMMENT ON COLUMN public.period_settings.created_at IS '作成日時';
COMMENT ON COLUMN public.period_settings.updated_at IS '更新日時';

-- 4. デフォルトの時間割データを挿入
INSERT INTO public.period_settings (period, start_time, end_time) VALUES
    ('1限', '09:00:00', '10:30:00'),
    ('2限', '10:40:00', '12:10:00'),
    ('3限', '13:00:00', '14:30:00'),
    ('4限', '14:40:00', '16:10:00'),
    ('5限', '16:20:00', '17:50:00'),
    ('6限', '18:00:00', '19:30:00'),
    ('7限', '19:40:00', '21:10:00'),
    ('8限', '21:20:00', '22:50:00')
ON CONFLICT (period) DO NOTHING;

-- 5. 成功メッセージを表示
SELECT 'period_settingsテーブルの作成が完了しました' as message;
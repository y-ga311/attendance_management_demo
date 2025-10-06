-- period_settingsテーブルを作成するSQL
-- 時間割設定を保存するためのテーブル

CREATE TABLE IF NOT EXISTS period_settings (
  id SERIAL PRIMARY KEY,
  period VARCHAR(10) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_period_settings_period ON period_settings(period);

-- コメントを追加
COMMENT ON TABLE period_settings IS '時間割設定テーブル';
COMMENT ON COLUMN period_settings.period IS '限目（1限、2限など）';
COMMENT ON COLUMN period_settings.start_time IS '開始時間';
COMMENT ON COLUMN period_settings.end_time IS '終了時間';

-- 初期データを挿入（既存データがある場合はスキップ）
INSERT INTO period_settings (period, start_time, end_time) VALUES
('1限', '09:00', '10:30'),
('2限', '10:40', '12:10'),
('3限', '13:00', '14:30'),
('4限', '14:40', '16:10'),
('5限', '16:20', '17:50'),
('6限', '18:00', '19:30'),
('7限', '19:40', '21:10'),
('8限', '21:20', '22:50')
ON CONFLICT (period) DO NOTHING;

-- 実行完了メッセージ
SELECT 'period_settingsテーブルの作成が完了しました' as message;

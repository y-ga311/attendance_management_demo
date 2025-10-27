-- period_settingsテーブルのデバッグ用SQL
-- SupabaseのSQL Editorで実行してください

-- 1. period_settingsテーブルが存在するか確認
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'period_settings'
    ) THEN 'period_settingsテーブルは存在します'
    ELSE 'period_settingsテーブルは存在しません'
  END as table_status;

-- 2. period_settingsテーブルの構造を確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'period_settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. period_settingsテーブルのデータを確認
SELECT * FROM period_settings ORDER BY period;

-- 4. データが空の場合は、新しいデータを挿入
INSERT INTO period_settings (period, start_time, end_time) VALUES
    ('昼間部1限', '09:00:00', '10:30:00'),
    ('昼間部2限', '10:40:00', '12:10:00'),
    ('昼間部3限', '13:00:00', '14:30:00'),
    ('昼間部4限', '14:40:00', '16:10:00'),
    ('昼間部5限', '16:20:00', '17:50:00'),
    ('夜間部1限', '18:00:00', '19:30:00'),
    ('夜間部2限', '19:40:00', '21:10:00'),
    ('夜間部3限', '21:20:00', '22:50:00')
ON CONFLICT (period) DO NOTHING;

-- 5. 挿入後のデータを確認
SELECT '挿入後のデータ:' as message;
SELECT * FROM period_settings ORDER BY period;

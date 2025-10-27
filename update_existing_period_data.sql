-- 既存のattend_managementデータを昼間部X限形式に更新
-- SupabaseのSQL Editorで実行してください

-- 1. 現在のデータを確認
SELECT '更新前のデータ:' as message;
SELECT id, period, class, time FROM attend_management ORDER BY created_at DESC LIMIT 10;

-- 2. 昼間部の学生のperiodを更新
UPDATE attend_management 
SET period = CASE 
  WHEN period = '1限' AND class LIKE '%昼間部%' THEN '昼間部1限'
  WHEN period = '2限' AND class LIKE '%昼間部%' THEN '昼間部2限'
  WHEN period = '3限' AND class LIKE '%昼間部%' THEN '昼間部3限'
  WHEN period = '4限' AND class LIKE '%昼間部%' THEN '昼間部4限'
  WHEN period = '5限' AND class LIKE '%昼間部%' THEN '昼間部5限'
  WHEN period = '6限' AND class LIKE '%昼間部%' THEN '昼間部6限'
  ELSE period
END
WHERE class LIKE '%昼間部%' AND period LIKE '%限';

-- 3. 夜間部の学生のperiodを更新
UPDATE attend_management 
SET period = CASE 
  WHEN period = '1限' AND class LIKE '%夜間部%' THEN '夜間部1限'
  WHEN period = '2限' AND class LIKE '%夜間部%' THEN '夜間部2限'
  WHEN period = '3限' AND class LIKE '%夜間部%' THEN '夜間部3限'
  WHEN period = '4限' AND class LIKE '%夜間部%' THEN '夜間部4限'
  WHEN period = '5限' AND class LIKE '%夜間部%' THEN '夜間部5限'
  WHEN period = '6限' AND class LIKE '%夜間部%' THEN '夜間部6限'
  ELSE period
END
WHERE class LIKE '%夜間部%' AND period LIKE '%限';

-- 4. 更新後のデータを確認
SELECT '更新後のデータ:' as message;
SELECT id, period, class, time FROM attend_management ORDER BY created_at DESC LIMIT 10;

-- 5. 更新された件数を確認
SELECT 
  '更新結果:' as message,
  COUNT(*) as total_records,
  COUNT(CASE WHEN period LIKE '%昼間部%' THEN 1 END) as daytime_records,
  COUNT(CASE WHEN period LIKE '%夜間部%' THEN 1 END) as nighttime_records,
  COUNT(CASE WHEN period NOT LIKE '%昼間部%' AND period NOT LIKE '%夜間部%' THEN 1 END) as other_records
FROM attend_management;

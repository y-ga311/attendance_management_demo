-- attend_managementテーブルの構造を確認するSQL
-- テーブルのカラム一覧を取得

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'attend_management'
ORDER BY ordinal_position;

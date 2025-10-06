-- attend_managementテーブルにperiodカラムを追加するSQL
-- 時間割（1限、2限など）を格納するためのカラム

-- periodカラムを追加
ALTER TABLE attend_management 
ADD COLUMN period VARCHAR(10);

-- 既存データのperiodを設定（必要に応じて）
-- 例：既存データにデフォルト値を設定する場合
-- UPDATE attend_management 
-- SET period = '1限' 
-- WHERE period IS NULL;

-- カラムのコメントを追加（オプション）
COMMENT ON COLUMN attend_management.period IS '時間割（1限、2限、3限など）';

-- インデックスを追加（パフォーマンス向上のため）
CREATE INDEX idx_attend_management_period ON attend_management(period);

-- 複合インデックス（time、class、periodでの検索を高速化）
-- 注意：dateカラムが存在しない場合は、timeカラムを使用
CREATE INDEX IF NOT EXISTS idx_attend_management_time_class_period ON attend_management(time, class, period);

-- 実行完了メッセージ
SELECT 'attend_managementテーブルにperiodカラムの追加が完了しました' as message;

-- studentsテーブル用のスキーマ
-- 既存のテーブルがある場合は、不足しているカラムを追加してください

-- studentsテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY, -- ログインID
  gakusei_password TEXT NOT NULL, -- パスワード
  name TEXT,
  class TEXT,
  student_id TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- attendanceテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  attendance_type TEXT NOT NULL CHECK (attendance_type IN ('出席', '遅刻', '欠課', '早退')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  student_id TEXT,
  class TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_students_id ON students(id);
CREATE INDEX IF NOT EXISTS idx_attendance_name ON attendance(name);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);

-- Row Level Security (RLS) の設定（必要に応じて）
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 更新された時刻を自動設定する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新された時刻のトリガー
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance;
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータの挿入（テスト用）
INSERT INTO students (id, gakusei_password, name, class, student_id, email) 
VALUES 
  ('student001', 'password123', '東洋太郎', '22期生昼間部', '2024001', 'taro@example.com'),
  ('student002', 'password456', '山田花子', '22期生昼間部', '2024002', 'hanako@example.com'),
  ('student003', 'password789', '佐藤次郎', '22期生夜間部', '2024003', 'jiro@example.com')
ON CONFLICT (id) DO NOTHING;

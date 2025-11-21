// Supabaseクライアントを取得する関数（必要に応じて初期化）
const getSupabaseClient = async () => {
  try {
    const supabaseModule = await import('./supabase');
    return supabaseModule.supabase;
  } catch (error) {
    console.error('Supabase client initialization error:', error);
    return null;
  }
};

export interface Student {
  id: string;
  gakusei_password: string;
  name?: string;
  class?: string;
  student_id?: string;
  email?: string;
  [key: string]: unknown;
}

export type AuthStudent = Student;

export class StudentAuthService {
  // ログイン
  static async login(loginId: string, password: string): Promise<{ success: boolean; student?: AuthStudent; error?: string }> {
    try {
      // Supabaseクライアントを取得
      const supabase = await getSupabaseClient();
      
      // Supabaseが利用できない場合はエラーを返す
      if (!supabase) {
        console.error('Supabase client is null. Environment variables:', {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set',
        });
        return { success: false, error: 'データベースに接続できません。管理者にお問い合わせください。' };
      }

      console.log('Attempting login for gakusei_id:', loginId);

      // studentsテーブルから該当する学生を検索（gakusei_idで認証）
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('gakusei_id', loginId)
        .eq('gakusei_password', password);

      if (error) {
        console.error('ログインエラー (Supabase):', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return { success: false, error: `データベースエラーが発生しました: ${error.message}` };
      }

      console.log('Login query result:', {
        found: students?.length || 0,
        hasData: !!students,
      });

      if (!students || students.length === 0) {
        console.log('No student found with ID:', loginId);
        return { success: false, error: 'ログインIDまたはパスワードが正しくありません' };
      }

      const student = students[0];
      console.log('Login successful for student:', student.id);
      
      // セッションストレージに保存
      if (typeof window !== 'undefined') {
        localStorage.setItem('student_session', JSON.stringify(student));
      }

      return { success: true, student: student as AuthStudent };
    } catch (error) {
      console.error('ログインエラー (Exception):', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      return { success: false, error: `ログインに失敗しました: ${errorMessage}` };
    }
  }

  // 現在の学生を取得
  static getCurrentStudent(): AuthStudent | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const session = localStorage.getItem('student_session');
      if (!session) return null;
      
      return JSON.parse(session) as AuthStudent;
    } catch (error) {
      console.error('セッション取得エラー:', error);
      return null;
    }
  }

  // ログアウト
  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('student_session');
    }
  }

  // 認証状態の監視
  static onAuthStateChange(callback: (student: AuthStudent | null) => void) {
    // ローカルストレージの変更を監視
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'student_session') {
        const student = e.newValue ? JSON.parse(e.newValue) : null;
        callback(student);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      
      // 初期状態を取得
      const currentStudent = this.getCurrentStudent();
      callback(currentStudent);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }

    return () => {};
  }

  // 学生情報の更新
  static async updateStudent(studentId: string, updates: Partial<Student>): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        return { success: false, error: 'データベースに接続できません' };
      }

      const { error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', studentId);

      if (error) {
        console.error('学生情報更新エラー:', error);
        return { success: false, error: '学生情報の更新に失敗しました' };
      }

      // ローカルストレージも更新
      const currentStudent = this.getCurrentStudent();
      if (currentStudent && currentStudent.id === studentId) {
        const updatedStudent = { ...currentStudent, ...updates };
        localStorage.setItem('student_session', JSON.stringify(updatedStudent));
      }

      return { success: true };
    } catch (error) {
      console.error('学生情報更新エラー:', error);
      return { success: false, error: '学生情報の更新に失敗しました' };
    }
  }
}

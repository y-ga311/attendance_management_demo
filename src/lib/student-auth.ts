// Supabaseの環境変数が設定されている場合のみインポート
let supabase: any = null;

try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabaseModule = await import('./supabase');
    supabase = supabaseModule.supabase;
  }
} catch (error) {
  console.warn('Supabase client not available:', error);
}

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
      // Supabaseが利用できない場合はエラーを返す
      if (!supabase) {
        return { success: false, error: 'データベースに接続できません。管理者にお問い合わせください。' };
      }

      // studentsテーブルから該当する学生を検索
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', loginId)
        .eq('gakusei_password', password);

      if (error) {
        console.error('ログインエラー:', error);
        return { success: false, error: 'データベースエラーが発生しました' };
      }

      if (!students || students.length === 0) {
        return { success: false, error: 'ログインIDまたはパスワードが正しくありません' };
      }

      const student = students[0];
      
      // セッションストレージに保存
      if (typeof window !== 'undefined') {
        localStorage.setItem('student_session', JSON.stringify(student));
      }

      return { success: true, student: student as AuthStudent };
    } catch (error) {
      console.error('ログインエラー:', error);
      return { success: false, error: 'ログインに失敗しました' };
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

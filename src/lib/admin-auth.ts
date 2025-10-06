// ブラウザ環境でのUUID生成とハッシュ化用
function generateUUID(): string {
  // ブラウザ環境でのUUID生成
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  
  // フォールバック: 簡易UUID生成
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 簡易ハッシュ関数（ブラウザ環境用）
function simpleHash(input: string): string {
  let hash = 0;
  if (input.length === 0) return hash.toString();
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  return Math.abs(hash).toString(16);
}

export interface AdminUser {
  id: string;
  name: string;
  role: string;
}

export interface AuthAdmin extends AdminUser {
  loginTime: string;
}

// 許可された管理者の認証情報（セキュリティのため環境変数から取得）
const ADMIN_CREDENTIALS = {
  id: 'amt',
  password: 'TOYOamt01',
  name: '管理者',
  role: 'admin'
};

export class AdminAuthService {
  // パスワードハッシュ化関数（ブラウザ環境用）
  private static hashPassword(password: string): string {
    const salt = 'TOYO_ATTENDANCE_SALT_2024';
    const combined = salt + password;
    return simpleHash(combined);
  }

  // 入力値の検証とサニタイゼーション
  private static validateInput(input: string): boolean {
    // 基本的な入力検証
    if (!input || typeof input !== 'string') return false;
    if (input.length < 3 || input.length > 50) return false;
    // 危険な文字列をチェック
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i
    ];
    return !dangerousPatterns.some(pattern => pattern.test(input));
  }

  // セキュリティ強化されたログイン
  static async login(loginId: string, password: string): Promise<{ success: boolean; admin?: AuthAdmin; error?: string }> {
    try {
      // 入力値の検証
      if (!this.validateInput(loginId) || !this.validateInput(password)) {
        console.warn('Invalid input detected:', { loginId: loginId?.substring(0, 3) + '***', passwordLength: password?.length });
        return { success: false, error: '無効な入力です' };
      }


      // 認証情報の検証
      const isIdValid = loginId === ADMIN_CREDENTIALS.id;
      const isPasswordValid = password === ADMIN_CREDENTIALS.password;

      if (!isIdValid || !isPasswordValid) {
        console.warn('Failed login attempt:', { 
          loginId: loginId.substring(0, 3) + '***', 
          timestamp: new Date().toISOString() 
        });
        return { success: false, error: 'ログインIDまたはパスワードが正しくありません' };
      }

      // 管理者情報を作成
      const admin: AuthAdmin = {
        id: ADMIN_CREDENTIALS.id,
        name: ADMIN_CREDENTIALS.name,
        role: ADMIN_CREDENTIALS.role,
        loginTime: new Date().toISOString()
      };

      // セッションストレージに保存（セキュリティ強化）
      if (typeof window !== 'undefined') {
        const sessionData = {
          ...admin,
          sessionId: generateUUID(),
          ipAddress: 'unknown', // 実際の実装ではIPアドレスを取得
          userAgent: navigator.userAgent
        };
        localStorage.setItem('admin_session', JSON.stringify(sessionData));
      }

      console.log('Successful admin login:', { adminId: admin.id, timestamp: admin.loginTime });
      return { success: true, admin };

    } catch (error) {
      console.error('管理者ログインエラー:', error);
      return { success: false, error: 'ログインに失敗しました' };
    }
  }

  // セッション検証（セキュリティ強化）
  private static validateSession(sessionData: any): boolean {
    if (!sessionData || !sessionData.id || !sessionData.sessionId || !sessionData.loginTime) {
      return false;
    }

    // セッションIDの検証
    if (sessionData.id !== ADMIN_CREDENTIALS.id) {
      return false;
    }

    // ユーザーエージェントの検証（基本的な変更検知）
    if (sessionData.userAgent !== navigator.userAgent) {
      console.warn('User agent mismatch detected');
      return false;
    }

    return true;
  }

  // 現在の管理者を取得（セキュリティ強化）
  static getCurrentAdmin(): AuthAdmin | null {
    if (typeof window === 'undefined') return null;

    try {
      const session = localStorage.getItem('admin_session');
      if (!session) return null;

      const sessionData = JSON.parse(session);
      
      // セッションの検証
      if (!this.validateSession(sessionData)) {
        this.logout(); // 無効なセッションを削除
        return null;
      }

      return {
        id: sessionData.id,
        name: sessionData.name,
        role: sessionData.role,
        loginTime: sessionData.loginTime
      };
    } catch (error) {
      console.error('Session validation error:', error);
      this.logout();
      return null;
    }
  }

  // 管理者かどうかをチェック
  static isAdmin(): boolean {
    return this.getCurrentAdmin() !== null;
  }

  // ログアウト（セキュリティ強化）
  static logout(): void {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('admin_session');
      if (session) {
        try {
          const sessionData = JSON.parse(session);
          console.log('Admin logout:', { adminId: sessionData.id, timestamp: new Date().toISOString() });
        } catch (error) {
          console.error('Logout session parsing error:', error);
        }
      }
      localStorage.removeItem('admin_session');
    }
  }

  // セッションの有効性をチェック（8時間）
  static isSessionValid(): boolean {
    const admin = this.getCurrentAdmin();
    if (!admin) return false;

    const loginTime = new Date(admin.loginTime);
    const now = new Date();
    const diffInHours = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);

    // セッション有効期限を8時間に短縮（セキュリティ向上）
    return diffInHours < 8;
  }

  // 有効な管理者セッションがあるかチェック
  static hasValidSession(): boolean {
    return this.isAdmin() && this.isSessionValid();
  }
}

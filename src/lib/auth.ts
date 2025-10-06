import { supabase } from './supabase'
import type { User } from './supabase'

export type AuthUser = User;

export class AuthService {
  // 現在のユーザーを取得
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      if (!supabase) {
        return null;
      }
      
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return null
      }

      // ユーザープロファイル情報を取得
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        return null
      }

      return profile as AuthUser
    } catch (error) {
      console.error('ユーザー取得エラー:', error)
      return null
    }
  }

  // サインアップ
  static async signUp(email: string, password: string, userData: Partial<User>) {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase not available') };
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })

      if (error) throw error

      // ユーザープロファイルを作成
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            name: userData.name || '',
            student_id: userData.student_id,
            class: userData.class,
            role: userData.role || 'student'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)

        if (profileError) {
          console.error('プロファイル作成エラー:', profileError)
        }
      }

      return { data, error: null }
    } catch (error) {
      console.error('サインアップエラー:', error)
      return { data: null, error }
    }
  }

  // サインイン
  static async signIn(email: string, password: string) {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase not available') };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      return { data, error }
    } catch (error) {
      console.error('サインインエラー:', error)
      return { data: null, error }
    }
  }

  // サインアウト
  static async signOut() {
    try {
      if (!supabase) {
        return { error: new Error('Supabase not available') };
      }
      
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      console.error('サインアウトエラー:', error)
      return { error }
    }
  }

  // パスワードリセット
  static async resetPassword(email: string) {
    try {
      if (!supabase) {
        return { error: new Error('Supabase not available') };
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      return { error }
    } catch (error) {
      console.error('パスワードリセットエラー:', error)
      return { error }
    }
  }

  // ユーザープロファイル更新
  static async updateProfile(userId: string, updates: Partial<User>) {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase not available') };
      }
      
      const { data, error } = await supabase
        .from('users')
        // @ts-expect-error - Supabase型定義の問題を回避
        .update(updates as any)
        .eq('id', userId)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('プロファイル更新エラー:', error)
      return { data: null, error }
    }
  }

  // 認証状態の監視
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    if (!supabase) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    })
  }
}

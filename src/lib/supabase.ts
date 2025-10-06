import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// 環境変数が設定されている場合のみクライアントを作成
let supabase: any = null;

try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } else {
    console.warn('Supabase environment variables not set. Using mock client.');
    // モッククライアントを作成
    supabase = {
      from: (table: string) => ({
        select: (columns: string) => ({
          eq: (column: string, value: any) => ({
            eq: (column2: string, value2: any) => ({
              then: (callback: (result: any) => void) => {
                // モックデータを返す
                callback({ data: [], error: null });
              }
            })
          })
        }),
        insert: (data: any) => ({
          select: (columns: string) => ({
            single: () => ({
              then: (callback: (result: any) => void) => {
                // モックデータを返す
                callback({ data: data, error: null });
              }
            })
          })
        })
      })
    };
  }
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  supabase = null;
}

export { supabase }

// サーバーサイド用のクライアント（Service Role Key使用）
let supabaseAdmin: any = null;

try {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  } else {
    console.warn('Service Role Key not set. Using mock admin client.');
    supabaseAdmin = supabase; // 同じモッククライアントを使用
  }
} catch (error) {
  console.error('Failed to create Supabase admin client:', error);
  supabaseAdmin = null;
}

export { supabaseAdmin }

// データベースの型定義
export interface User {
  id: string
  email: string
  name: string
  student_id?: string
  class?: string
  role: 'student' | 'teacher' | 'admin'
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  user_id: string
  attendance_type: '出席' | '遅刻' | '欠課' | '早退'
  timestamp: string
  location?: string
  latitude?: number
  longitude?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface Class {
  id: string
  name: string
  description?: string
  teacher_id: string
  created_at: string
  updated_at: string
}

export interface StudentClass {
  id: string
  user_id: string
  class_id: string
  created_at: string
}

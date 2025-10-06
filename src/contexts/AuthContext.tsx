'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { StudentAuthService, type AuthStudent } from '@/lib/student-auth';

interface AuthContextType {
  user: AuthStudent | null;
  loading: boolean;
  signOut: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthStudent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初期ユーザー取得
    const initAuth = () => {
      try {
        const currentStudent = StudentAuthService.getCurrentStudent();
        setUser(currentStudent);
      } catch (error) {
        console.error('認証初期化エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 認証状態の監視
    const unsubscribe = StudentAuthService.onAuthStateChange((student) => {
      setUser(student);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signOut = () => {
    try {
      StudentAuthService.logout();
      setUser(null);
    } catch (error) {
      console.error('サインアウトエラー:', error);
    }
  };

  const refreshUser = () => {
    try {
      const currentStudent = StudentAuthService.getCurrentStudent();
      setUser(currentStudent);
    } catch (error) {
      console.error('ユーザー更新エラー:', error);
    }
  };

  const value = {
    user,
    loading,
    signOut,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

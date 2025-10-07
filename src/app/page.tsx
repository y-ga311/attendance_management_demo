'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const [hiddenInput, setHiddenInput] = useState('');
  const [showAdminLink, setShowAdminLink] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // クライアントサイドの確認とスクロール無効化
  useEffect(() => {
    setIsClient(true);
    
    // ホームページでのみスクロールを無効化
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      // クリーンアップ時にスクロールを有効化
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // 画面比率の検出
  useEffect(() => {
    if (!isClient) return;
    
    const checkOrientation = () => {
      const isPortraitMode = window.innerHeight > window.innerWidth;
      setIsPortrait(isPortraitMode);
    };
    
    // 初期チェック
    checkOrientation();
    
    // イベントリスナーを追加
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [isClient]);

  // 隠し入力の検証
  useEffect(() => {
    if (hiddenInput === 'toyo2255') {
      setShowAdminLink(true);
      setInputVisible(false);
      setHiddenInput(''); // 入力内容をクリア
    }
  }, [hiddenInput]);

  // 画面の上部をクリックした時の処理
  const handleSecretClick = () => {
    setInputVisible(true);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100 fixed inset-0">
      {/* Background image (responsive) - 縦長画像（ポートレート） */}
      <Image
        src="/hero-background.png"
        alt="アプリ背景（縦長）"
        fill
        priority
        className="transition-opacity duration-300"
        style={{
          opacity: isClient && isPortrait ? 1 : 0,
          zIndex: 0,
          pointerEvents: 'none',
          objectFit: 'cover',
          objectPosition: '50% 40%'
        }}
      />
      
      {/* Background image (responsive) - 横長画像（ランドスケープ） */}
      <Image
        src="/hero-background2.png"
        alt="アプリ背景（横長）"
        fill
        priority
        className="transition-opacity duration-300"
        style={{
          opacity: isClient && !isPortrait ? 1 : 0,
          zIndex: 0,
          pointerEvents: 'none',
          objectFit: 'cover',
          objectPosition: '50% 50%'
        }}
      />

      {/* Overlay (optional, readability for text) */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent" style={{ zIndex: 1 }} />
      
      {/* タイトルテキスト */}
      <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 text-center w-full px-4">
        <h1 className="font-black drop-shadow-2xl" style={{ 
          fontFamily: "'Rounded Mplus 1c', 'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', 'メイリオ', sans-serif", 
          color: '#0284c7',
          textShadow: '0 6px 30px rgba(0,0,0,0.8), 0 3px 15px rgba(0,0,0,0.6), 0 0 50px rgba(2, 132, 199, 0.8), 0 0 80px rgba(2, 132, 199, 0.4)',
          fontWeight: 900,
          WebkitTextStroke: '0.5px rgba(255,255,255,0.8)',
          letterSpacing: '0.08em',
          transform: 'scaleY(1.1)',
          fontSize: 'clamp(2.5rem, 12vw, 8rem)'
        }}>
          ピッとすくーる
        </h1>
      </div>

      {/* 右上のメニュー */}
      <div className="absolute top-4 right-4 flex items-center space-x-4 z-20">
        {loading ? (
          <div className="text-gray-500 text-sm">読み込み中...</div>
        ) : user ? (
          <>
            <span className="text-gray-600 text-sm">こんにちは、{user.name}さん</span>
            <button
              onClick={(e) => {
                e.stopPropagation(); // クリックイベントの伝播を停止
                signOut();
              }}
              className="text-gray-600 hover:text-gray-800 text-sm underline transition duration-200"
            >
              ログアウト
            </button>
            {/* 管理者メニュー（キーワード入力後に表示） */}
            {showAdminLink && (
              <Link 
                href="/admin/login"
                className="text-gray-600 hover:text-gray-800 text-sm underline transition duration-200"
                onClick={(e) => e.stopPropagation()} // クリックイベントの伝播を停止
              >
                管理者用
              </Link>
            )}
          </>
        ) : (
          showAdminLink && (
            <Link 
              href="/admin/login"
              className="text-gray-600 hover:text-gray-800 text-sm underline transition duration-200"
              onClick={(e) => e.stopPropagation()} // クリックイベントの伝播を停止
            >
              管理者用
            </Link>
          )
        )}
      </div>

      {/* 隠し入力フィールド */}
      {inputVisible && (
        <div 
          className="absolute inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center"
          onClick={(e) => {
            // 背景をクリックした場合のみフィールドを閉じる
            if (e.target === e.currentTarget) {
              setInputVisible(false);
              setHiddenInput('');
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-lg p-4 border-2 border-blue-500"
            onClick={(e) => e.stopPropagation()} // フィールド内のクリックは伝播を停止
          >
            <input
              type="text"
              value={hiddenInput}
              onChange={(e) => setHiddenInput(e.target.value)}
              placeholder="キーワードを入力..."
              className="w-48 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  // Enterキーで確定
                  if (hiddenInput === 'toyo2255') {
                    setShowAdminLink(true);
                    setInputVisible(false);
                    setHiddenInput('');
                  } else {
                    setInputVisible(false);
                    setHiddenInput('');
                  }
                }
                if (e.key === 'Escape') {
                  // Escapeキーでキャンセル
                  setInputVisible(false);
                  setHiddenInput('');
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-1">Enter: 確定 | Escape: キャンセル | 枠外クリック: キャンセル</p>
          </div>
        </div>
      )}
      
      {/* 下部のボタンエリア */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-sm px-4 z-30">
        <Link 
          href="/login"
          className="block w-full navy-button text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 text-lg shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 active:scale-95 text-center backdrop-blur-sm"
        >
          出席登録する
        </Link>
      </div>


      {/* 隠しトリガーエリア（画面左上の小さなエリア） */}
      <div 
        className="absolute top-0 left-0 w-16 h-16 opacity-0 cursor-pointer z-40"
        onClick={handleSecretClick}
        title="隠し機能"
      ></div>
    </div>
  );
}

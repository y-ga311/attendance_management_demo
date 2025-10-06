'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const [hiddenInput, setHiddenInput] = useState('');
  const [showAdminLink, setShowAdminLink] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);

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
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景画像エリア */}
      <div className="absolute inset-0">
        {/* 背景画像（デスクトップ用） */}
        <div 
          className="hidden md:block absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/hero-background.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {/* 画像の上に薄いオーバーレイ */}
          <div className="absolute inset-0 bg-white/20"></div>
        </div>
        
        {/* レスポンシブ対応の背景画像（タブレット用） */}
        <div 
          className="hidden sm:block md:hidden absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/hero-background.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'scroll'
          }}
        >
          {/* タブレット用のオーバーレイ */}
          <div className="absolute inset-0 bg-white/15"></div>
        </div>
        
        {/* レスポンシブ対応の背景画像（モバイル用） */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat sm:hidden"
          style={{
            backgroundImage: `url('/hero-background.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundAttachment: 'scroll'
          }}
        >
          {/* モバイル用のオーバーレイ */}
          <div className="absolute inset-0 bg-black/15"></div>
        </div>
        
        {/* フォールバック背景（画像が読み込まれない場合） */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 opacity-0 hover:opacity-100 transition-opacity duration-300">
          {/* 空の雲 - モバイル対応 */}
          <div className="absolute top-16 sm:top-20 left-1/4 w-12 sm:w-16 h-6 sm:h-8 bg-white rounded-full opacity-80 float-animation"></div>
          <div className="absolute top-24 sm:top-32 right-1/4 w-16 sm:w-20 h-8 sm:h-10 bg-white rounded-full opacity-80 float-animation" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-12 sm:top-16 right-1/3 w-10 sm:w-12 h-5 sm:h-6 bg-white rounded-full opacity-80 float-animation" style={{animationDelay: '2s'}}></div>
          
          {/* 学校の建物 - モバイル対応 */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-80 sm:w-96 h-40 sm:h-56 bg-amber-100 rounded-t-lg shadow-lg">
            {/* 時計塔 */}
            <div className="absolute -top-6 sm:-top-8 left-1/2 transform -translate-x-1/2 w-16 sm:w-20 h-16 sm:h-20 bg-green-300 rounded-full flex items-center justify-center shadow-md">
              <div className="w-12 sm:w-16 h-12 sm:h-16 bg-white rounded-full flex items-center justify-center">
                <div className="w-8 sm:w-12 h-8 sm:h-12 bg-gray-800 rounded-full flex items-center justify-center">
                  <div className="w-0.5 sm:w-1 h-4 sm:h-6 bg-white absolute top-0.5 sm:top-1"></div>
                  <div className="w-4 sm:w-6 h-0.5 sm:h-1 bg-white absolute left-0.5 sm:left-1"></div>
                </div>
              </div>
            </div>
            
            {/* 窓 - モバイル対応 */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3 p-4 sm:p-6 pt-6 sm:pt-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-6 sm:w-8 h-8 sm:h-10 bg-blue-200 rounded shadow-sm"></div>
              ))}
            </div>
            
            {/* 入り口 */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 sm:w-16 h-16 sm:h-20 bg-amber-200 rounded-t-lg"></div>
          </div>
          
          {/* キャラクター風の装飾要素 - モバイル対応 */}
          {/* キャラクター1（左側 - 茶色と黄色） */}
          <div className="absolute bottom-20 sm:bottom-24 left-1/4 w-12 sm:w-16 h-12 sm:h-16 bg-yellow-300 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-8 sm:w-12 h-8 sm:h-12 bg-orange-400 rounded-full flex items-center justify-center">
              <div className="w-6 sm:w-8 h-6 sm:h-8 bg-yellow-200 rounded-full"></div>
            </div>
          </div>
          
          {/* キャラクター2（中央 - 青と白） */}
          <div className="absolute bottom-16 sm:bottom-20 left-1/2 transform -translate-x-1/2 w-10 sm:w-14 h-10 sm:h-14 bg-blue-300 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-6 sm:w-10 h-6 sm:h-10 bg-white rounded-full flex items-center justify-center">
              <div className="w-4 sm:w-6 h-4 sm:h-6 bg-red-400 rounded-full"></div>
            </div>
          </div>
          
          {/* キャラクター3（右側 - オレンジと白） */}
          <div className="absolute bottom-18 sm:bottom-22 right-1/4 w-8 sm:w-12 h-8 sm:h-12 bg-orange-300 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-6 sm:w-8 h-6 sm:h-8 bg-white rounded-full flex items-center justify-center">
              <div className="w-3 sm:w-4 h-3 sm:h-4 bg-orange-400 rounded-full"></div>
            </div>
          </div>
          
          {/* キャラクター4（前 - 緑と白） */}
          <div className="absolute bottom-12 sm:bottom-16 right-1/3 w-6 sm:w-10 h-6 sm:h-10 bg-green-300 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-4 sm:w-6 h-4 sm:h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-2 sm:w-3 h-2 sm:h-3 bg-green-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* メインコンテンツ */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* 右上のメニュー */}
        <div className="absolute top-4 right-4 flex items-center space-x-4">
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
        <div className="flex-1 flex flex-col justify-end">
          <div className="p-4 sm:p-8 pb-8 sm:pb-12">
            <div className="max-w-sm sm:max-w-md mx-auto">
                      {/* メインボタン */}
                      <Link 
                        href="/login"
                        className="block w-full navy-button text-white font-bold py-4 sm:py-6 px-6 sm:px-8 rounded-xl sm:rounded-2xl transition-all duration-300 text-lg sm:text-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95 text-center"
                      >
                        出席登録する
                      </Link>
            </div>
          </div>
        </div>

        {/* 隠しトリガーエリア（画面左上の小さなエリア） */}
        <div 
          className="absolute top-0 left-0 w-16 h-16 opacity-0 cursor-pointer z-40"
          onClick={handleSecretClick}
          title="隠し機能"
        ></div>
      </div>
    </div>
  );
}

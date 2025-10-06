'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { getJSTISOString } from '@/lib/date-utils';

export default function ClassroomDisplayPage() {
  const [qrCode, setQrCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // 現在時刻を1秒ごとに更新
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timeInterval);
    };
  }, []);

  // QRコード生成機能
  const generateQRCode = async () => {
    try {
      setIsGenerating(true);
      
      const qrData = {
        type: 'attendance',
        timestamp: getJSTISOString(),
        action: '出席登録',
        location: {
          address: '大阪市西宮原'
        }
      };
      
      const qrString = JSON.stringify(qrData);
      const qrCodeDataURL = await QRCode.toDataURL(qrString, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCode(qrCodeDataURL);
    } catch (error) {
      console.error('QRコード生成エラー:', error);
      alert('QRコードの生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  // 自動更新機能（1分ごと）
  const startAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    
    const interval = setInterval(() => {
      generateQRCode();
    }, 1 * 60 * 1000); // 1分間隔
    
    setRefreshInterval(interval);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  // コンポーネントマウント時にQRコードを生成
  useEffect(() => {
    generateQRCode();
    startAutoRefresh();
    
    return () => {
      stopAutoRefresh();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            出席登録QRコード
          </h1>
          <p className="text-lg text-gray-600">
            このQRコードを学生が読み取って出席登録を行います
          </p>
        </div>

        {/* 現在時刻表示 */}
        <div className="text-center mb-8">
          <div className="bg-gray-100 rounded-lg p-4 inline-block">
            <p className="text-2xl font-mono text-gray-800">
              {currentTime.toLocaleString('ja-JP', { 
                timeZone: 'Asia/Tokyo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* QRコード表示エリア */}
        <div className="text-center mb-8">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-lg text-gray-600">QRコードを生成中...</p>
            </div>
          ) : qrCode ? (
            <div className="bg-white p-6 rounded-xl shadow-lg inline-block">
              <img 
                src={qrCode} 
                alt="出席登録QRコード" 
                className="max-w-full h-auto"
              />
            </div>
          ) : (
            <div className="py-16">
              <p className="text-lg text-gray-600">QRコードが生成されていません</p>
            </div>
          )}
        </div>

        {/* 操作ボタン */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={generateQRCode}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition duration-200 shadow-md"
          >
            {isGenerating ? '生成中...' : 'QRコード更新'}
          </button>
          
          <button
            onClick={refreshInterval ? stopAutoRefresh : startAutoRefresh}
            className={`px-6 py-3 rounded-lg font-medium transition duration-200 shadow-md ${
              refreshInterval 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {refreshInterval ? '自動更新停止' : '自動更新開始'}
          </button>
        </div>

        {/* 説明文 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">使用方法</h3>
          <ul className="text-blue-800 space-y-2">
            <li>• このQRコードを教室のスクリーンやモニターに表示してください</li>
            <li>• QRコードは1分ごとに自動更新されます（手動更新も可能）</li>
            <li>• 学生は <code className="bg-blue-100 px-2 py-1 rounded text-sm">/student</code> ページでQRコードを読み取ってください</li>
          </ul>
        </div>

        {/* フッター */}
        <div className="text-center mt-8 text-gray-500">
          <p>出席管理システム - 教室掲示用QRコード</p>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { StudentAuthService } from '@/lib/student-auth';
import { getJSTISOString } from '@/lib/date-utils';

// 未使用の型定義を削除

export default function StudentPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<{ id: string; name: string; class: string; time: string; place: string; attend: string } | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error' | 'processing'>('idle');
  const [currentTime, setCurrentTime] = useState(new Date());
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  // 未使用の変数を削除

  // 学生情報の読み込み
  useEffect(() => {
    loadStudentInfo();
    
    // 現在時刻を1秒ごとに更新（リアルタイム）
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // 1秒ごとに更新

    // QRコードリーダーの初期化
    codeReader.current = new BrowserMultiFormatReader();

    return () => {
      clearInterval(timeInterval);
      if (codeReader.current) {
        try {
          // @ts-expect-error - ZXingライブラリの型定義の問題を回避
          codeReader.current.reset();
        } catch (error) {
          console.log('QRリーダーのリセット:', error);
        }
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStudentInfo = () => {
    try {
      // ログインした学生の情報を取得
      const currentStudent = StudentAuthService.getCurrentStudent();
      
      if (currentStudent) {
        // studentsテーブルのデータを使用
        setStudentName(currentStudent.name || '');
        setStudentId(currentStudent.id || ''); // idカラムを学籍番号として表示
        setStudentClass(currentStudent.class || '');
      } else {
        // ログインしていない場合はログインページにリダイレクト
        router.push('/login');
      }
    } catch (error) {
      console.error('学生情報の読み込みに失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startScanning = async () => {
    if (!codeReader.current || !videoRef.current) return;

    try {
      setIsScanning(true);
      setScanError(null);
      setScanResult(null);
      setScanStatus('idle');

      // カメラからストリームを取得してスキャン開始
      await codeReader.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            setScanResult(result.getText());
            handleScanResult(result.getText());
            stopScanning();
          }
          if (error && error.name !== 'NotFoundException') {
            console.error('スキャンエラー:', error);
            setScanError('QRコードの読み取りに失敗しました');
          }
        }
      );
    } catch (error) {
      console.error('スキャン開始エラー:', error);
      setScanError('カメラへのアクセスが拒否されました。カメラの許可を確認してください。');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      try {
        // @ts-expect-error - ZXingライブラリの型定義の問題を回避
        codeReader.current.reset();
      } catch (error) {
        console.log('QRリーダーのリセット:', error);
      }
    }
    setIsScanning(false);
  };

  const handleScanResult = async (result: string) => {
    try {
      setScanStatus('processing');
      setScanError(null);
      
      const attendanceInfo = JSON.parse(result);
      console.log('読み取り成功:', attendanceInfo);
      
      // 現在の日付を取得（YYYY-MM-DD形式）
      const now = new Date();
      const todayString = now.toLocaleDateString('ja-JP', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).replace(/\//g, '-'); // YYYY-MM-DD形式に変換
      
      // 有効日付範囲チェック（新しいロジック：日付範囲）
      if (attendanceInfo.validDateStart && attendanceInfo.validDateEnd) {
        const validStart = attendanceInfo.validDateStart;
        const validEnd = attendanceInfo.validDateEnd;
        
        console.log('日付範囲チェック:', {
          today: todayString,
          validStart: validStart,
          validEnd: validEnd
        });
        
        if (todayString < validStart) {
          setScanError(`このQRコードはまだ有効ではありません。\n有効期限: ${validStart} 〜 ${validEnd}\n現在の日付: ${todayString}`);
          setScanStatus('error');
          return;
        }
        
        if (todayString > validEnd) {
          setScanError(`このQRコードの有効期限が切れています。\n有効期限: ${validStart} 〜 ${validEnd}\n現在の日付: ${todayString}`);
          setScanStatus('error');
          return;
        }
        
        console.log('有効日付範囲チェック通過');
      }
      // 単一日付チェック（後方互換性）
      else if (attendanceInfo.validDate) {
        const validDate = attendanceInfo.validDate;
        
        console.log('日付チェック:', {
          today: todayString,
          validDate: validDate
        });
        
        if (todayString !== validDate) {
          setScanError(`このQRコードは ${validDate} のみ有効です。\n現在の日付: ${todayString}`);
          setScanStatus('error');
          return;
        }
        
        console.log('有効日付チェック通過');
      }
      // 旧形式の有効期限チェック（後方互換性のため残す）
      else if (attendanceInfo.validity) {
        const startTime = new Date(attendanceInfo.validity.start);
        const endTime = new Date(attendanceInfo.validity.end);
        
        if (now < startTime) {
          setScanError(`QRコードはまだ有効ではありません。有効開始時刻: ${startTime.toLocaleString('ja-JP')}`);
          setScanStatus('error');
          return;
        }
        
        if (now > endTime) {
          setScanError(`QRコードの有効期限が切れています。有効終了時刻: ${endTime.toLocaleString('ja-JP')}`);
          setScanStatus('error');
          return;
        }
        
        console.log('有効期限チェック通過（旧形式）:', {
          now: now.toLocaleString('ja-JP'),
          start: startTime.toLocaleString('ja-JP'),
          end: endTime.toLocaleString('ja-JP')
        });
      }
      
      setAttendanceData(attendanceInfo);
      
      // 出席データをattend_managementテーブルに挿入
      await insertAttendanceData(attendanceInfo);
      
      // 成功状態を設定
      setScanStatus('success');
      setScanResult('出席登録が完了しました！');
      
    } catch (error) {
      console.error('QRコードデータの解析エラー:', error);
      setScanError('無効なQRコードです');
      setScanStatus('error');
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setScanError(null);
    setAttendanceData(null);
    setScanStatus('idle');
  };


  const handleLogout = () => {
    StudentAuthService.logout();
    router.push('/');
  };

  // 出席データをattend_managementテーブルに挿入
  const insertAttendanceData = async (attendanceInfo: { type: string; timestamp: string; action: string; location: string; period?: string }) => {
    try {
      const currentStudent = StudentAuthService.getCurrentStudent();
      if (!currentStudent) {
        console.error('学生情報が取得できません');
        return;
      }

      // 位置情報を取得
      let location = '';
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000
            });
          });
          
          // 位置情報を住所に変換（簡易版）
          location = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        } catch (geoError) {
          console.warn('位置情報の取得に失敗:', geoError);
          location = '位置情報取得失敗';
        }
      } else {
        location = '位置情報未対応';
      }

      // 出席状況を決定
      let attendStatus = '1'; // デフォルトは出席（1）
      if (attendanceInfo.type === 'late') {
        attendStatus = '3'; // 遅刻用QRコードの場合は「3」
      } else if (attendanceInfo.type === 'early') {
        attendStatus = '4'; // 早退用QRコードの場合は「4」
      } else if (attendanceInfo.type === 'attendance') {
        attendStatus = '1'; // 教室掲示用QRコードの場合は「1」（出席）
      }

      // 出席データをAPIに送信（時限は時間から自動判定）
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: currentStudent.id,
          name: currentStudent.name,
          class: currentStudent.class,
          time: getJSTISOString(), // 日本時間で記録
          place: location,
          attend: attendStatus
          // periodは送信しない（APIで時間から自動判定）
        }),
      });

      if (response.ok) {
        console.log('出席データの登録に成功しました');
      } else {
        console.error('出席データの登録に失敗しました');
      }
    } catch (error) {
      console.error('出席データ挿入エラー:', error);
    }
  };


  // 未使用の関数を削除

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white shadow-lg border-b border-gray-200 flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">ピッとすくーる</h1>
            <div className="flex space-x-2">
              <button 
                onClick={handleLogout}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-medium transition duration-200 shadow-md"
              >
                ログアウト
              </button>
              <Link 
                href="/"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition duration-200 shadow-md"
              >
                ホーム
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 px-4 py-6 overflow-auto">
            {/* 学生情報カード */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="text-center">
                <h2 className="text-lg font-bold text-gray-900">学生名: {studentName}</h2>
                <div className="mt-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">学籍番号:</span> {studentId} | <span className="font-medium">クラス:</span> {studentClass}
                  </p>
                </div>
            <p className="text-sm text-gray-600 mt-3">現在時刻: {currentTime.toLocaleTimeString('ja-JP')}</p>
              </div>
            </div>

        {/* スキャナーエリア */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">QRコードスキャナー</h3>
          
          {/* カメラ表示エリア */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-4">
            <video
              ref={videoRef}
              className="w-full h-64 sm:h-80 object-cover"
              playsInline
              muted
            />
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black bg-opacity-50 rounded-lg p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto mb-2"></div>
                  <p className="text-white text-sm">スキャン中...</p>
                    </div>
                  </div>
                )}
                    </div>

          {/* スキャンボタン */}
          <div className="flex space-x-4 justify-center">
            {!isScanning ? (
              <button
                onClick={startScanning}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition duration-200 shadow-md"
              >
                QRコード読取
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition duration-200 shadow-md"
              >
                スキャン停止
              </button>
            )}
            {(scanResult || scanError || attendanceData) && (
              <button
                onClick={resetScan}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-medium transition duration-200 shadow-md"
              >
                リセット
              </button>
                )}
              </div>
            </div>


        {/* スキャン結果表示 */}
        {attendanceData && scanStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6">
            <h3 className="text-lg font-bold text-green-900 mb-4 text-center flex items-center justify-center">
              <span className="text-xl mr-2">✓</span>
              出席情報を読み取りました
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">学生名:</span>
                <span className="text-sm text-gray-900">{attendanceData.name}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">出席状況:</span>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  attendanceData.attend === '1' ? 'bg-green-100 text-green-800' :
                  attendanceData.attend === '2' ? 'bg-red-100 text-red-800' :
                  attendanceData.attend === '3' ? 'bg-yellow-100 text-yellow-800' :
                  attendanceData.attend === '4' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {attendanceData.attend === '1' ? '✓' :
                   attendanceData.attend === '2' ? '✗' :
                   attendanceData.attend === '3' ? '!' :
                   attendanceData.attend === '4' ? '→' : '?'} {attendanceData.attend}
                </span>
                  </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">時刻:</span>
                <span className="text-sm text-gray-900">
                  {new Date(attendanceData.time).toLocaleString('ja-JP')}
                      </span>
              </div>
              
              {attendanceData.place && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">位置情報:</p>
                  <p className="text-xs text-gray-600 break-words">
                    {attendanceData.place || '位置情報なし'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 画面中央のオーバーレイ表示 */}
      {(scanStatus === 'processing' || scanStatus === 'success' || scanStatus === 'error') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            {/* 処理中表示 */}
            {scanStatus === 'processing' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">QRコードを処理中...</h3>
                <p className="text-gray-600">しばらくお待ちください</p>
              </div>
            )}

            {/* 成功表示 */}
            {scanStatus === 'success' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 text-3xl">✓</span>
                </div>
                <h3 className="text-xl font-bold text-green-700 mb-2">出席登録完了！</h3>
                <p className="text-green-600 mb-4">正常に登録されました</p>
                <button
                  onClick={resetScan}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition duration-200"
                >
                  閉じる
                </button>
              </div>
            )}

            {/* エラー表示 */}
            {scanStatus === 'error' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-red-600 text-3xl">×</span>
                </div>
                <h3 className="text-xl font-bold text-red-700 mb-2">登録失敗</h3>
                <p className="text-red-600 mb-4 text-sm">{scanError}</p>
                <button
                  onClick={resetScan}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition duration-200"
                >
                  閉じる
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}


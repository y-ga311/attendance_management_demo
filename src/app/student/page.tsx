'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';

type AttendanceType = '出席' | '遅刻' | '欠課' | '早退';

export default function StudentPage() {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedType, setSelectedType] = useState<AttendanceType>('出席');
  const [location, setLocation] = useState<{latitude: number, longitude: number, address: string} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'getting' | 'success' | 'error'>('idle');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDetails, setShowDetails] = useState(false);

  const attendanceTypes: AttendanceType[] = ['出席', '遅刻', '欠課', '早退'];

  useEffect(() => {
    loadUserConfig();
    
    // 現在時刻を1分ごとに更新
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1分ごとに更新

    return () => clearInterval(timeInterval);
  }, []);

  // QRコードを定期的に自動更新（30秒ごと）
  useEffect(() => {
    if (studentName) {
      const interval = setInterval(() => {
        generateQRCode(studentName, selectedType);
      }, 30000); // 30秒ごとに更新

      return () => clearInterval(interval);
    }
  }, [studentName, selectedType]);

  // 現在時刻が変更された時に選択可能な出席状況を更新
  useEffect(() => {
    const availableTypes = getAvailableAttendanceTypes();
    if (!availableTypes.includes(selectedType)) {
      const defaultType = getDefaultAttendanceType();
      setSelectedType(defaultType);
    }
  }, [currentTime]);

  // 出席タイプが変更された時にQRコードを即座に更新
  useEffect(() => {
    if (studentName) {
      generateQRCode(studentName, selectedType);
    }
  }, [selectedType, studentName]);

  const loadUserConfig = async () => {
    try {
      const response = await fetch('/api/user-config');
      const data = await response.json();
      setStudentName(data.user_info.name);
      setStudentId(data.user_info.student_id || '');
      setStudentClass(data.user_info.class || '');
      generateQRCode(data.user_info.name, selectedType);
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocation = async (): Promise<{latitude: number, longitude: number, address: string} | null> => {
    if (!navigator.geolocation) {
      console.error('Geolocation APIがサポートされていません');
      setLocationStatus('error');
      return null;
    }

    return new Promise((resolve) => {
      setLocationStatus('getting');
      
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5分間キャッシュ
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          
          // 逆ジオコーディングで住所を取得
          let address = '住所を取得中...';
          try {
            const response = await fetch(
              `/api/geocode?lat=${coords.latitude}&lon=${coords.longitude}`
            );
            const data = await response.json();
            if (data.display_name) {
              address = data.display_name;
            }
          } catch (error) {
            console.error('住所の取得に失敗:', error);
            address = '住所取得失敗';
          }
          
          const locationData = {
            ...coords,
            address: address
          };
          
          setLocation(locationData);
          setLocationStatus('success');
          resolve(locationData);
        },
        (error) => {
          console.error('位置情報の取得に失敗:', error);
          setLocationStatus('error');
          resolve(null);
        },
        options
      );
    });
  };

  const generateQRCode = async (name: string, type: AttendanceType) => {
    try {
      // GPS位置情報を取得
      const currentLocation = await getLocation();
      
      const qrData = JSON.stringify({
        name: name,
        attendance_type: type,
        timestamp: new Date().toISOString(),
        location: currentLocation
      });
      
      // 画面サイズに応じてQRコードのサイズを調整
      const screenWidth = window.innerWidth;
      let qrWidth = 280; // デフォルトサイズ
      
      if (screenWidth >= 1024) {
        qrWidth = 400; // 大画面
      } else if (screenWidth >= 768) {
        qrWidth = 320; // タブレット
      } else if (screenWidth >= 480) {
        qrWidth = 280; // スマートフォン（横）
      } else {
        qrWidth = 240; // スマートフォン（縦）
      }
      
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: qrWidth,
        margin: 4,
        scale: 8,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      setQrCodeUrl(qrCodeDataUrl);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('QRコード生成に失敗:', error);
    }
  };

  const getTypeColor = (type: AttendanceType) => {
    switch (type) {
      case '出席': return 'bg-green-500 text-white';
      case '遅刻': return 'bg-yellow-500 text-white';
      case '欠課': return 'bg-red-500 text-white';
      case '早退': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTypeIcon = (type: AttendanceType) => {
    switch (type) {
      case '出席': return '✅';
      case '遅刻': return '⏰';
      case '欠課': return '❌';
      case '早退': return '🏃';
      default: return '📝';
    }
  };

  // 現在時刻に基づいて利用可能な出席状況を取得
  const getAvailableAttendanceTypes = (): AttendanceType[] => {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const totalMinutes = hour * 60 + minute;
    
    // 昼間部の場合
    if (studentClass.includes('昼間部')) {
      // 1限: 9:10-10:40
      if (totalMinutes >= 9 * 60 + 0 && totalMinutes <= 10 * 60 + 30) {
        if (totalMinutes >= 9 * 60 + 0 && totalMinutes <= 9 * 60 + 10) return ['出席'];
        else if (totalMinutes >= 9 * 60 + 10 && totalMinutes <= 9 * 60 + 30) return ['遅刻'];
        else if (totalMinutes >= 10 * 60 + 20 && totalMinutes <= 10 * 60 + 40) return ['早退'];
        else return ['欠課'];
      }
      // 2限: 10:50-12:20
      else if (totalMinutes >= 10 * 60 + 40 && totalMinutes <= 12 * 60 + 0) {
        if (totalMinutes >= 10 * 60 + 40 && totalMinutes <= 10 * 60 + 50) return ['出席'];
        else if (totalMinutes >= 10 * 60 + 50 && totalMinutes <= 11 * 60 + 10) return ['遅刻'];
        else if (totalMinutes >= 12 * 60 + 0 && totalMinutes <= 12 * 60 + 20) return ['早退'];
        else return ['欠課'];
      }
      // 3限: 13:20-14:50
      else if (totalMinutes >= 13 * 60 + 10 && totalMinutes <= 15 * 60 + 0) {
        if (totalMinutes >= 13 * 60 + 10 && totalMinutes <= 13 * 60 + 20) return ['出席'];
        else if (totalMinutes >= 13 * 60 + 20 && totalMinutes <= 13 * 60 + 40) return ['遅刻'];
        else if (totalMinutes >= 14 * 60 + 30 && totalMinutes <= 14 * 60 + 50) return ['早退'];
        else return ['欠課'];
      }
      // 4限: 15:00-16:30
      else if (totalMinutes >= 14 * 60 + 50 && totalMinutes <= 16 * 60 + 40) {
        if (totalMinutes >= 14 * 60 + 50 && totalMinutes <= 15 * 60 + 0) return ['出席'];
        else if (totalMinutes >= 15 * 60 + 0 && totalMinutes <= 15 * 60 + 20) return ['遅刻'];
        else if (totalMinutes >= 16 * 60 + 10 && totalMinutes <= 16 * 60 + 30) return ['早退'];
        else return ['欠課'];
      }
    }
    // 夜間部の場合
    else if (studentClass.includes('夜間部')) {
      // 1限: 18:00-19:30
      if (totalMinutes >= 17 * 60 + 50 && totalMinutes <= 19 * 60 + 40) {
        if (totalMinutes >= 17 * 60 + 50 && totalMinutes <= 18 * 60 + 0) return ['出席'];
        else if (totalMinutes >= 18 * 60 + 0 && totalMinutes <= 18 * 60 + 20) return ['遅刻'];
        else if (totalMinutes >= 19 * 60 + 10 && totalMinutes <= 19 * 60 + 30) return ['早退'];
        else return ['欠課'];
      }
      // 2限: 19:40-21:10
      else if (totalMinutes >= 19 * 60 + 30 && totalMinutes <= 21 * 60 + 20) {
        if (totalMinutes >= 19 * 60 + 30 && totalMinutes <= 19 * 60 + 40) return ['出席'];
        else if (totalMinutes >= 19 * 60 + 40 && totalMinutes <= 20 * 60 + 0) return ['遅刻'];
        else if (totalMinutes >= 20 * 60 + 50 && totalMinutes <= 21 * 60 + 10) return ['早退'];
        else return ['欠課'];
      }
    }
    
    // その他の時間は欠課
    return ['欠課'];
  };

  // 現在時刻に基づいてデフォルトの出席状況を取得
  const getDefaultAttendanceType = (): AttendanceType => {
    const availableTypes = getAvailableAttendanceTypes();
    return availableTypes[0] || '出席';
  };

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
            <h1 className="text-xl font-bold text-gray-900">📱 出席管理</h1>
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition duration-200 shadow-md"
              >
                {showDetails ? '📊 非表示' : '📊 表示'}
              </button>
              <Link 
                href="/"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition duration-200 shadow-md"
              >
                🏠 ホーム
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 px-4 py-6 overflow-auto">
        {/* 詳細情報（表示ボタンが押された時のみ表示） */}
        {showDetails && (
          <div className="space-y-4 mb-6">
            {/* 学生情報カード */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">👤</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">学生名: {studentName}</h2>
                <div className="mt-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">学籍番号:</span> {studentId} | <span className="font-medium">クラス:</span> {studentClass}
                  </p>
                </div>
                <p className="text-sm text-gray-600 mt-3">現在時刻: {new Date().toLocaleTimeString('ja-JP')}</p>
              </div>
            </div>

            {/* 位置情報カード */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-center flex items-center justify-center">
                <span className="text-xl mr-2">📍</span>
                位置情報
              </h3>
              <div className="text-center">
                {locationStatus === 'idle' && (
                  <div className="text-gray-500">
                    <p className="text-sm">QRコード生成時に位置情報を取得します</p>
                  </div>
                )}
                {locationStatus === 'getting' && (
                  <div className="text-blue-600">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm">位置情報を取得中...</p>
                  </div>
                )}
                {locationStatus === 'success' && location && (
                  <div className="text-green-600">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-xl">✅</span>
                      <span className="text-sm font-medium">位置情報取得成功</span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p className="font-medium">住所:</p>
                      <p className="text-xs break-words">{location.address}</p>
                    </div>
                  </div>
                )}
                {locationStatus === 'error' && (
                  <div className="text-red-600">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-xl">❌</span>
                      <span className="text-sm font-medium">位置情報取得失敗</span>
                    </div>
                    <p className="text-xs text-gray-600">位置情報の許可を確認してください</p>
                  </div>
                )}
              </div>
            </div>

            {/* 出席状況選択 */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">出席状況を選択</h3>
              
              {/* 現在時刻表示 */}
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">
                  現在時刻: <span className="font-medium text-gray-900">{currentTime.toLocaleTimeString('ja-JP')}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const hour = currentTime.getHours();
                    const minute = currentTime.getMinutes();
                    const totalMinutes = hour * 60 + minute;

                    if (studentClass.includes('昼間部')) {
                      if (totalMinutes >= 9 * 60 + 0 && totalMinutes <= 10 * 60 + 30) {
                        if (totalMinutes >= 9 * 60 + 0 && totalMinutes <= 9 * 60 + 10) return '1限: 9:00-9:10 出席のみ選択可能';
                        else if (totalMinutes >= 9 * 60 + 10 && totalMinutes <= 9 * 60 + 30) return '1限: 9:10-9:30 遅刻のみ選択可能';
                        else if (totalMinutes >= 10 * 60 + 20 && totalMinutes <= 10 * 60 + 40) return '1限: 10:20-10:40 早退のみ選択可能';
                        else return '1限: その他の時間 欠課のみ選択可能';
                      }
                      else if (totalMinutes >= 10 * 60 + 40 && totalMinutes <= 12 * 60 + 0) {
                        if (totalMinutes >= 10 * 60 + 40 && totalMinutes <= 10 * 60 + 50) return '2限: 10:40-10:50 出席のみ選択可能';
                        else if (totalMinutes >= 10 * 60 + 50 && totalMinutes <= 11 * 60 + 10) return '2限: 10:50-11:10 遅刻のみ選択可能';
                        else if (totalMinutes >= 12 * 60 + 0 && totalMinutes <= 12 * 60 + 20) return '2限: 12:00-12:20 早退のみ選択可能';
                        else return '2限: その他の時間 欠課のみ選択可能';
                      }
                      else if (totalMinutes >= 13 * 60 + 10 && totalMinutes <= 15 * 60 + 0) {
                        if (totalMinutes >= 13 * 60 + 10 && totalMinutes <= 13 * 60 + 20) return '3限: 13:10-13:20 出席のみ選択可能';
                        else if (totalMinutes >= 13 * 60 + 20 && totalMinutes <= 13 * 60 + 40) return '3限: 13:20-13:40 遅刻のみ選択可能';
                        else if (totalMinutes >= 14 * 60 + 30 && totalMinutes <= 14 * 60 + 50) return '3限: 14:30-14:50 早退のみ選択可能';
                        else return '3限: その他の時間 欠課のみ選択可能';
                      }
                      else if (totalMinutes >= 14 * 60 + 50 && totalMinutes <= 16 * 60 + 40) {
                        if (totalMinutes >= 14 * 60 + 50 && totalMinutes <= 15 * 60 + 0) return '4限: 14:50-15:00 出席のみ選択可能';
                        else if (totalMinutes >= 15 * 60 + 0 && totalMinutes <= 15 * 60 + 20) return '4限: 15:00-15:20 遅刻のみ選択可能';
                        else if (totalMinutes >= 16 * 60 + 10 && totalMinutes <= 16 * 60 + 30) return '4限: 16:10-16:30 早退のみ選択可能';
                        else return '4限: その他の時間 欠課のみ選択可能';
                      }
                    }
                    else if (studentClass.includes('夜間部')) {
                      if (totalMinutes >= 17 * 60 + 50 && totalMinutes <= 19 * 60 + 40) {
                        if (totalMinutes >= 17 * 60 + 50 && totalMinutes <= 18 * 60 + 0) return '1限: 17:50-18:00 出席のみ選択可能';
                        else if (totalMinutes >= 18 * 60 + 0 && totalMinutes <= 18 * 60 + 20) return '1限: 18:00-18:20 遅刻のみ選択可能';
                        else if (totalMinutes >= 19 * 60 + 10 && totalMinutes <= 19 * 60 + 30) return '1限: 19:10-19:30 早退のみ選択可能';
                        else return '1限: その他の時間 欠課のみ選択可能';
                      }
                      else if (totalMinutes >= 19 * 60 + 30 && totalMinutes <= 21 * 60 + 20) {
                        if (totalMinutes >= 19 * 60 + 30 && totalMinutes <= 19 * 60 + 40) return '2限: 19:30-19:40 出席のみ選択可能';
                        else if (totalMinutes >= 19 * 60 + 40 && totalMinutes <= 20 * 60 + 0) return '2限: 19:40-20:00 遅刻のみ選択可能';
                        else if (totalMinutes >= 20 * 60 + 50 && totalMinutes <= 21 * 60 + 10) return '2限: 20:50-21:10 早退のみ選択可能';
                        else return '2限: その他の時間 欠課のみ選択可能';
                      }
                    }
                    return '授業時間外: 欠課のみ選択可能';
                  })()}
                </p>
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                {attendanceTypes.map((type) => {
                  const availableTypes = getAvailableAttendanceTypes();
                  const isAvailable = availableTypes.includes(type);
                  
                  return (
                    <button
                      key={type}
                      onClick={() => isAvailable && setSelectedType(type)}
                      disabled={!isAvailable}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                        selectedType === type
                          ? `${getTypeColor(type)} border-transparent shadow-lg transform scale-105`
                          : isAvailable
                          ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span className="text-2xl mb-2">{getTypeIcon(type)}</span>
                      <span className="text-xs font-medium">{type}</span>
                      {!isAvailable && (
                        <span className="text-xs text-gray-400 mt-1">選択不可</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* QRコード表示（常に表示） */}
        <div className="bg-white rounded-2xl shadow-lg p-2 sm:p-4 flex-1 flex flex-col min-h-0">
          <div className="text-center flex flex-col h-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2 sm:mb-4 flex-shrink-0">QRコード</h3>
            
            <div className="bg-gray-50 rounded-xl p-2 sm:p-4 border-2 border-dashed border-gray-300 flex-1 flex items-center justify-center min-h-0">
              {qrCodeUrl ? (
                <div className="text-center w-full h-full flex flex-col items-center justify-center">
                  <img 
                    src={qrCodeUrl} 
                    alt="出席用QRコード" 
                    className="w-auto h-auto object-contain max-w-full max-h-full mb-4"
                    style={{
                      minHeight: '150px',
                      minWidth: '150px'
                    }}
                  />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      選択状況: <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedType)}`}>
                        {selectedType}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      位置情報: <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        locationStatus === 'success' ? 'bg-green-100 text-green-800' :
                        locationStatus === 'error' ? 'bg-red-100 text-red-800' :
                        locationStatus === 'getting' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {locationStatus === 'success' ? '取得済み' :
                         locationStatus === 'error' ? '取得失敗' :
                         locationStatus === 'getting' ? '取得中' : '未取得'}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p>QRコードを生成中...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

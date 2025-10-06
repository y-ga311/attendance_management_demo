'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminAuthService } from '@/lib/admin-auth';
import QRCode from 'qrcode';
import { getJSTISOString, getJSTDateString } from '@/lib/date-utils';

type AttendanceData = {
  id: string;
  name: string;
  student_id: string;
  class: string;
  attendance_type: '出席' | '遅刻' | '欠課' | '早退';
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
};

export default function AdminPage() {
  const router = useRouter();
  const [attendanceList, setAttendanceList] = useState<AttendanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getJSTDateString());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'qr' | 'export' | 'settings'>('export');
  const [exportDataCount, setExportDataCount] = useState<number>(0);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [exportData, setExportData] = useState<any[]>([]);
  
  // QRコード生成用の状態
  const [qrType, setQrType] = useState<'late' | 'early'>('late');
  const [qrCode, setQrCode] = useState<string>('');
  const [qrGenerated, setQrGenerated] = useState(false);
  
  // QRコード有効期限設定用の状態
  const [qrValidityStart, setQrValidityStart] = useState<string>('');
  const [qrValidityEnd, setQrValidityEnd] = useState<string>('');
  const [qrValidityEnabled, setQrValidityEnabled] = useState<boolean>(false);
  
  // 授業時間設定用の状態
  const [classSettings, setClassSettings] = useState<{[key: string]: {startTime: string, endTime: string}}>({});
  
  // 時間割設定用の状態
  const [periodSettings, setPeriodSettings] = useState<{[key: string]: {startTime: string, endTime: string}}>({
    '1限': { startTime: '09:00', endTime: '10:30' },
    '2限': { startTime: '10:40', endTime: '12:10' },
    '3限': { startTime: '13:00', endTime: '14:30' },
    '4限': { startTime: '14:40', endTime: '16:10' },
    '5限': { startTime: '16:20', endTime: '17:50' },
    '6限': { startTime: '18:00', endTime: '19:30' },
    '7限': { startTime: '19:40', endTime: '21:10' },
    '8限': { startTime: '21:20', endTime: '22:50' }
  });

  useEffect(() => {
    // 管理者認証チェック
    if (!AdminAuthService.hasValidSession()) {
      router.push('/admin/login');
      return;
    }
    
    loadAttendanceData();
  }, [selectedDate, router]);

  // エクスポート用データの件数とデータを取得
  const loadExportDataCount = async () => {
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        class: filterClass,
        period: filterPeriod
      });
      
      const response = await fetch(`/api/attendance/export?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setExportDataCount(data.attendance?.length || 0);
        setExportData(data.attendance || []);
      } else {
        setExportDataCount(0);
        setExportData([]);
      }
    } catch (error) {
      console.error('エクスポートデータ件数取得エラー:', error);
      setExportDataCount(0);
      setExportData([]);
    }
  };

  // フィルター条件が変更された時にエクスポートデータ件数を更新
  useEffect(() => {
    if (activeTab === 'export') {
      loadExportDataCount();
    }
  }, [selectedDate, filterClass, filterPeriod, activeTab]);

  // クラス一覧を取得
  const loadAvailableClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      
      if (response.ok) {
        setAvailableClasses(data.classes || []);
      } else {
        console.error('クラス一覧取得エラー:', data.error);
        setAvailableClasses([]);
      }
    } catch (error) {
      console.error('クラス一覧取得エラー:', error);
      setAvailableClasses([]);
    }
  };

  // エクスポートタブがアクティブになった時にクラス一覧を取得
  useEffect(() => {
    if (activeTab === 'export') {
      loadAvailableClasses();
    }
  }, [activeTab]);

  const loadAttendanceData = async () => {
    try {
      setIsLoading(true);
      // 実際のAPIエンドポイントに置き換える
      const response = await fetch('/api/attendance');
      const data = await response.json();
      setAttendanceList(data.attendance || []);
    } catch (error) {
      console.error('出席データの読み込みに失敗:', error);
      // デモ用のダミーデータ
      setAttendanceList([
        {
          id: '1',
          name: '田中太郎',
          student_id: 'S001',
          class: '昼間部1年A組',
          attendance_type: '出席',
          timestamp: getJSTISOString(),
          location: {
            latitude: 34.7203,
            longitude: 135.2485,
            address: '大阪府大阪市北区'
          }
        },
        {
          id: '2',
          name: '佐藤花子',
          student_id: 'S002',
          class: '昼間部1年A組',
          attendance_type: '遅刻',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          location: {
            latitude: 34.7203,
            longitude: 135.2485,
            address: '大阪府大阪市北区'
          }
        },
        {
          id: '3',
          name: '山田次郎',
          student_id: 'S003',
          class: '夜間部1年B組',
          attendance_type: '出席',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          location: {
            latitude: 34.7203,
            longitude: 135.2485,
            address: '大阪府大阪市北区'
          }
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case '1':
      case '出席': return 'bg-green-100 text-green-800 border-green-200';
      case '2':
      case '遅刻': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '3':
      case '早退': return 'bg-blue-100 text-blue-800 border-blue-200';
      case '4':
      case '欠課': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '1':
      case '出席': return '✓';
      case '2':
      case '遅刻': return '!';
      case '3':
      case '早退': return '→';
      case '4':
      case '欠課': return '×';
      default: return '?';
    }
  };

  const handleLogout = () => {
    AdminAuthService.logout();
    router.push('/');
  };

  // QRコード生成機能
  const generateQRCode = async () => {
    try {
      // 有効期限の検証
      if (qrValidityEnabled) {
        if (!qrValidityStart || !qrValidityEnd) {
          alert('有効期限の開始日時と終了日時を設定してください');
          return;
        }
        
        const startTime = new Date(qrValidityStart);
        const endTime = new Date(qrValidityEnd);
        const now = new Date();
        
        if (startTime >= endTime) {
          alert('有効期限の開始日時は終了日時より前である必要があります');
          return;
        }
        
        if (now > endTime) {
          alert('有効期限の終了日時は現在時刻より後である必要があります');
          return;
        }
      }

      const qrData = {
        type: qrType,
        timestamp: getJSTISOString(),
        action: qrType === 'late' ? '遅刻登録' : '早退登録',
        validity: qrValidityEnabled ? {
          start: qrValidityStart,
          end: qrValidityEnd
        } : null
      };
      
      const qrString = JSON.stringify(qrData);
      const qrCodeDataURL = await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCode(qrCodeDataURL);
      setQrGenerated(true);
    } catch (error) {
      console.error('QRコード生成エラー:', error);
      alert('QRコードの生成に失敗しました');
    }
  };

  // 出席状況の数値を日本語に変換
  const getAttendanceTypeText = (type: string) => {
    switch (type) {
      case '1': return '出席';
      case '2': return '欠席';
      case '3': return '遅刻';
      case '4': return '早退';
      default: return type; // 既に日本語の場合はそのまま
    }
  };

  // CSVエクスポート機能
  const exportToCSV = async () => {
    try {
      // 新しいAPIエンドポイントからデータを取得
      const params = new URLSearchParams({
        date: selectedDate,
        class: filterClass,
        period: filterPeriod
      });
      
      const response = await fetch(`/api/attendance/export?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'データの取得に失敗しました');
      }
      
      const exportData = data.attendance || [];
      
      const csvHeaders = ['学籍番号', '日付', '時限', '出欠区分'];
      const csvData = exportData.map((item: any) => [
        item.student_id, // 学籍番号
        selectedDate || new Date().toISOString().split('T')[0], // 日付
        item.period ? item.period.replace('限', '') : '不明', // 時限（数字のみ）
        item.attendance_type // 出欠区分（数字）
      ]);
      
      const csvContent = [csvHeaders, ...csvData]
        .map((row: any[]) => row.map((field: any) => `"${field}"`).join(','))
        .join('\n');
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `出席管理_${selectedDate}_${filterClass === 'all' ? 'all' : filterClass}_${filterPeriod === 'all' ? 'all' : filterPeriod}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('CSVエクスポートエラー:', error);
      alert('CSVエクスポートに失敗しました: ' + error.message);
    }
  };

  // 授業時間設定の保存
  const saveClassSettings = (className: string, startTime: string, endTime: string) => {
    setClassSettings(prev => ({
      ...prev,
      [className]: { startTime, endTime }
    }));
  };

  // 時間割設定の保存
  const savePeriodSettings = (period: string, startTime: string, endTime: string) => {
    setPeriodSettings(prev => ({
      ...prev,
      [period]: { startTime, endTime }
    }));
  };

  // 時間割設定をデータベースに保存
  const savePeriodSettingsToDB = async () => {
    // 確認ダイアログを表示
    const confirmed = window.confirm(
      '時間割設定を保存しますか？\n\n' +
      'この設定は学生の出席登録時の限目判定に使用されます。\n' +
      '保存後は、QRコード読み取り時間に基づいて自動的に限目が判定されます。'
    );

    if (!confirmed) {
      return;
    }

    try {
      // ローディング状態を表示
      const loadingDialog = document.createElement('div');
      loadingDialog.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="margin-bottom: 10px;">⏳</div>
            <div>時間割設定を保存中...</div>
          </div>
        </div>
      `;
      document.body.appendChild(loadingDialog);

      const response = await fetch('/api/period-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: periodSettings }),
      });

      // ローディングダイアログを削除
      document.body.removeChild(loadingDialog);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '時間割設定の保存に失敗しました');
      }

      // 成功ダイアログを表示
      alert('✅ 時間割設定を保存しました！\n\n設定内容:\n' + 
        Object.entries(periodSettings)
          .map(([period, times]) => `${period}: ${times.startTime} - ${times.endTime}`)
          .join('\n')
      );
    } catch (error: any) {
      console.error('時間割設定保存エラー:', error);
      
      // エラーダイアログを表示
      let errorMessage = '❌ 時間割設定の保存に失敗しました\n\n';
      
      if (error.message.includes('period_settingsテーブルが存在しません')) {
        errorMessage += '🔧 データベースのセットアップが必要です\n\n';
        errorMessage += '以下のSQLをSupabaseのSQL Editorで実行してください:\n\n';
        errorMessage += '1. add_period_column.sql\n';
        errorMessage += '2. create_period_settings_table.sql\n\n';
        errorMessage += 'これらのファイルはプロジェクトルートにあります。';
      } else {
        errorMessage += 'エラー詳細: ' + error.message + '\n\n';
        errorMessage += 'データベースの接続に問題がある可能性があります。\n';
        errorMessage += '管理者に連絡してください。';
      }
      
      alert(errorMessage);
    }
  };

  // QRコード画像の保存
  const downloadQRCode = () => {
    if (!qrCode) return;
    
    try {
      const link = document.createElement('a');
      link.href = qrCode;
      link.download = `${qrType === 'late' ? '遅刻用' : '早退用'}QRコード_${getJSTDateString()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('QRコード保存エラー:', error);
      alert('QRコードの保存に失敗しました');
    }
  };

  const filteredAttendance = attendanceList.filter(item => {
    const matchesType = filterType === 'all' || item.attendance_type === filterType;
    const matchesClass = filterClass === 'all' || item.class === filterClass;
    
    // 限目フィルター（時間帯に基づく）
    let matchesPeriod = true;
    if (filterPeriod !== 'all') {
      const itemTime = new Date(item.timestamp);
      const hour = itemTime.getHours();
      
      // 限目の時間帯マッピング
      const periodMap: {[key: string]: {start: number, end: number}} = {
        '1限': {start: 8, end: 10},
        '2限': {start: 10, end: 12},
        '3限': {start: 13, end: 15},
        '4限': {start: 15, end: 17},
        '5限': {start: 17, end: 19},
        '6限': {start: 19, end: 21},
        '7限': {start: 21, end: 23},
        '8限': {start: 23, end: 24}
      };
      
      const period = periodMap[filterPeriod];
      if (period) {
        matchesPeriod = hour >= period.start && hour < period.end;
      }
    }
    
    return matchesType && matchesClass && matchesPeriod;
  });

  const uniqueClasses = [...new Set(attendanceList.map(item => item.class))];

  const getAttendanceStats = () => {
    const total = attendanceList.length;
    const present = attendanceList.filter(item => item.attendance_type === '出席').length;
    const late = attendanceList.filter(item => item.attendance_type === '遅刻').length;
    const absent = attendanceList.filter(item => item.attendance_type === '欠課').length;
    const early = attendanceList.filter(item => item.attendance_type === '早退').length;

    return { total, present, late, absent, early };
  };

  const stats = getAttendanceStats();

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
            <h1 className="text-xl font-bold text-gray-900">管理者ダッシュボード</h1>
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
          
          {/* タブナビゲーション */}
          <div className="mt-4">
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab('export')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                  activeTab === 'export'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                CSVエクスポート
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                  activeTab === 'qr'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                QRコード発行
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                授業時間設定
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 px-4 py-6 overflow-auto">
        {activeTab === 'qr' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">遅刻/早退用QRコード発行</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-black mb-2">QRコードの種類</label>
                <div className="flex space-x-4">
                  <label className="flex items-center text-black font-medium cursor-pointer hover:text-blue-600 transition-colors">
                    <input
                      type="radio"
                      value="late"
                      checked={qrType === 'late'}
                      onChange={(e) => setQrType(e.target.value as 'late' | 'early')}
                      className="mr-2 accent-blue-600"
                    />
                    遅刻用
                  </label>
                  <label className="flex items-center text-black font-medium cursor-pointer hover:text-blue-600 transition-colors">
                    <input
                      type="radio"
                      value="early"
                      checked={qrType === 'early'}
                      onChange={(e) => setQrType(e.target.value as 'late' | 'early')}
                      className="mr-2 accent-blue-600"
                    />
                    早退用
                  </label>
                </div>
              </div>

              {/* 有効期限設定 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="qrValidityEnabled"
                    checked={qrValidityEnabled}
                    onChange={(e) => setQrValidityEnabled(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="qrValidityEnabled" className="text-sm font-medium text-black">
                    有効期限を設定する
                  </label>
                </div>
                
                {qrValidityEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        有効開始日時
                      </label>
                      <input
                        type="datetime-local"
                        value={qrValidityStart}
                        onChange={(e) => setQrValidityStart(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        有効終了日時
                      </label>
                      <input
                        type="datetime-local"
                        value={qrValidityEnd}
                        onChange={(e) => setQrValidityEnd(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                      />
                    </div>
                  </div>
                )}
                
                {qrValidityEnabled && (
                  <p className="text-xs text-black mt-2">
                    設定した期間外でQRコードを読み取った場合は無効になります
                  </p>
                )}
              </div>
              
              <button
                onClick={generateQRCode}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition duration-200 shadow-md"
              >
                QRコード生成
              </button>
              
              {qrGenerated && qrCode && (
                <div className="text-center">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">
                    {qrType === 'late' ? '遅刻用' : '早退用'}QRコード
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg inline-block">
                    <img src={qrCode} alt="QR Code" className="mx-auto" />
                  </div>
                  <p className="text-sm text-black mt-2">
                    学生にこのQRコードをスキャンしてもらってください
                  </p>
                  <button
                    onClick={downloadQRCode}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200 shadow-md"
                  >
                    画像として保存
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">CSVエクスポート</h3>
            
            <div className="space-y-6">
              {/* 条件指定フォーム */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4">エクスポート条件</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 日付選択 */}
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">日付</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                  </div>
                  
                  {/* 限目選択 */}
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">限目</label>
                    <select
                      value={filterPeriod}
                      onChange={(e) => setFilterPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    >
                      <option value="all">すべて</option>
                      <option value="1限">1限</option>
                      <option value="2限">2限</option>
                      <option value="3限">3限</option>
                      <option value="4限">4限</option>
                      <option value="5限">5限</option>
                      <option value="6限">6限</option>
                      <option value="7限">7限</option>
                      <option value="8限">8限</option>
                    </select>
                  </div>
                  
                  {/* クラス選択 */}
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">クラス</label>
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    >
                      <option value="all">すべて</option>
                      {availableClasses.map(className => (
                        <option key={className} value={className}>{className}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* エクスポート設定表示 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">📋 エクスポート条件一覧</h4>
                <p className="text-sm text-blue-800 mb-4">
                  以下の条件でCSVファイルをエクスポートします
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center mb-2">
                      <span className="text-blue-600 mr-2">📅</span>
                      <span className="font-medium text-gray-700">日付</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedDate || '未選択'}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center mb-2">
                      <span className="text-blue-600 mr-2">⏰</span>
                      <span className="font-medium text-gray-700">限目</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {filterPeriod === 'all' ? 'すべて' : filterPeriod}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center mb-2">
                      <span className="text-blue-600 mr-2">👥</span>
                      <span className="font-medium text-gray-700">クラス</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {filterClass === 'all' ? 'すべて' : filterClass}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center mb-2">
                      <span className="text-blue-600 mr-2">📊</span>
                      <span className="font-medium text-gray-700">対象件数</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {exportDataCount}件
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>CSV出力形式:</strong> 学籍番号, 日付, 時限, 出欠区分
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    出欠区分: 1=出席, 2=欠席, 3=遅刻, 4=早退
                  </p>
                </div>
              </div>
              
              <button
                onClick={exportToCSV}
                disabled={exportDataCount === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition duration-200 shadow-md"
              >
                CSVファイルをダウンロード
              </button>
              
              {exportDataCount === 0 && (
                <p className="text-sm text-gray-500">
                  エクスポートするデータがありません。条件設定を確認してください。
                </p>
              )}
              
              {/* 対象者データ表示 */}
              {exportDataCount > 0 && (
                <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">👥 対象者データ一覧</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    選択された条件に基づく対象者データ（{exportDataCount}件）
                  </p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-3 py-2 text-left font-medium text-gray-700">学籍番号</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">学生名</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">クラス</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">時限</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">出欠区分</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exportData.slice(0, 20).map((item, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900">{item.student_id}</td>
                            <td className="px-3 py-2 text-gray-900">{item.name}</td>
                            <td className="px-3 py-2 text-gray-900">{item.class}</td>
                            <td className="px-3 py-2 text-gray-900">
                              {item.period ? item.period.replace('限', '') : '不明'}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.attendance_type === '1' ? 'bg-green-100 text-green-800' :
                                item.attendance_type === '2' ? 'bg-red-100 text-red-800' :
                                item.attendance_type === '3' ? 'bg-yellow-100 text-yellow-800' :
                                item.attendance_type === '4' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.attendance_type === '1' ? '出席' :
                                 item.attendance_type === '2' ? '欠席' :
                                 item.attendance_type === '3' ? '遅刻' :
                                 item.attendance_type === '4' ? '早退' :
                                 item.attendance_type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {exportDataCount > 20 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        表示中: 1-20件 / 全{exportDataCount}件
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        全データはCSVファイルでダウンロードできます
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">時間割設定</h3>
              <button
                onClick={savePeriodSettingsToDB}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200 shadow-md"
              >
                設定を保存
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">設定説明</h4>
                <p className="text-blue-800 text-sm">
                  各限目の時間を設定してください。学生がQRコードを読み取った時間に基づいて、自動的に該当する限目が判定されます。
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">⚠️ 初回セットアップが必要な場合</h4>
                <p className="text-yellow-800 text-sm mb-2">
                  初回使用時は、データベースにテーブルを作成する必要があります。
                </p>
                <div className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                  <strong>必要なSQLファイル:</strong><br/>
                  • add_period_column.sql<br/>
                  • create_period_settings_table.sql<br/>
                  <br/>
                  これらをSupabaseのSQL Editorで実行してください。
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(periodSettings).map(([period, times]) => (
                  <div key={period} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-4">{period}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">開始時間</label>
                        <input
                          type="time"
                          value={times.startTime}
                          onChange={(e) => savePeriodSettings(period, e.target.value, times.endTime)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">終了時間</label>
                        <input
                          type="time"
                          value={times.endTime}
                          onChange={(e) => savePeriodSettings(period, times.startTime, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

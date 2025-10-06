'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AdminAuthService } from '@/lib/admin-auth';
import QRCode from 'qrcode';
import { getJSTISOString, getJSTDateString } from '@/lib/date-utils';

// 未使用の型定義を削除

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getJSTDateString());
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'qr' | 'export' | 'settings'>('export');
  const [exportDataCount, setExportDataCount] = useState<number>(0);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [exportData, setExportData] = useState<{ student_id: string; name: string; class: string; attendance_type: string; period?: string }[]>([]);
  
  // QRコード生成用の状態
  const [qrType, setQrType] = useState<'late' | 'early'>('late');
  const [qrCode, setQrCode] = useState<string>('');
  const [qrGenerated, setQrGenerated] = useState(false);
  
  // QRコード有効期限設定用の状態
  const [qrValidityStart, setQrValidityStart] = useState<string>('');
  const [qrValidityEnd, setQrValidityEnd] = useState<string>('');
  const [qrValidityEnabled, setQrValidityEnabled] = useState<boolean>(false);
  
  // 授業時間設定用の状態（現在未使用）
  // const [classSettings, setClassSettings] = useState<{[key: string]: {startTime: string, endTime: string}}>({});
  
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
  
  // 新しい限目追加用の状態
  const [newPeriod, setNewPeriod] = useState({ period: '', startTime: '09:00', endTime: '10:30' });
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  
  // 限目編集用の状態
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [editPeriodName, setEditPeriodName] = useState('');

  useEffect(() => {
    // 管理者認証チェック
    if (!AdminAuthService.hasValidSession()) {
      router.push('/admin/login');
      return;
    }
    
    // 認証成功後、ローディング状態を解除
    setIsLoading(false);
    
    // 時間割設定をデータベースから読み込み
    loadPeriodSettings();
  }, [router]);

  // 時間割設定をデータベースから読み込む関数
  const loadPeriodSettings = async () => {
    try {
      const response = await fetch('/api/period-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          console.log('データベースから読み込んだ設定:', data.settings);
          setPeriodSettings(data.settings);
        }
      } else {
        console.log('時間割設定の読み込みに失敗、デフォルト設定を使用');
      }
    } catch (error) {
      console.error('時間割設定読み込みエラー:', error);
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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


  // 未使用の関数を削除

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

  // 未使用の関数を削除

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
      const csvData = exportData.map((item: { student_id: string; period?: string; attendance_type: string }) => [
        item.student_id, // 学籍番号
        selectedDate || new Date().toISOString().split('T')[0], // 日付
        item.period ? item.period.replace('限', '') : '不明', // 時限（数字のみ）
        item.attendance_type // 出欠区分（数字）
      ]);
      
      const csvContent = [csvHeaders, ...csvData]
        .map((row: string[]) => row.map((field: string) => `"${field}"`).join(','))
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
    } catch (error: unknown) {
      console.error('CSVエクスポートエラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      alert('CSVエクスポートに失敗しました: ' + errorMessage);
    }
  };

  // 未使用の関数を削除


  // 新しい限目を追加する関数
  const addPeriod = () => {
    if (!newPeriod.period.trim()) {
      alert('限目名を入力してください（例: 9限）');
      return;
    }
    
    if (periodSettings[newPeriod.period]) {
      alert('その限目は既に存在します');
      return;
    }
    
    const updatedSettings = {
      ...periodSettings,
      [newPeriod.period]: {
        startTime: newPeriod.startTime,
        endTime: newPeriod.endTime
      }
    };
    
    setPeriodSettings(updatedSettings);
    setNewPeriod({ period: '', startTime: '09:00', endTime: '10:30' });
    setShowAddPeriod(false);
  };

  // 限目を削除する関数
  const deletePeriod = (period: string) => {
    if (confirm(`「${period}」を削除しますか？`)) {
      const updatedSettings = { ...periodSettings };
      delete updatedSettings[period];
      setPeriodSettings(updatedSettings);
    }
  };

  // 限目の時間を更新する関数
  const updatePeriodTime = (period: string, field: 'startTime' | 'endTime', value: string) => {
    const updatedSettings = {
      ...periodSettings,
      [period]: {
        ...periodSettings[period],
        [field]: value
      }
    };
    setPeriodSettings(updatedSettings);
  };

  // 限目名の編集を開始する関数
  const startEditPeriod = (period: string) => {
    setEditingPeriod(period);
    setEditPeriodName(period);
  };

  // 限目名の編集を保存する関数
  const saveEditPeriod = () => {
    if (!editPeriodName.trim()) {
      alert('限目名を入力してください');
      return;
    }
    
    if (editPeriodName !== editingPeriod && periodSettings[editPeriodName]) {
      alert('その限目名は既に存在します');
      return;
    }
    
    if (editingPeriod) {
      if (editPeriodName !== editingPeriod) {
        // 限目名が変更された場合
        console.log('限目名を変更:', editingPeriod, '→', editPeriodName);
        const updatedSettings = { ...periodSettings };
        const periodData = updatedSettings[editingPeriod];
        
        // 古い限目を削除
        delete updatedSettings[editingPeriod];
        
        // 新しい限目名で追加
        updatedSettings[editPeriodName] = periodData;
        
        console.log('更新後の設定:', updatedSettings);
        setPeriodSettings(updatedSettings);
      } else {
        console.log('限目名は変更されていません');
      }
      // 限目名が同じ場合でも編集モードを終了
    }
    
    setEditingPeriod(null);
    setEditPeriodName('');
  };

  // 限目名の編集をキャンセルする関数
  const cancelEditPeriod = () => {
    setEditingPeriod(null);
    setEditPeriodName('');
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

      // 成功後にデータベースから最新の設定を読み込み
      await loadPeriodSettings();

      // 成功ダイアログを表示
      alert('✅ 時間割設定を保存しました！\n\n設定が正常にデータベースに保存されました。');
    } catch (error: unknown) {
      console.error('時間割設定保存エラー:', error);
      
      // エラーダイアログを表示
      let errorMessage = '❌ 時間割設定の保存に失敗しました\n\n';
      
      if (error instanceof Error && error.message.includes('period_settingsテーブルが存在しません')) {
        errorMessage += '🔧 データベースのセットアップが必要です\n\n';
        errorMessage += '以下のSQLをSupabaseのSQL Editorで実行してください:\n\n';
        errorMessage += '1. add_period_column.sql\n';
        errorMessage += '2. create_period_settings_table.sql\n\n';
        errorMessage += 'これらのファイルはプロジェクトルートにあります。';
      } else {
        const errorDetail = error instanceof Error ? error.message : '不明なエラーが発生しました';
        errorMessage += 'エラー詳細: ' + errorDetail + '\n\n';
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

  // 未使用の変数と関数を削除

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
                    <Image src={qrCode} alt="QR Code" width={200} height={200} className="mx-auto" />
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
              <div>
                <h3 className="text-lg font-bold text-gray-900">時間割設定</h3>
                <p className="text-sm text-gray-600 mt-1">
                  現在の限目数: {Object.keys(periodSettings).length}限
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddPeriod(!showAddPeriod)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200 shadow-md"
                >
                  {showAddPeriod ? 'キャンセル' : '+ 限目を追加'}
                </button>
                <button
                  onClick={savePeriodSettingsToDB}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200 shadow-md"
                >
                  設定を保存
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">設定説明</h4>
                <p className="text-blue-800 text-sm">
                  各限目の時間を設定してください。学生がQRコードを読み取った時間に基づいて、自動的に該当する限目が判定されます。
                </p>
              </div>


              {/* 新しい限目追加フォーム */}
              {showAddPeriod && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-green-900 mb-4">新しい限目を追加</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">限目名</label>
                      <input
                        type="text"
                        placeholder="例: 9限"
                        value={newPeriod.period}
                        onChange={(e) => setNewPeriod({...newPeriod, period: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">開始時間</label>
                      <input
                        type="time"
                        value={newPeriod.startTime}
                        onChange={(e) => setNewPeriod({...newPeriod, startTime: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">終了時間</label>
                      <input
                        type="time"
                        value={newPeriod.endTime}
                        onChange={(e) => setNewPeriod({...newPeriod, endTime: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={addPeriod}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
                    >
                      追加
                    </button>
                    <button
                      onClick={() => setShowAddPeriod(false)}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(periodSettings)
                  .sort(([, a], [, b]) => {
                    // 開始時間でソート
                    return a.startTime.localeCompare(b.startTime);
                  })
                  .map(([period, times]) => (
                  <div key={period} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      {editingPeriod === period ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editPeriodName}
                            onChange={(e) => setEditPeriodName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                saveEditPeriod();
                              } else if (e.key === 'Escape') {
                                cancelEditPeriod();
                              }
                            }}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                            placeholder="限目名"
                            autoFocus
                          />
                          <button
                            onClick={saveEditPeriod}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            保存
                          </button>
                          <button
                            onClick={cancelEditPeriod}
                            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4 
                            className="font-medium text-black cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => startEditPeriod(period)}
                            title="クリックして編集"
                          >
                            {period}
                          </h4>
                          <button
                            onClick={() => deletePeriod(period)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                    {editingPeriod !== period && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black mb-2">開始時間</label>
                          <input
                            type="time"
                            value={times.startTime}
                            onChange={(e) => updatePeriodTime(period, 'startTime', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black mb-2">終了時間</label>
                          <input
                            type="time"
                            value={times.endTime}
                            onChange={(e) => updatePeriodTime(period, 'endTime', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          />
                        </div>
                      </div>
                    )}
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

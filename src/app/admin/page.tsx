'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AdminAuthService } from '@/lib/admin-auth';
import QRCode from 'qrcode';
import { getJSTISOString, getJSTDateString } from '@/lib/date-utils';
import { getPeriodSettingsFromDB } from '@/lib/period-utils';

// 未使用の型定義を削除

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getJSTDateString());
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'export' | 'data' | 'individual' | 'qr' | 'settings' | 'students'>('export');
  const [exportDataCount, setExportDataCount] = useState<number>(0);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [exportData, setExportData] = useState<{ student_id: string; name: string; date: string; period: string; attendance_status: string }[]>([]);
  
  // 対象者データ一覧の絞り込み用の状態
  const [searchStudentId, setSearchStudentId] = useState<string>('');
  const [filterAttendanceType, setFilterAttendanceType] = useState<string>('all');
  
  // QRコード生成用の状態
  const [qrType, setQrType] = useState<'late' | 'early' | 'attendance'>('attendance');
  const [qrCode, setQrCode] = useState<string>('');
  const [qrGenerated, setQrGenerated] = useState(false);
  
  // QRコード有効期限設定用の状態（日付範囲）
  const [qrValidDateStart, setQrValidDateStart] = useState<string>(getJSTDateString());
  const [qrValidDateEnd, setQrValidDateEnd] = useState<string>(getJSTDateString());
  
  // 授業時間設定用の状態（現在未使用）
  // const [classSettings, setClassSettings] = useState<{[key: string]: {startTime: string, endTime: string}}>({});
  
  // 時間割設定用の状態（現在はperiod_settingsテーブルから動的に取得）
  const [periodSettings, setPeriodSettings] = useState<{[key: string]: {startTime: string, endTime: string}}>({});
  
  // 新しい限目追加用の状態
  const [newPeriod, setNewPeriod] = useState({ period: '', startTime: '09:00', endTime: '10:30' });
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  
  // 限目編集用の状態
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [editPeriodName, setEditPeriodName] = useState('');
  
  // 学生情報管理用の状態
  const [students, setStudents] = useState<any[]>([]);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentClass, setEditStudentClass] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  
  // 学生情報検索・絞り込み用の状態
  const [searchStudentInfoId, setSearchStudentInfoId] = useState('');
  const [searchStudentInfoName, setSearchStudentInfoName] = useState('');
  const [searchStudentInfoClass, setSearchStudentInfoClass] = useState<string>('all');
  
  // CSV一括登録用の状態
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // 個人別出席確認用の状態
  const [individualSearchName, setIndividualSearchName] = useState<string>('');
  const [searchCandidates, setSearchCandidates] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [individualAttendanceData, setIndividualAttendanceData] = useState<{ student_id: string; name: string; date: string; period: string; attendance_status: string; place?: string; read_time?: string }[]>([]);
  const [individualDateRange, setIndividualDateRange] = useState<{ start: string; end: string }>({ start: getJSTDateString(), end: getJSTDateString() });

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
        const attendanceData = data.attendance || [];
        
        // 学籍番号順にソート（数値として比較）
        const sortedData = [...attendanceData].sort((a, b) => {
          const idA = String(a.student_id || '');
          const idB = String(b.student_id || '');
          
          // 学籍番号が数値のみで構成されているかチェック
          const numA = parseInt(idA, 10);
          const numB = parseInt(idB, 10);
          
          // 両方が数値に変換できる場合は数値として比較
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          
          // それ以外は文字列として比較
          return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });
        
        
        setExportDataCount(sortedData.length);
        setExportData(sortedData);
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
    if (activeTab === 'export' || activeTab === 'data') {
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

  // エクスポートタブまたはデータタブがアクティブになった時にクラス一覧を取得
  useEffect(() => {
    if (activeTab === 'export' || activeTab === 'data') {
      loadAvailableClasses();
    }
  }, [activeTab]);

  // 学生データを取得する関数
  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('学生データの取得に失敗しました:', error);
    }
  };

  // 学生情報タブがアクティブになった時に学生データとクラス一覧を取得
  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
      loadAvailableClasses();
    }
    if (activeTab === 'individual') {
      fetchStudents();
      loadAvailableClasses();
    }
  }, [activeTab]);
  
  // 個人別検索：学生を検索する関数（名前で検索）
  const searchIndividualStudent = () => {
    if (!individualSearchName.trim()) {
      alert('氏名を入力してください。');
      setSearchCandidates([]);
      return;
    }
    
    const filtered = students.filter(student => {
      const studentName = String(student.name || '').toLowerCase();
      const searchName = individualSearchName.toLowerCase().trim();
      return studentName.includes(searchName);
    });
    
    if (filtered.length === 0) {
      setSelectedStudent(null);
      setSearchCandidates([]);
      alert('該当する学生が見つかりませんでした。');
    } else {
      // 検索候補を表示
      setSearchCandidates(filtered);
      // 1件のみの場合は自動選択
      if (filtered.length === 1) {
        setSelectedStudent(filtered[0]);
        setSearchCandidates([]);
      }
    }
  };
  
  // 検索候補から学生を選択する関数
  const selectStudentFromCandidates = (student: any) => {
    setSelectedStudent(student);
    setSearchCandidates([]);
    setIndividualSearchName(student.name || ''); // 検索欄に選択した学生の名前を表示
  };
  
  // 個人別出席データを取得する関数
  const loadIndividualAttendanceData = async () => {
    if (!selectedStudent) {
      setIndividualAttendanceData([]);
      return;
    }
    
    try {
      // 日付範囲の開始日から終了日までの各日付でデータを取得
      const startDate = new Date(individualDateRange.start);
      const endDate = new Date(individualDateRange.end);
      const attendanceResults: { student_id: string; name: string; date: string; period: string; attendance_status: string; place?: string; read_time?: string }[] = [];
      
      // 各日付についてデータを取得
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        
        // 特定の学生のクラスでフィルタリング
        const params = new URLSearchParams({
          date: dateString,
          class: selectedStudent.class || 'all',
          period: 'all'
        });
        
        const response = await fetch(`/api/attendance/export?${params}`);
        const data = await response.json();
        
        if (response.ok && data.attendance) {
          // 選択された学生のデータのみを抽出
          const studentId = String(selectedStudent.id);
          const studentAttendance = data.attendance.filter((item: any) => {
            // 学籍番号の4桁目に0を追加した形式と比較
            const formatStudentId = (id: string | number) => {
              const idStr = String(id);
              if (idStr.length >= 4) {
                return idStr.slice(0, 3) + '0' + idStr.slice(3);
              }
              return idStr;
            };
            return formatStudentId(item.student_id) === formatStudentId(studentId) || item.student_id === studentId;
          });
          
          attendanceResults.push(...studentAttendance);
        }
        
        // 次の日付に進む
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // 日付順にソート
      attendanceResults.sort((a, b) => {
        const dateA = a.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
        const dateB = b.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
        return dateA.localeCompare(dateB);
      });
      
      setIndividualAttendanceData(attendanceResults);
    } catch (error) {
      console.error('個人別出席データ取得エラー:', error);
      setIndividualAttendanceData([]);
    }
  };
  
  // 選択された学生が変更されたら出席データを取得
  useEffect(() => {
    if (selectedStudent && activeTab === 'individual') {
      loadIndividualAttendanceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent, individualDateRange.start, individualDateRange.end, activeTab]);

  // 学生情報編集開始
  const startEditStudent = (student: any) => {
    setEditingStudent(student);
    setEditStudentName(student.name || '');
    setEditStudentClass(student.class || '');
  };

  // 学生情報編集キャンセル
  const cancelEditStudent = () => {
    setEditingStudent(null);
    setEditStudentName('');
    setEditStudentClass('');
  };

  // 学生情報更新
  const updateStudent = async () => {
    if (!editingStudent) return;

    try {
      const response = await fetch('/api/students', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingStudent.id,
          name: editStudentName,
          class: editStudentClass,
        }),
      });

      if (response.ok) {
        await fetchStudents(); // データを再取得
        cancelEditStudent();
        alert('学生情報を更新しました');
      } else {
        const error = await response.json();
        alert(`更新に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error('学生情報更新エラー:', error);
      alert('学生情報の更新に失敗しました');
    }
  };

  // 学生削除（単一）
  const deleteStudent = async (studentId: string) => {
    if (!confirm('この学生を削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      const response = await fetch('/api/students', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: studentId }),
      });

      if (response.ok) {
        await fetchStudents(); // データを再取得
        setSelectedStudents(new Set()); // 選択状態をリセット
        alert('学生を削除しました');
      } else {
        const error = await response.json();
        alert(`削除に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error('学生削除エラー:', error);
      alert('学生の削除に失敗しました');
    }
  };

  // チェックボックスの選択状態を切り替え
  const toggleStudentSelection = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  // 全選択/全解除（フィルタリングされた学生のみ対象）
  const toggleSelectAll = () => {
    const filteredIds = new Set(filteredStudents.map(s => String(s.id)));
    const allFilteredSelected = filteredIds.size > 0 && Array.from(filteredIds).every(id => selectedStudents.has(id));
    
    if (allFilteredSelected) {
      // フィルタリングされた学生の選択を解除
      const newSelected = new Set(selectedStudents);
      filteredIds.forEach(id => newSelected.delete(id));
      setSelectedStudents(newSelected);
    } else {
      // フィルタリングされた学生を全て選択
      const newSelected = new Set(selectedStudents);
      filteredIds.forEach(id => newSelected.add(id));
      setSelectedStudents(newSelected);
    }
  };

  // 学生情報のフィルタリング
  const getFilteredStudents = () => {
    return students.filter(student => {
      // 学籍番号での検索
      if (searchStudentInfoId && !String(student.id || '').toLowerCase().includes(searchStudentInfoId.toLowerCase())) {
        return false;
      }
      
      // 氏名での検索
      if (searchStudentInfoName && !String(student.name || '').toLowerCase().includes(searchStudentInfoName.toLowerCase())) {
        return false;
      }
      
      // クラスでの絞り込み
      if (searchStudentInfoClass !== 'all' && student.class !== searchStudentInfoClass) {
        return false;
      }
      
      return true;
    });
  };

  const filteredStudents = getFilteredStudents();

  // 複数学生削除
  const deleteSelectedStudents = async () => {
    const selectedCount = selectedStudents.size;
    if (selectedCount === 0) {
      alert('削除する学生を選択してください');
      return;
    }

    if (!confirm(`選択した${selectedCount}名の学生を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      // 選択された学生を順次削除
      const deletePromises = Array.from(selectedStudents).map(studentId =>
        fetch('/api/students', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: studentId }),
        })
      );

      const responses = await Promise.all(deletePromises);
      const errors = responses.filter(res => !res.ok);

      if (errors.length === 0) {
        await fetchStudents(); // データを再取得
        setSelectedStudents(new Set()); // 選択状態をリセット
        alert(`${selectedCount}名の学生を削除しました`);
      } else {
        alert(`${errors.length}名の学生の削除に失敗しました`);
      }
    } catch (error) {
      console.error('複数学生削除エラー:', error);
      alert('学生の削除に失敗しました');
    }
  };

  // 対象者データ一覧の絞り込みロジック
  const getFilteredExportData = () => {
    return exportData.filter(item => {
      // 学籍番号での検索
      if (searchStudentId && !item.student_id.toLowerCase().includes(searchStudentId.toLowerCase())) {
        return false;
      }
      
      // 出欠区分での絞り込み
      if (filterAttendanceType !== 'all' && item.attendance_status !== filterAttendanceType) {
        return false;
      }
      
      return true;
    });
  };

  const filteredExportData = getFilteredExportData();


  // 未使用の関数を削除

  const handleLogout = () => {
    AdminAuthService.logout();
    router.push('/');
  };

  // QRコード生成機能
  const generateQRCode = async () => {
    try {
      // 有効日付の検証
      if (!qrValidDateStart || !qrValidDateEnd) {
        alert('有効期限の開始日と終了日を設定してください');
        return;
      }

      // 日付の妥当性チェック
      if (qrValidDateStart > qrValidDateEnd) {
        alert('開始日は終了日より前である必要があります');
        return;
      }

      // 現在時刻からperiodを判定
      const currentTime = new Date();
      const timeString = currentTime.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      // period_settingsから現在の時限を判定
      const periodSettings = await getPeriodSettingsFromDB();
      let currentPeriod = '不明';
      
      // 現在時刻に該当する時限を検索
      const matchingPeriod = Object.keys(periodSettings).find(periodKey => {
        console.log('QRコード生成時の時限チェック:', periodKey);
        const setting = periodSettings[periodKey];
        const timeToMinutes = (time: string): number => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const targetMinutes = timeToMinutes(timeString);
        const startMinutes = timeToMinutes(setting.startTime);
        const endMinutes = timeToMinutes(setting.endTime);
        
        const isMatch = targetMinutes >= startMinutes && targetMinutes < endMinutes;
        console.log(`時限${periodKey}の時間チェック:`, {
          targetTime: timeString,
          targetMinutes,
          startTime: setting.startTime,
          startMinutes,
          endTime: setting.endTime,
          endMinutes,
          isMatch
        });
        
        return isMatch;
      });
      
      if (matchingPeriod) {
        currentPeriod = matchingPeriod;
      }
      
      console.log('QRコード生成時の時限判定:', { timeString, currentPeriod });

      const qrData = {
        type: qrType,
        timestamp: getJSTISOString(),
        action: qrType === 'late' ? '遅刻登録' : qrType === 'early' ? '早退登録' : '出席登録',
        period: currentPeriod, // 現在の時限を追加
        validDateStart: qrValidDateStart, // 有効開始日（YYYY-MM-DD形式）
        validDateEnd: qrValidDateEnd // 有効終了日（YYYY-MM-DD形式）
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

  // CSVテンプレートダウンロード
  const downloadCsvTemplate = () => {
    const headers = ['id', 'name', 'class', 'gakusei_id', 'gakusei_password'];
    const sampleData = [
      ['254001', '山田太郎', '22期生昼間部', 'student001', 'password123'],
      ['254002', '佐藤花子', '22期生昼間部', 'student002', 'password456'],
    ];
    
    const csvContent = [headers, ...sampleData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '学生一括登録テンプレート.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CSVファイルパース
  const parseCsvFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error('CSVファイルにデータがありません'));
            return;
          }

          // ヘッダー行をスキップ
          const dataLines = lines.slice(1);
          const students = dataLines.map((line, index) => {
            // CSVの各フィールドをパース（ダブルクォートで囲まれた値に対応）
            const values: string[] = [];
            let currentValue = '';
            let insideQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"') {
                insideQuotes = !insideQuotes;
              } else if (char === ',' && !insideQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            values.push(currentValue.trim()); // 最後の値
            
            return {
              id: values[0] || '',
              name: values[1] || '',
              class: values[2] || '',
              gakusei_id: values[3] || '',
              gakusei_password: values[4] || '',
            };
          });

          resolve(students);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  // CSV一括登録
  const handleBulkUpload = async () => {
    if (!csvFile) {
      alert('CSVファイルを選択してください');
      return;
    }

    setUploading(true);
    try {
      const students = await parseCsvFile(csvFile);
      
      const response = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ students }),
      });

      const result = await response.json();

      if (response.ok) {
        const message = `登録完了\n\n登録成功: ${result.successCount}件\n失敗: ${result.failCount}件\n合計: ${result.total}件${
          result.errors && result.errors.length > 0
            ? '\n\nエラー詳細:\n' + result.errors.slice(0, 10).join('\n') + (result.errors.length > 10 ? `\n...他${result.errors.length - 10}件` : '')
            : ''
        }`;
        alert(message);
        
        // 学生情報タブがアクティブな場合は再取得
        if (activeTab === 'students') {
          await fetchStudents();
        }
        
        // ファイルをリセット
        setCsvFile(null);
        const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        alert(`登録に失敗しました: ${result.error}`);
      }
    } catch (error: any) {
      console.error('CSV一括登録エラー:', error);
      alert(`CSV一括登録に失敗しました: ${error.message}`);
    } finally {
      setUploading(false);
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
      
      // 学籍番号順にソート（数値として比較）
      const sortedExportData = [...exportData].sort((a, b) => {
        const idA = String(a.student_id || '');
        const idB = String(b.student_id || '');
        
        // 学籍番号が数値のみで構成されているかチェック
        const numA = parseInt(idA, 10);
        const numB = parseInt(idB, 10);
        
        // 両方が数値に変換できる場合は数値として比較
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        
        // それ以外は文字列として比較
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });
      
      const csvHeaders = ['学籍番号', '日付', '時限', '出欠区分'];
      const csvData = sortedExportData.map((item: { student_id: string; date?: string; period?: string; attendance_status: string }) => [
        item.student_id, // 学籍番号
        item.date || selectedDate || new Date().toISOString().split('T')[0], // 日付
        item.period || '不明', // 時限
        item.attendance_status // 出欠区分（出席/欠席）
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
      const typeLabel = qrType === 'attendance' ? '出席用' : qrType === 'late' ? '遅刻用' : '早退用';
      const dateRange = qrValidDateStart === qrValidDateEnd 
        ? qrValidDateStart 
        : `${qrValidDateStart}_${qrValidDateEnd}`;
      link.download = `${typeLabel}QRコード_${dateRange}.png`;
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
              <Link
                href="/classroom-display"
                target="_blank"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition duration-200 shadow-md flex items-center"
              >
                <span className="mr-1">🖥️</span>
                スクリーン用
              </Link>
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
                onClick={() => setActiveTab('data')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                  activeTab === 'data'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                出席確認(クラス別)
              </button>
              <button
                onClick={() => setActiveTab('individual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                  activeTab === 'individual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                出席確認(個人別)
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
              <button
                onClick={() => setActiveTab('students')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                  activeTab === 'students'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                学生情報
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 px-4 py-6 overflow-auto">
        {activeTab === 'qr' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">出席管理用QRコード発行</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-black mb-2">QRコードの種類</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center text-black font-medium cursor-pointer hover:text-blue-600 transition-colors">
                    <input
                      type="radio"
                      value="attendance"
                      checked={qrType === 'attendance'}
                      onChange={(e) => setQrType(e.target.value as 'late' | 'early' | 'attendance')}
                      className="mr-2 accent-blue-600"
                    />
                    出席用
                  </label>
                  <label className="flex items-center text-black font-medium cursor-pointer hover:text-blue-600 transition-colors">
                    <input
                      type="radio"
                      value="late"
                      checked={qrType === 'late'}
                      onChange={(e) => setQrType(e.target.value as 'late' | 'early' | 'attendance')}
                      className="mr-2 accent-blue-600"
                    />
                    遅刻用
                  </label>
                  <label className="flex items-center text-black font-medium cursor-pointer hover:text-blue-600 transition-colors">
                    <input
                      type="radio"
                      value="early"
                      checked={qrType === 'early'}
                      onChange={(e) => setQrType(e.target.value as 'late' | 'early' | 'attendance')}
                      className="mr-2 accent-blue-600"
                    />
                    早退用
                  </label>
                </div>
              </div>

              {/* 有効期限設定 */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-blue-900 mb-3">
                  📅 有効期限（日付範囲）
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      開始日
                    </label>
                    <input
                      type="date"
                      value={qrValidDateStart}
                      onChange={(e) => setQrValidDateStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      終了日
                    </label>
                    <input
                      type="date"
                      value={qrValidDateEnd}
                      onChange={(e) => setQrValidDateEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  このQRコードは開始日から終了日までの期間有効です。時限は読み取り時刻から自動判定されます。
                </p>
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
                    {qrType === 'attendance' ? '出席用' : qrType === 'late' ? '遅刻用' : '早退用'}QRコード
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg inline-block">
                    <Image src={qrCode} alt="QR Code" width={200} height={200} className="mx-auto" />
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="text-sm font-medium text-blue-900">
                      📅 有効期限: {qrValidDateStart} 〜 {qrValidDateEnd}
                    </p>
                    {qrValidDateStart === qrValidDateEnd && (
                      <p className="text-xs text-gray-600">
                        （{qrValidDateStart} のみ有効）
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">
                      学生にこのQRコードをスキャンしてもらってください
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      ℹ️ 時限は読み取り時刻から自動判定されます
                    </p>
                    <p className="text-xs text-orange-600 font-medium mt-2">
                      ⚠️ このQRコードは {qrValidDateStart} から {qrValidDateEnd} まで有効です
                    </p>
                  </div>
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
                      {Object.keys(periodSettings)
                        .sort((a, b) => {
                          // 数字部分でソート（例: 1限, 2限, 10限）
                          const aNum = parseInt(a.replace('限', ''));
                          const bNum = parseInt(b.replace('限', ''));
                          return aNum - bNum;
                        })
                        .map((period) => (
                          <option key={period} value={period}>
                            {period}
                          </option>
                        ))}
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
              
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 <strong>ヒント:</strong> 詳細なデータ確認や絞り込み機能を使用したい場合は、「出席確認」タブをご利用ください。
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">出席確認(クラス別)</h3>
            
            <div className="space-y-6">
              {/* 統合された条件指定フォーム */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4">🔍 出席データ検索・絞り込み条件</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 日付選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                    />
                  </div>
                  
                  {/* クラス選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">クラス</label>
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                    >
                      <option value="all">すべて</option>
                      {availableClasses.map(className => (
                        <option key={className} value={className}>{className}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* 限目選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">限目</label>
                    <select
                      value={filterPeriod}
                      onChange={(e) => setFilterPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                    >
                      <option value="all">すべて</option>
                      {Object.keys(periodSettings)
                        .sort((a, b) => {
                          // 数字部分でソート（例: 1限, 2限, 10限）
                          const aNum = parseInt(a.replace('限', ''));
                          const bNum = parseInt(b.replace('限', ''));
                          return aNum - bNum;
                        })
                        .map((period) => (
                          <option key={period} value={period}>
                            {period}
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  {/* 学籍番号検索 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">学籍番号</label>
                    <input
                      type="text"
                      placeholder="学籍番号を入力"
                      value={searchStudentId}
                      onChange={(e) => setSearchStudentId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                    />
                  </div>
                  
                  {/* 出欠区分絞り込み */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">出欠区分</label>
                    <select
                      value={filterAttendanceType}
                      onChange={(e) => setFilterAttendanceType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                    >
                      <option value="all">すべて</option>
                      <option value="1">出席</option>
                      <option value="2">欠席</option>
                      <option value="3">遅刻</option>
                      <option value="4">早退</option>
                    </select>
                  </div>
                  
                  {/* リセットボタン */}
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchStudentId('');
                        setFilterAttendanceType('all');
                      }}
                      className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium transition duration-200 text-sm"
                    >
                      リセット
                    </button>
                  </div>
                </div>
                
                {/* 絞り込み結果表示 */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>検索結果:</strong> {filteredExportData.length}件 / {exportDataCount}件
                    {filteredExportData.length !== exportDataCount && (
                      <span className="ml-2 text-blue-600">
                        （{exportDataCount - filteredExportData.length}件が非表示）
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              {/* 対象者データ表示 */}
              {exportDataCount > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">👥 出席データ一覧</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    選択された条件に基づく出席データ（{exportDataCount}件）
                  </p>
                  
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-3 py-2 text-left font-medium text-gray-700">学籍番号</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">名前</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">日付</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">時限</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">出欠区分</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">読取時間</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">位置情報</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExportData.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900">{item.student_id}</td>
                            <td className="px-3 py-2 text-gray-900">{(item as any).name || '不明'}</td>
                            <td className="px-3 py-2 text-gray-900">{item.date}</td>
                            <td className="px-3 py-2 text-gray-900">{item.period}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.attendance_status === '1' ? 'bg-green-100 text-green-800' :
                                item.attendance_status === '2' ? 'bg-red-100 text-red-800' :
                                item.attendance_status === '3' ? 'bg-yellow-100 text-yellow-800' :
                                item.attendance_status === '4' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.attendance_status === '1' ? '出席' :
                                 item.attendance_status === '2' ? '欠席' :
                                 item.attendance_status === '3' ? '遅刻' :
                                 item.attendance_status === '4' ? '早退' :
                                 item.attendance_status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-900 text-xs">
                              {(item as any).read_time || '不明'}
                            </td>
                            <td className="px-3 py-2 text-gray-900 text-xs">
                              {(item as any).place || '不明'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      表示中: {filteredExportData.length}件 / 全{exportDataCount}件
                    </p>
                    {filteredExportData.length !== exportDataCount && (
                      <p className="text-xs text-gray-400 mt-1">
                        絞り込み条件により {exportDataCount - filteredExportData.length}件が非表示
                      </p>
                    )}
                    {filteredExportData.length === exportDataCount && (
                      <p className="text-xs text-gray-400 mt-1">
                        すべてのデータを表示しています
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {exportDataCount === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">表示するデータがありません</p>
                  <p className="text-sm text-gray-400">条件設定を確認してください</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'individual' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">出席確認(個人別)</h3>
            
            <div className="space-y-6">
              {/* 学生検索フォーム */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4">🔍 学生検索</h4>
                <div className="mb-4">
                  {/* 氏名検索 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">氏名</label>
                    <input
                      type="text"
                      placeholder="氏名を入力してください"
                      value={individualSearchName}
                      onChange={(e) => setIndividualSearchName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          searchIndividualStudent();
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      部分一致で検索できます（例: 「山田」と入力すると「山田太郎」などが検索されます）
                    </p>
                  </div>
                  
                  {/* 検索候補リスト */}
                  {searchCandidates.length > 0 && (
                    <div className="mt-3 border border-gray-300 rounded-md bg-white shadow-lg max-h-60 overflow-y-auto">
                      <div className="px-3 py-2 bg-gray-100 border-b border-gray-300 text-sm font-medium text-gray-700">
                        {searchCandidates.length}件の該当者が見つかりました
                      </div>
                      <div className="divide-y divide-gray-200">
                        {searchCandidates.map((student, index) => (
                          <button
                            key={index}
                            onClick={() => selectStudentFromCandidates(student)}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{student.name || '名前なし'}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  学籍番号: {student.id || '不明'} | クラス: {student.class || '不明'}
                                </div>
                              </div>
                              <div className="text-blue-600 text-sm font-medium">
                                選択 →
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={searchIndividualStudent}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition duration-200 text-sm"
                  >
                    検索
                  </button>
                  <button
                    onClick={() => {
                      setIndividualSearchName('');
                      setSelectedStudent(null);
                      setSearchCandidates([]);
                      setIndividualAttendanceData([]);
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md font-medium transition duration-200 text-sm"
                  >
                    リセット
                  </button>
                </div>
                
                {/* 選択された学生の情報表示 */}
                {selectedStudent && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-medium text-blue-900 mb-2">選択された学生</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">学籍番号:</span>
                        <span className="ml-2 font-medium text-gray-900">{selectedStudent.id}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">氏名:</span>
                        <span className="ml-2 font-medium text-gray-900">{selectedStudent.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">クラス:</span>
                        <span className="ml-2 font-medium text-gray-900">{selectedStudent.class || '不明'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 日付範囲選択 */}
              {selectedStudent && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4">📅 出席データの取得期間</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                      <input
                        type="date"
                        value={individualDateRange.start}
                        onChange={(e) => setIndividualDateRange({ ...individualDateRange, start: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                      <input
                        type="date"
                        value={individualDateRange.end}
                        onChange={(e) => setIndividualDateRange({ ...individualDateRange, end: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* 出席データ表示 */}
              {selectedStudent && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">
                    📊 {selectedStudent.name} さんの出席データ
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    期間: {individualDateRange.start} ～ {individualDateRange.end}
                    {individualAttendanceData.length > 0 && ` (${individualAttendanceData.length}件)`}
                  </p>
                  
                  {individualAttendanceData.length > 0 ? (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="px-3 py-2 text-left font-medium text-gray-700">日付</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">時限</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">出欠区分</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">読取時間</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">位置情報</th>
                          </tr>
                        </thead>
                        <tbody>
                          {individualAttendanceData.map((item, index) => {
                            // 日付を読みやすい形式に変換（YYYYMMDD → YYYY-MM-DD）
                            const formattedDate = item.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
                            
                            return (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-900">{formattedDate}</td>
                                <td className="px-3 py-2 text-gray-900">{item.period || '不明'}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    item.attendance_status === '1' ? 'bg-green-100 text-green-800' :
                                    item.attendance_status === '2' ? 'bg-red-100 text-red-800' :
                                    item.attendance_status === '3' ? 'bg-yellow-100 text-yellow-800' :
                                    item.attendance_status === '4' ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {item.attendance_status === '1' ? '出席' :
                                     item.attendance_status === '2' ? '欠席' :
                                     item.attendance_status === '3' ? '遅刻' :
                                     item.attendance_status === '4' ? '早退' :
                                     item.attendance_status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-900 text-xs">
                                  {item.read_time || '不明'}
                                </td>
                                <td className="px-3 py-2 text-gray-900 text-xs">
                                  {item.place || '不明'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">該当期間の出席データがありません</p>
                      <p className="text-sm text-gray-400">期間を変更して再度検索してください</p>
                    </div>
                  )}
                </div>
              )}
              
              {!selectedStudent && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">学生を検索して選択してください</p>
                  <p className="text-sm text-gray-400">氏名で検索できます</p>
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
                  各限目の時間を設定してください。学生がQRコードを読み取った時間とクラス（昼間部/夜間部）に基づいて、自動的に該当する限目（例：昼間部3限）が判定されます。
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
                        placeholder="例: 昼間部6限 または 夜間部4限"
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

        {/* 学生情報タブ */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">学生情報管理</h3>
              <div className="flex gap-2">
                {selectedStudents.size > 0 && (
                  <button
                    onClick={deleteSelectedStudents}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    選択した{selectedStudents.size}名を削除
                  </button>
                )}
                <button
                  onClick={downloadCsvTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  テンプレートをダウンロード
                </button>
              </div>
            </div>
            
            {/* CSV一括登録セクション */}
            <div className="mb-6 p-6 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-4">📥 学生一括登録（CSV）</h4>
              <p className="text-sm text-purple-800 mb-4">
                CSVファイルをアップロードして学生を一括登録できます。テンプレートをダウンロードして、必要事項を入力してください。
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSVファイルを選択
                  </label>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCsvFile(file);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
                  />
                  {csvFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      選択中: {csvFile.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleBulkUpload}
                  disabled={!csvFile || uploading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition duration-200 shadow-md"
                >
                  {uploading ? '登録中...' : 'CSVファイルをアップロード'}
                </button>
              </div>
              <div className="mt-4 p-3 bg-white rounded border border-purple-100">
                <p className="text-xs text-purple-700">
                  <strong>CSV形式:</strong> id（学籍番号）, name（氏名）, class（クラス）, gakusei_id（ID）, gakusei_password（PASS）
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  <strong>注意:</strong> id、name、classは必須です。gakusei_idとgakusei_passwordは任意です。
                </p>
              </div>
            </div>
            
            {/* 検索・絞り込みフォーム */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-4">🔍 検索・絞り込み</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 学籍番号検索 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学籍番号</label>
                  <input
                    type="text"
                    value={searchStudentInfoId}
                    onChange={(e) => setSearchStudentInfoId(e.target.value)}
                    placeholder="学籍番号で検索"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                  />
                </div>
                
                {/* 氏名検索 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">氏名</label>
                  <input
                    type="text"
                    value={searchStudentInfoName}
                    onChange={(e) => setSearchStudentInfoName(e.target.value)}
                    placeholder="氏名で検索"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                  />
                </div>
                
                {/* クラス絞り込み */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">クラス</label>
                  <select
                    value={searchStudentInfoClass}
                    onChange={(e) => setSearchStudentInfoClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
                  >
                    <option value="all">すべて</option>
                    {availableClasses.map(className => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* 検索条件リセット */}
              {(searchStudentInfoId || searchStudentInfoName || searchStudentInfoClass !== 'all') && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setSearchStudentInfoId('');
                      setSearchStudentInfoName('');
                      setSearchStudentInfoClass('all');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    検索条件をリセット
                  </button>
                </div>
              )}
              
              {/* 検索結果件数表示 */}
              <div className="mt-4 text-sm text-gray-600">
                表示: {filteredStudents.length}件 / 全{students.length}件
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedStudents.has(String(s.id)))}
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">学籍番号</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">氏名</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">クラス</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">PASS</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(String(student.id))}
                          onChange={() => toggleStudentSelection(String(student.id))}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        <span className="text-sm">{student.id || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {editingStudent?.id === student.id ? (
                          <input
                            type="text"
                            value={editStudentName}
                            onChange={(e) => setEditStudentName(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm">{student.name || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {editingStudent?.id === student.id ? (
                          <select
                            value={editStudentClass}
                            onChange={(e) => setEditStudentClass(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">クラスを選択</option>
                            {availableClasses.map((cls) => (
                              <option key={cls} value={cls}>{cls}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm">{student.class || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        <span className="text-sm">{student.gakusei_id || student.id || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        <span className="text-sm">{student.gakusei_password || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {editingStudent?.id === student.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={updateStudent}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              保存
                            </button>
                            <button
                              onClick={cancelEditStudent}
                              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                            >
                              キャンセル
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditStudent(student)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            編集
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {students.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  学生データがありません
                </div>
              )}
              
              {students.length > 0 && filteredStudents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  検索条件に一致する学生がありません
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

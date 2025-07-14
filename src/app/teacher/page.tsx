'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

type AttendanceType = '出席' | '遅刻' | '欠課' | '早退';

export default function TeacherPage() {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // クラス別フィルター用の状態
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // 初期化
  useEffect(() => {
    loadAttendanceData();
    loadAllStudents();
  }, []);

  const loadAttendanceData = async () => {
    try {
      const response = await fetch('/api/attendance');
      const data = await response.json();
      setAttendanceData(data.attendance || []);
    } catch (error) {
      console.error('出席データの読み込みに失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const data = await response.json();
      setAllStudents(data.students || []);
    } catch (error) {
      console.error('学生データの読み込みに失敗:', error);
    }
  };

  // クラス別フィルター機能
  const applyClassFilter = () => {
    let filtered = [...attendanceData];

    // 日付フィルター
    if (selectedDate) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.timestamp);
        // UTC時間を日本時間（JST）に変換して日付を取得
        const jstDate = new Date(recordDate.getTime() + (9 * 60 * 60 * 1000));
        const year = jstDate.getUTCFullYear();
        const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(jstDate.getUTCDate()).padStart(2, '0');
        const recordDateString = `${year}-${month}-${day}`;
        return recordDateString === selectedDate;
      });
    }

    // 時限フィルター
    if (selectedTime) {
      filtered = filtered.filter(record => {
        const date = new Date(record.timestamp);
        // UTC時間を日本時間（JST）に変換（+9時間）
        const jstHour = date.getUTCHours() + 9;
        const minute = date.getUTCMinutes();
        const totalMinutes = jstHour * 60 + minute;
        const className = record.class || '';
        
        // 昼間部の場合
        if (className.includes('昼間部')) {
          if (totalMinutes >= 9 * 60 + 0 && totalMinutes <= 10 * 60 + 40) return selectedTime === '1限';
          if (totalMinutes >= 10 * 60 + 40 && totalMinutes <= 12 * 60 + 0) return selectedTime === '2限';
          if (totalMinutes >= 13 * 60 + 10 && totalMinutes <= 15 * 60 + 0) return selectedTime === '3限';
          if (totalMinutes >= 14 * 60 + 50 && totalMinutes <= 16 * 60 + 40) return selectedTime === '4限';
        }
        // 夜間部の場合
        else if (className.includes('夜間部')) {
          if (totalMinutes >= 17 * 60 + 50 && totalMinutes <= 19 * 60 + 40) return selectedTime === '1限';
          if (totalMinutes >= 19 * 60 + 30 && totalMinutes <= 21 * 60 + 20) return selectedTime === '2限';
        }
        return false;
      });
    }

    // クラスフィルター
    if (selectedClass) {
      filtered = filtered.filter(record => record.class === selectedClass);
    }

    setFilteredData(filtered);
  };

  // フィルター適用
  useEffect(() => {
    applyClassFilter();
  }, [selectedDate, selectedTime, selectedClass, attendanceData]);

  const getAvailableClasses = () => {
    const classes = [...new Set(attendanceData.map(record => record.class).filter(Boolean))];
    return classes.sort();
  };

  const getAvailableDates = () => {
    const dates = [...new Set(attendanceData.map(record => {
      const date = new Date(record.timestamp);
      // UTC時間を日本時間（JST）に変換して日付を取得
      const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
      const year = jstDate.getUTCFullYear();
      const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(jstDate.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }))];
    return dates.sort().reverse();
  };

  const getAvailableTimes = () => {
    const times = [...new Set(attendanceData.map(record => {
      const date = new Date(record.timestamp);
      // UTC時間を日本時間（JST）に変換（+9時間）
      const jstHour = date.getUTCHours() + 9;
      const minute = date.getUTCMinutes();
      const totalMinutes = jstHour * 60 + minute;
      const className = record.class || '';
      
      // 昼間部の場合
      if (className.includes('昼間部')) {
        if (totalMinutes >= 9 * 60 + 0 && totalMinutes <= 10 * 60 + 40) return '1限';
        if (totalMinutes >= 10 * 60 + 40 && totalMinutes <= 12 * 60 + 0) return '2限';
        if (totalMinutes >= 13 * 60 + 10 && totalMinutes <= 15 * 60 + 0) return '3限';
        if (totalMinutes >= 14 * 60 + 50 && totalMinutes <= 16 * 60 + 40) return '4限';
      }
      // 夜間部の場合
      else if (className.includes('夜間部')) {
        if (totalMinutes >= 17 * 60 + 50 && totalMinutes <= 19 * 60 + 40) return '1限';
        if (totalMinutes >= 19 * 60 + 30 && totalMinutes <= 21 * 60 + 20) return '2限';
      }
      return '';
    }).filter(Boolean))];
    return times.sort();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeColor = (type: AttendanceType) => {
    switch (type) {
      case '出席': return 'bg-green-100 text-green-800 border-green-200';
      case '遅刻': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '欠課': return 'bg-red-100 text-red-800 border-red-200';
      case '早退': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const exportToCSV = () => {
    if (!selectedClass || !selectedDate || !selectedTime) {
      alert('クラス、日付、時限を選択してください');
      return;
    }

    setIsExporting(true);

    try {
      // UTF-8 BOMを追加してExcelで文字化けしないようにする
      const BOM = '\uFEFF';
      
      const getPeriod = (selectedTime: string) => {
        switch (selectedTime) {
          case '1限': return '1';
          case '2限': return '2';
          case '3限': return '3';
          case '4限': return '4';
          case '5限': return '5';
          default: return '';
        }
      };

      const formatDateForCSV = (dateString: string) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
      };

      const getAttendanceCode = (attendanceType: string) => {
        switch (attendanceType) {
          case '出席': return '1';
          case '遅刻': return '2';
          case '欠課': return '3';
          case '早退': return '4';
          default: return '3'; // デフォルトは欠課
        }
      };

      // 選択されたクラスの全学生を取得
      const classStudents = allStudents.filter(student => student.class === selectedClass);
      
      // 出席データから該当する日付・時限のデータを取得
      const attendanceRecords = attendanceData.filter(record => {
        const recordDate = new Date(record.timestamp);
        // UTC時間を日本時間（JST）に変換して日付を取得
        const jstDate = new Date(recordDate.getTime() + (9 * 60 * 60 * 1000));
        const year = jstDate.getUTCFullYear();
        const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
        const day = jstDate.getUTCDate();
        const recordDateString = `${year}-${month}-${day}`;
        
        if (recordDateString !== selectedDate) return false;
        if (record.class !== selectedClass) return false;
        
        // 時限の判定
        const hour = recordDate.getUTCHours() + 9; // UTC時間を日本時間（JST）に変換
        const minute = recordDate.getUTCMinutes();
        const totalMinutes = hour * 60 + minute;
        
        if (selectedClass.includes('昼間部')) {
          if (selectedTime === '1限' && totalMinutes >= 9 * 60 + 0 && totalMinutes <= 10 * 60 + 40) return true;
          if (selectedTime === '2限' && totalMinutes >= 10 * 60 + 40 && totalMinutes <= 12 * 60 + 0) return true;
          if (selectedTime === '3限' && totalMinutes >= 13 * 60 + 10 && totalMinutes <= 15 * 60 + 0) return true;
          if (selectedTime === '4限' && totalMinutes >= 14 * 60 + 50 && totalMinutes <= 16 * 60 + 40) return true;
        } else if (selectedClass.includes('夜間部')) {
          if (selectedTime === '1限' && totalMinutes >= 17 * 60 + 50 && totalMinutes <= 19 * 60 + 40) return true;
          if (selectedTime === '2限' && totalMinutes >= 19 * 60 + 30 && totalMinutes <= 21 * 60 + 20) return true;
        }
        return false;
      });

      // 全学生の出席状況を生成（データがない場合は欠席）
      const csvContent = classStudents.map(student => {
        const attendanceRecord = attendanceRecords.find(record => record.student_id === student.student_id);
        
        // 学生番号を7桁に変換（4桁目に0を追加）
        const originalStudentId = student.student_id;
        const formattedStudentId = originalStudentId.length === 6 
          ? originalStudentId.slice(0, 3) + '0' + originalStudentId.slice(3)
          : originalStudentId;
        
        const date = formatDateForCSV(selectedDate);
        const period = getPeriod(selectedTime);
        const attendanceCode = attendanceRecord 
          ? getAttendanceCode(attendanceRecord.attendance_type || '出席')
          : '3'; // データがない場合は欠課
        
        return `${formattedStudentId},${date},${period},${attendanceCode}`;
      }).join('\n');

      const csv = BOM + '学籍番号,日付,時限,出席状況\n' + csvContent;
      
      // ファイル名にクラス、日付、時限を追加
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `attendance_${selectedClass}_${selectedDate}_${selectedTime}_${timestamp}.csv`;
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('CSVファイルをエクスポートしました');
    } catch (error) {
      console.error('CSVエクスポートエラー:', error);
      alert('CSVエクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">👨‍🏫 教員側</h1>
            <Link 
              href="/"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition duration-200 shadow-md"
            >
              🏠 ホーム
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 py-6 space-y-6">
        {/* フィルター */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">データフィルター</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* 日付選択 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                日付
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                />
                <button
                  onClick={() => setSelectedDate('')}
                  className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm transition duration-200"
                >
                  クリア
                </button>
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition duration-200"
                >
                  今日
                </button>
              </div>
            </div>

            {/* 時限選択 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                時限
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
              >
                <option value="">時限を選択</option>
                <option value="1限">1限</option>
                <option value="2限">2限</option>
                <option value="3限">3限</option>
                <option value="4限">4限</option>
              </select>
            </div>

            {/* クラス選択 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                クラス
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              >
                <option value="">すべてのクラス</option>
                {getAvailableClasses().map((class_) => (
                  <option key={class_} value={class_}>
                    {class_}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* フィルター結果サマリー */}
          <div className="mt-4 p-3 bg-white rounded border">
            {selectedDate || selectedTime || selectedClass ? (
              <>
                <p className="text-sm font-medium text-gray-800">
                  表示条件: 
                  {selectedDate && ` 日付: ${new Date(selectedDate).toLocaleDateString('ja-JP')}`}
                  {selectedTime && ` 時限: ${selectedTime}`}
                  {selectedClass && ` クラス: ${selectedClass}`}
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  表示件数: {filteredData.length}件 / 総件数: {attendanceData.length}件
                </p>
                {filteredData.length > 0 && (
                  <p className="text-sm font-medium text-green-700 mt-1">
                    💡 フィルターされたデータをCSVでエクスポートできます
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-blue-800">
                  📋 フィルター条件を選択してデータを表示してください
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  日付、時限、クラスのいずれかを選択すると、該当するデータが表示されます
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  総件数: {attendanceData.length}件
                </p>
              </>
            )}
          </div>

          {/* CSVエクスポートボタン */}
          {selectedClass && selectedDate && selectedTime && selectedTime !== '' && (
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={exportToCSV}
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition duration-200 flex items-center space-x-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>エクスポート中...</span>
                  </>
                ) : (
                  <>
                    <span>📊</span>
                    <span>CSVエクスポート（全学生）</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setSelectedDate('');
                  setSelectedTime('');
                  setSelectedClass('');
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
              >
                🗑️ フィルタークリア
              </button>
            </div>
          )}
        </div>

        {/* フィルター結果表示 */}
        {!selectedDate && !selectedTime && !selectedClass ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-lg font-medium mb-2">データを表示するにはフィルター条件を選択してください</p>
            <p className="text-sm">日付、時限、クラスのいずれかを選択すると、該当する出席データが表示されます</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>条件に一致するデータがありません</p>
            <p className="text-sm mt-2">フィルター条件を変更してください</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    学籍番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    学生名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    クラス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    出席状況
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    打刻時刻
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    位置情報
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.student_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {record.class || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getTypeColor(record.attendance_type || '出席')}`}>
                        {record.attendance_type || '出席'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(record.timestamp)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {record.location ? (
                        <div className="text-xs max-w-xs">
                          {record.location.address ? (
                            <div className="break-words">{record.location.address}</div>
                          ) : (
                            <div>
                              <div>緯度: {record.location.latitude?.toFixed(4) || 'N/A'}</div>
                              <div>経度: {record.location.longitude?.toFixed(4) || 'N/A'}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">なし</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* クラス別統計 */}
        {filteredData.length > 0 && (
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-3">クラス別統計</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getAvailableClasses().map((class_) => {
                const classData = filteredData.filter(record => record.class === class_);
                const attendanceCount = classData.filter(record => record.attendance_type === '出席').length;
                const lateCount = classData.filter(record => record.attendance_type === '遅刻').length;
                const delayCount = 0; // 遅延は統合されたため0
                const absentCount = classData.filter(record => record.attendance_type === '欠課').length;
                const earlyCount = classData.filter(record => record.attendance_type === '早退').length;

                return (
                  <div key={class_} className="bg-white rounded-lg p-3 border">
                    <h4 className="font-medium text-gray-900 mb-2">{class_}</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>出席:</span>
                        <span className="font-medium text-green-600">{attendanceCount}人</span>
                      </div>
                      <div className="flex justify-between">
                        <span>遅刻:</span>
                        <span className="font-medium text-yellow-600">{lateCount}人</span>
                      </div>
                      <div className="flex justify-between">
                        <span>欠課:</span>
                        <span className="font-medium text-red-600">{absentCount}人</span>
                      </div>
                      <div className="flex justify-between">
                        <span>早退:</span>
                        <span className="font-medium text-purple-600">{earlyCount}人</span>
                      </div>
                      <div className="border-t pt-1 mt-1">
                        <div className="flex justify-between font-medium">
                          <span>合計:</span>
                          <span>{classData.length}人</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const selectedDate = searchParams.get('date');
    const filterClass = searchParams.get('class');
    const filterPeriod = searchParams.get('period');

    // パラメータの検証
    if (!selectedDate) {
      console.error('selectedDate is required');
      return NextResponse.json({ error: '日付が指定されていません' }, { status: 400 });
    }
    
    if (!supabaseAdmin) {
      console.error('Export API - Supabase admin client is null');
      return NextResponse.json({ error: 'Supabase not available' }, { status: 500 });
    }

    // 1. 指定されたクラスの全学生を取得
    let studentsQuery = supabaseAdmin
      .from('students')
      .select('id, name, class');

    if (filterClass && filterClass !== 'all') {
      studentsQuery = studentsQuery.eq('class', filterClass);
    }

    const { data: students, error: studentsError } = await studentsQuery;

    if (studentsError) {
      console.error('学生データ取得エラー:', studentsError);
      return NextResponse.json({ error: '学生データの取得に失敗しました' }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ attendance: [] });
    }

    // 型を明示的に指定
    const studentsList: { id: string; name: string; class: string }[] = students as { id: string; name: string; class: string }[];

    // 2. 指定された日付の出席データを取得
    let attendanceQuery = supabaseAdmin
      .from('attend_management')
      .select('*');

    // 日付フィルタリングを実装（クライアント側で処理）
    // データベース側では日付フィルタリングを行わず、全データを取得してからクライアント側でフィルタリング
    if (selectedDate) {
      console.log('=== 日付フィルタリングデバッグ ===');
      console.log('selectedDate:', selectedDate);
      console.log('データベース側では日付フィルタリングをスキップし、クライアント側で処理します');
    }

    if (filterClass && filterClass !== 'all') {
      attendanceQuery = attendanceQuery.eq('class', filterClass);
    }

    // periodフィルタリングは後でクライアント側で処理

    const { data: attendance, error: attendanceError } = await attendanceQuery;

    console.log('=== attend_management取得結果 ===');
    console.log('取得件数:', attendance?.length || 0);
    if (attendance && attendance.length > 0) {
      console.log('最初の3件のtimeフィールド:', attendance.slice(0, 3).map((a: any) => a.time));
      console.log('最初の3件のperiodフィールド:', attendance.slice(0, 3).map((a: any) => a.period));
      console.log('最初の3件のclassフィールド:', attendance.slice(0, 3).map((a: any) => a.class));
    }

    if (attendanceError) {
      console.error('出席データ取得エラー:', attendanceError);
      console.error('エラー詳細:', JSON.stringify(attendanceError, null, 2));
      return NextResponse.json({ 
        error: '出席データの取得に失敗しました', 
        details: attendanceError,
        debug: {
          selectedDate,
          filterClass,
          filterPeriod,
          dateString: selectedDate ? selectedDate.replace(/-/g, '') : null
        }
      }, { status: 500 });
    }


    // 3. period_settingsテーブルから時間割設定を取得
    const { data: periodSettings, error: periodError } = await supabaseAdmin
      .from('period_settings')
      .select('*');

    if (periodError) {
      console.error('period_settings取得エラー:', periodError);
    }

    // 時限と時間帯のマッピングを作成
    const periodTimeMap: { [key: string]: { start: string; end: string } } = {};
    if (periodSettings) {
      periodSettings.forEach((setting: any) => {
        if (setting.period && setting.start_time && setting.end_time) {
          periodTimeMap[setting.period] = {
            start: setting.start_time,
            end: setting.end_time
          };
        }
      });
    }

    // 日付をYYYYMMDD形式に変換する関数（UTC時間の日付部分をそのまま使用）
    const formatDate = (dateString: string) => {
      // UTC時間のISO文字列をDateオブジェクトに変換
      const date = new Date(dateString);
      
      // UTC時間の日付部分をそのまま使用（時刻の影響を完全に排除）
      const utcYear = date.getUTCFullYear();
      const utcMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
      const utcDay = String(date.getUTCDate()).padStart(2, '0');
      
      // UTC時間の日付をそのままフォーマット
      const formattedDate = `${utcYear}${utcMonth}${utcDay}`;
      
      console.log('=== 簡易日付変換デバッグ ===');
      console.log('元の文字列:', dateString);
      console.log('UTC日付:', `${utcYear}-${utcMonth}-${utcDay}`);
      console.log('最終フォーマット:', formattedDate);
      console.log('=== デバッグ終了 ===');
      
      return formattedDate;
    };

    // 4. 日付フィルタリング（クライアント側で処理）
    let filteredAttendance: { id: string; attend: string; time: string; period?: string; place?: string }[] = attendance || [];
    
    if (selectedDate) {
      console.log('=== クライアント側日付フィルタリング ===');
      console.log('フィルタリング前の件数:', filteredAttendance.length);
      
      filteredAttendance = filteredAttendance.filter((item: { time: string }) => {
        const itemDate = formatDate(item.time);
        const targetDate = selectedDate.replace(/-/g, '');
        const match = itemDate === targetDate;
        
        console.log('日付比較:', {
          itemTime: item.time,
          itemDate,
          targetDate,
          match
        });
        
        return match;
      });
      
      console.log('フィルタリング後の件数:', filteredAttendance.length);
    }
    
    // 5. 限目フィルタリング（period_settingsに基づく）
    if (filterPeriod && filterPeriod !== 'all') {
      const periodTime = periodTimeMap[filterPeriod];
      
      if (periodTime) {
        filteredAttendance = filteredAttendance.filter((item: { time: string; period?: string }) => {
          // periodカラムがある場合は優先的に使用
          if (item.period) {
            // 昼間部4限 -> 4限 の変換
            let itemPeriod = item.period;
            if (itemPeriod.includes('昼間部')) {
              itemPeriod = itemPeriod.replace('昼間部', '');
            } else if (itemPeriod.includes('夜間部')) {
              itemPeriod = itemPeriod.replace('夜間部', '');
            }
            
            let targetPeriod = filterPeriod;
            if (targetPeriod.includes('昼間部')) {
              targetPeriod = targetPeriod.replace('昼間部', '');
            } else if (targetPeriod.includes('夜間部')) {
              targetPeriod = targetPeriod.replace('夜間部', '');
            }
            
            const match = itemPeriod === targetPeriod;
            return match;
          }
          
          // periodカラムがない場合は時間で判定
          const itemTime = new Date(item.time);
          const timeStr = itemTime.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: false 
          });
          
          const match = timeStr >= periodTime.start && timeStr <= periodTime.end;
          return match;
        });
      }
    }

    // 学籍番号の4桁目に0を追加する関数
    const formatStudentId = (studentId: string | number) => {
      const studentIdStr = String(studentId);
      if (studentIdStr.length >= 4) {
        return studentIdStr.slice(0, 3) + '0' + studentIdStr.slice(3);
      }
      return studentIdStr;
    };

    // 4. 学生データと出席データを統合
    console.log('=== データ統合デバッグ ===');
    console.log('学生数:', studentsList.length);
    console.log('フィルター済み出席データ数:', filteredAttendance.length);
    console.log('学生IDサンプル:', studentsList.slice(0, 3).map(s => s.id));
    console.log('出席データIDサンプル:', filteredAttendance.slice(0, 3).map((a: any) => a.id));
    
    const exportData = await Promise.all(studentsList.map(async (student: { id: string; name: string; class: string }) => {
      // 該当学生の出席データを検索（型を統一して比較）
      const studentId = String(student.id);
      const studentAttendance = filteredAttendance.find((att: { id: string; attend: string; time: string; period?: string; place?: string }) => String(att.id) === studentId);
      
      // デバッグ用：特定の学生のマッチング状況を確認
      if (studentId === '5' || studentId === '2340002') {
        console.log(`学生ID ${studentId} のマッチング:`, {
          studentId,
          studentAttendance: studentAttendance ? '見つかった' : '見つからない',
          attendanceId: (studentAttendance as any)?.id
        });
      }
      
      if (studentAttendance) {
        // 出席データがある場合
        // 時限情報を取得（出席データのperiodカラムまたはフィルター条件から）
        const periodInfo = studentAttendance.period || filterPeriod;
        
        // 時限の数字部分を抽出（例: '昼間部2限' -> '2'、'2限' -> '2'）
        let periodNumber = '不明';
        if (periodInfo) {
          const match = periodInfo.match(/(\d+)限/);
          if (match) {
            periodNumber = match[1];
          }
        }

        // 出席データがある場合の日付処理
        const timestamp = formatDate(studentAttendance.time);
        console.log(`学生ID ${studentId} の日付変換:`, {
          originalTime: studentAttendance.time,
          formattedDate: timestamp
        });

        return {
          student_id: formatStudentId(student.id),
          date: timestamp,
          period: periodNumber,
          attendance_status: studentAttendance.attend
        };
      } else {
        // 出席データがない場合（欠席）
        // 指定された時限の数字を取得
        let periodNumber = '不明';
        if (filterPeriod && filterPeriod !== 'all') {
          // 時限の数字部分を抽出（例: '昼間部2限' -> '2'、'2限' -> '2'）
          const match = filterPeriod.match(/(\d+)限/);
          if (match) {
            periodNumber = match[1];
          }
        }

        // 欠席の場合の日付処理
        let timestamp;
        if (selectedDate) {
          // 選択された日付をそのまま使用
          timestamp = selectedDate.replace(/-/g, '');
        } else {
          // 現在の日付を使用
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          timestamp = `${year}${month}${day}`;
        }

        return {
          student_id: formatStudentId(student.id),
          date: timestamp,
          period: periodNumber,
          attendance_status: '2'
        };
      }
    }));

    return NextResponse.json({ attendance: exportData });
  } catch (error) {
    console.error('CSVエクスポートデータ取得エラー:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

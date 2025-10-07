import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const selectedDate = searchParams.get('date');
    const filterClass = searchParams.get('class');
    const filterPeriod = searchParams.get('period');

    
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

    if (selectedDate) {
      // 日付フィルタリング（JST基準）
      const startDate = new Date(selectedDate + 'T00:00:00+09:00');
      const endDate = new Date(selectedDate + 'T23:59:59+09:00');
      
      attendanceQuery = attendanceQuery
        .gte('time', startDate.toISOString())
        .lte('time', endDate.toISOString());
    }

    if (filterClass && filterClass !== 'all') {
      attendanceQuery = attendanceQuery.eq('class', filterClass);
    }

    const { data: attendance, error: attendanceError } = await attendanceQuery;

    if (attendanceError) {
      console.error('出席データ取得エラー:', attendanceError);
      return NextResponse.json({ error: '出席データの取得に失敗しました' }, { status: 500 });
    }

    console.log(`\n=== attend_management取得結果 ===`);
    console.log(`取得件数: ${attendance?.length || 0}件`);
    if (attendance && attendance.length > 0) {
      console.log('全データ:', attendance.map((a: any) => ({
        id: a.id,
        attend: a.attend,
        period: a.period,
        time: a.time,
        class: a.class
      })));
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

    // 4. 限目フィルタリング（period_settingsに基づく）
    let filteredAttendance: { id: string; attend: string; time: string; period?: string; place?: string }[] = attendance || [];
    if (filterPeriod && filterPeriod !== 'all') {
      const periodTime = periodTimeMap[filterPeriod];
      
      if (periodTime) {
        console.log(`=== 時限フィルタリング開始: ${filterPeriod} ===`);
        console.log(`時間範囲: ${periodTime.start} - ${periodTime.end}`);
        
        filteredAttendance = filteredAttendance.filter((item: { time: string; period?: string }) => {
          // periodカラムがある場合は優先的に使用
          if (item.period) {
            const match = item.period === filterPeriod;
            console.log(`periodカラムチェック: ${item.period} === ${filterPeriod} → ${match}`);
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
          console.log(`時間チェック: time=${item.time}, timeStr=${timeStr}, 範囲内=${match}`);
          return match;
        });
        
        console.log(`フィルター後: ${filteredAttendance.length}件`);
        console.log('フィルター後のデータ:', filteredAttendance.map((a: any) => ({ id: a.id, attend: a.attend, period: a.period })));
      }
    }

    // 日付をYYYYMMDD形式に変換する関数
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };

    // 学籍番号の4桁目に0を追加する関数
    const formatStudentId = (studentId: string | number) => {
      const studentIdStr = String(studentId);
      if (studentIdStr.length >= 4) {
        return studentIdStr.slice(0, 3) + '0' + studentIdStr.slice(3);
      }
      return studentIdStr;
    };

    // 4. 学生データと出席データを統合
    console.log(`\n=== 学生データと出席データの統合 ===`);
    console.log(`学生数: ${studentsList.length}件, フィルター済み出席データ: ${filteredAttendance.length}件`);
    console.log(`学生IDサンプル:`, studentsList.slice(0, 3).map(s => ({ id: s.id, type: typeof s.id })));
    console.log(`出席データIDサンプル:`, filteredAttendance.map(a => ({ id: a.id, type: typeof a.id })));
    
    const exportData = studentsList.map((student: { id: string; name: string; class: string }) => {
      // 該当学生の出席データを検索（型を統一して比較）
      const studentId = String(student.id);
      const studentAttendance = filteredAttendance.find((att: { id: string; attend: string; time: string; period?: string; place?: string }) => String(att.id) === studentId);
      
      if (studentId === '5') {
        console.log(`\n学籍番号5のデータ統合:`);
        console.log(`  学生情報:`, student, `(型: ${typeof student.id})`);
        console.log(`  出席データ検索結果:`, studentAttendance);
        console.log(`  filteredAttendanceの全ID:`, filteredAttendance.map(a => ({ id: a.id, type: typeof a.id })));
      }
      
      if (studentAttendance) {
        // 出席データがある場合
        // 時限情報を取得（出席データのperiodカラムまたはフィルター条件から）
        let periodInfo = studentAttendance.period || filterPeriod;
        
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

        return {
          id: student.id,
          name: student.name,
          student_id: formatStudentId(student.id),
          class: student.class,
          attendance_type: studentAttendance.attend,
          timestamp: timestamp,
          period: periodNumber,
          location: {
            address: studentAttendance.place || ''
          }
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
          const dateString = selectedDate + 'T00:00:00+09:00';
          timestamp = formatDate(dateString);
        } else {
          timestamp = formatDate(new Date().toISOString());
        }

        return {
          id: student.id,
          name: student.name,
          student_id: formatStudentId(student.id),
          class: student.class,
          attendance_type: '2', // 欠席
          timestamp: timestamp,
          period: periodNumber,
          location: {
            address: ''
          }
        };
      }
    });

    return NextResponse.json({ attendance: exportData });
  } catch (error) {
    console.error('CSVエクスポートデータ取得エラー:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

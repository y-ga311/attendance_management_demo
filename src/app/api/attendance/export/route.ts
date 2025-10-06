import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const selectedDate = searchParams.get('date');
    const filterClass = searchParams.get('class');
    const filterPeriod = searchParams.get('period');

    console.log('CSVエクスポート用データ取得:', {
      selectedDate,
      filterClass,
      filterPeriod
    });

    console.log('Export API - supabaseAdmin check:', !!supabaseAdmin);
    
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

    // 3. 限目フィルタリング（時間帯に基づく）
    let filteredAttendance: { id: string; attend: string; time: string; period?: string; place?: string }[] = attendance || [];
    if (filterPeriod && filterPeriod !== 'all') {
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
        filteredAttendance = filteredAttendance.filter((item: { time: string }) => {
          const itemTime = new Date(item.time);
          const hour = itemTime.getHours();
          return hour >= period.start && hour < period.end;
        });
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
      console.log(`学籍番号変換デバッグ: "${studentIdStr}" (長さ: ${studentIdStr.length})`);
      if (studentIdStr.length >= 4) {
        const formatted = studentIdStr.slice(0, 3) + '0' + studentIdStr.slice(3);
        console.log(`学籍番号変換: ${studentIdStr} -> ${formatted}`);
        return formatted;
      }
      console.log(`学籍番号変換（短い）: ${studentIdStr} -> ${studentIdStr}`);
      return studentIdStr;
    };

    // 4. 学生データと出席データを統合
    console.log('学生データサンプル:', studentsList.slice(0, 3).map(s => ({ id: s.id, name: s.name, class: s.class })));
    
    const exportData = studentsList.map((student: { id: string; name: string; class: string }) => {
      console.log(`処理中の学生: ${student.id} (${student.name})`);
      // 該当学生の出席データを検索
      const studentAttendance = filteredAttendance.find((att: { id: string; attend: string; time: string; period?: string; place?: string }) => att.id === student.id);
      
      if (studentAttendance) {
        // 出席データがある場合
        // 指定された時限の数字を取得
        let periodNumber = '不明';
        if (filterPeriod && filterPeriod !== 'all') {
          // 時限の数字部分を抽出（例: '1限' -> '1'）
          const match = filterPeriod.match(/(\d+)限/);
          if (match) {
            periodNumber = match[1];
          }
        } else if (studentAttendance.period) {
          // 出席データにperiodが設定されている場合、その数字部分を抽出
          const match = studentAttendance.period.match(/(\d+)限/);
          if (match) {
            periodNumber = match[1];
          }
        }

        return {
          id: student.id,
          name: student.name,
          student_id: formatStudentId(student.id),
          class: student.class,
          attendance_type: studentAttendance.attend,
          timestamp: formatDate(studentAttendance.time),
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
          // 時限の数字部分を抽出（例: '1限' -> '1'）
          const match = filterPeriod.match(/(\d+)限/);
          if (match) {
            periodNumber = match[1];
          }
        }

        return {
          id: student.id,
          name: student.name,
          student_id: formatStudentId(student.id),
          class: student.class,
          attendance_type: '2', // 欠席
          timestamp: selectedDate ? formatDate(selectedDate + 'T00:00:00+09:00') : formatDate(new Date().toISOString()),
          period: periodNumber,
          location: {
            address: ''
          }
        };
      }
    });

    console.log('エクスポートデータ生成完了:', {
      totalStudents: studentsList.length,
      attendanceRecords: filteredAttendance.length,
      exportRecords: exportData.length
    });

    return NextResponse.json({ attendance: exportData });
  } catch (error) {
    console.error('CSVエクスポートデータ取得エラー:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

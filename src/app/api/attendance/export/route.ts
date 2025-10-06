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

    if (!supabaseAdmin) {
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
    let filteredAttendance = attendance || [];
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
        filteredAttendance = filteredAttendance.filter(item => {
          const itemTime = new Date(item.time);
          const hour = itemTime.getHours();
          return hour >= period.start && hour < period.end;
        });
      }
    }

    // 4. 学生データと出席データを統合
    const exportData = students.map(student => {
      // 該当学生の出席データを検索
      const studentAttendance = filteredAttendance.find(att => att.id === student.id);
      
      if (studentAttendance) {
        // 出席データがある場合
        return {
          id: student.id,
          name: student.name,
          student_id: student.id,
          class: student.class,
          attendance_type: studentAttendance.attend,
          timestamp: studentAttendance.time,
          period: studentAttendance.period || '不明',
          location: {
            address: studentAttendance.place || ''
          }
        };
      } else {
        // 出席データがない場合（欠席）
        return {
          id: student.id,
          name: student.name,
          student_id: student.id,
          class: student.class,
          attendance_type: '2', // 欠席
          timestamp: selectedDate ? new Date(selectedDate + 'T00:00:00+09:00').toISOString() : new Date().toISOString(),
          period: '不明',
          location: {
            address: ''
          }
        };
      }
    });

    console.log('エクスポートデータ生成完了:', {
      totalStudents: students.length,
      attendanceRecords: filteredAttendance.length,
      exportRecords: exportData.length
    });

    return NextResponse.json({ attendance: exportData });
  } catch (error) {
    console.error('CSVエクスポートデータ取得エラー:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

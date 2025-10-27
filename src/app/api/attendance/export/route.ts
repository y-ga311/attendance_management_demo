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

    // 日付フィルタリングは一時的に無効化（デバッグ用）
    // if (selectedDate) {
    //   // 日付形式を変換（2025-10-27 -> 20251027）
    //   const dateString = selectedDate.replace(/-/g, '');
    //   
    //   console.log('=== 日付フィルタリングデバッグ ===');
    //   console.log('selectedDate:', selectedDate);
    //   console.log('変換後のdateString:', dateString);
    //   
    //   // timestampフィールドで日付フィルタリング（20251027形式）
    //   // 実際のデータは "20251026" 形式なので、完全一致で検索
    //   attendanceQuery = attendanceQuery.eq('timestamp', dateString);
    // }

    if (filterClass && filterClass !== 'all') {
      attendanceQuery = attendanceQuery.eq('class', filterClass);
    }

    // periodフィルタリングは後でクライアント側で処理

    const { data: attendance, error: attendanceError } = await attendanceQuery;

    console.log('=== attend_management取得結果 ===');
    console.log('取得件数:', attendance?.length || 0);
    if (attendance && attendance.length > 0) {
      console.log('最初の3件のtimestampフィールド:', attendance.slice(0, 3).map(a => a.timestamp));
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

    // 4. 限目フィルタリング（period_settingsに基づく）
    let filteredAttendance: { id: string; attend: string; time: string; period?: string; place?: string }[] = attendance || [];
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

    // 日付をYYYYMMDD形式に変換する関数（日本時間）
    const formatDate = (dateString: string) => {
      // ISO文字列をDateオブジェクトに変換
      const date = new Date(dateString);
      
      // Supabaseに保存されているデータは既にJSTなので、そのまま使用
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      
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

    // 緯度・経度から住所を取得する関数
    const getAddressFromCoordinates = async (place: string): Promise<string> => {
      if (!place) return '';
      
      try {
        // placeが緯度,経度の形式かチェック
        const coords = place.split(',');
        if (coords.length !== 2) return place; // 緯度経度でない場合はそのまま返す
        
        const lat = parseFloat(coords[0].trim());
        const lon = parseFloat(coords[1].trim());
        
        if (isNaN(lat) || isNaN(lon)) return place;
        
        // Nominatim APIを使用して住所を取得
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=ja`;
        
        const response = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'AttendanceManagementApp/1.0'
          }
        });
        
        if (!response.ok) {
          console.error('Nominatim API error:', response.status);
          return place;
        }
        
        const data = await response.json();
        
        // 日本の住所形式で返す（都道府県から詳細に表示）
        if (data.address) {
          const addr = data.address;
          const parts = [];
          
          // 国名は除外し、都道府県から詳細に表示
          if (addr.state) parts.push(addr.state);
          if (addr.city || addr.town || addr.village) {
            parts.push(addr.city || addr.town || addr.village);
          }
          if (addr.suburb) parts.push(addr.suburb);
          if (addr.quarter) parts.push(addr.quarter);
          if (addr.neighbourhood) parts.push(addr.neighbourhood);
          if (addr.road) parts.push(addr.road);
          if (addr.house_number) parts.push(addr.house_number);
          if (addr.building) parts.push(addr.building);
          if (addr.amenity) parts.push(addr.amenity);
          if (addr.shop) parts.push(addr.shop);
          
          return parts.join('') || data.display_name || place;
        }
        
        return data.display_name || place;
      } catch (error) {
        console.error('住所取得エラー:', error);
        return place;
      }
    };

    // 時刻をHH:MM:SS形式に変換する関数（日本時間）
    const formatTime = (dateString: string) => {
      // ISO文字列をDateオブジェクトに変換
      const date = new Date(dateString);
      
      // Supabaseに保存されているデータは既にJSTなので、そのまま使用
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      
      return `${hours}:${minutes}:${seconds}`;
    };

    // 4. 学生データと出席データを統合
    console.log('=== データ統合デバッグ ===');
    console.log('学生数:', studentsList.length);
    console.log('フィルター済み出席データ数:', filteredAttendance.length);
    console.log('学生IDサンプル:', studentsList.slice(0, 3).map(s => s.id));
    console.log('出席データIDサンプル:', filteredAttendance.slice(0, 3).map(a => a.id));
    
    const exportData = await Promise.all(studentsList.map(async (student: { id: string; name: string; class: string }) => {
      // 該当学生の出席データを検索（型を統一して比較）
      const studentId = String(student.id);
      const studentAttendance = filteredAttendance.find((att: { id: string; attend: string; time: string; period?: string; place?: string }) => String(att.id) === studentId);
      
      // デバッグ用：特定の学生のマッチング状況を確認
      if (studentId === '5' || studentId === '2340002') {
        console.log(`学生ID ${studentId} のマッチング:`, {
          studentId,
          studentAttendance: studentAttendance ? '見つかった' : '見つからない',
          attendanceId: studentAttendance?.id
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
        const readTime = formatTime(studentAttendance.time);
        
        // 緯度経度から住所を取得
        const address = await getAddressFromCoordinates(studentAttendance.place || '');

        return {
          id: student.id,
          name: student.name,
          student_id: formatStudentId(student.id),
          class: student.class,
          attendance_type: studentAttendance.attend,
          timestamp: timestamp,
          period: periodNumber,
          read_time: readTime,
          location: {
            address: address,
            coordinates: studentAttendance.place || ''
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
          read_time: '',
          location: {
            address: '',
            coordinates: ''
          }
        };
      }
    }));

    return NextResponse.json({ attendance: exportData });
  } catch (error) {
    console.error('CSVエクスポートデータ取得エラー:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { promises as fs } from 'fs';
import path from 'path';
import { getPeriodFromTime, getDefaultPeriodSettings } from '@/lib/period-utils';

// 日本語日付文字列を解析する共通関数
const parseJapaneseDate = (dateString: string): Date => {
  const match = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日(\d{1,2})時(\d{1,2})分(\d{1,2})秒/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }
  return new Date(dateString);
};

const DATA_FILE = path.join(process.cwd(), 'attendance.json');

export async function POST(req: NextRequest) {
  try {
    console.log('=== API attendance POST 開始 ===');
    console.log('API attendance POST リクエスト受信');
    console.log('Supabase設定状況:', {
      supabaseAvailable: !!supabase,
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
    
    console.log('リクエストボディの解析開始...');
    const body = await req.json();
    console.log('リクエストボディ解析完了:', body);
    
    // attend_managementテーブル用のデータ検証
    if (!body.id || !body.name || !body.class || !body.time || !body.attend) {
      console.error('不正なデータ:', { 
        id: body.id, 
        name: body.name, 
        class: body.class, 
        time: body.time, 
        attend: body.attend 
      });
      return NextResponse.json({ error: '不正なデータです' }, { status: 400 });
    }

    // attend_managementテーブル用のデータ構造
    const attendanceData = {
      id: body.id,           // 学籍番号
      name: body.name,       // 名前
      class: body.class,     // 所属
      time: body.time,       // 時間
      place: body.place || '', // 場所
      attend: body.attend    // 出席状況
    };

    console.log('処理する出席データ:', attendanceData);

    // period判定のための時間抽出
    let period = body.period || null; // QRコードから受け取った時限情報を優先

    // QRコードに時限情報が含まれていない場合は時間から判定
    if (!period) {
      const attendanceTime = parseJapaneseDate(attendanceData.time);
      const timeString = attendanceTime.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      // 時間割設定を取得（デフォルト設定を使用）
      const periodSettings = getDefaultPeriodSettings();
      period = getPeriodFromTime(timeString, periodSettings) || '不明';

      console.log('時間から自動判定:', { timeString, period });
    } else {
      console.log('QRコードから取得した時限:', period);
    }

    // period情報をattendanceDataに追加
    const attendanceDataWithPeriod = {
      ...attendanceData,
      period: period
    };

    console.log('period情報追加後の出席データ:', attendanceDataWithPeriod);

    // Supabaseが利用できない場合はファイルベースの保存を使用
    if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseAdmin) {
      console.log('=== ファイルベース保存モード ===');
      console.log('Supabase not available, using file-based storage');
      console.log('ファイルパス:', DATA_FILE);
      console.log('現在の作業ディレクトリ:', process.cwd());
      
      let data = [];
      try {
        console.log('データファイル読み込み開始:', DATA_FILE);
        
        // ファイルの存在確認
        try {
          await fs.access(DATA_FILE);
          console.log('ファイルが存在します');
        } catch {
          console.log('ファイルが存在しません。新規作成します。');
          await fs.writeFile(DATA_FILE, '[]', 'utf-8');
          console.log('空のファイルを作成しました');
        }
        
        const file = await fs.readFile(DATA_FILE, 'utf-8');
        console.log('ファイル内容:', file);
        data = JSON.parse(file);
        console.log('既存データ数:', data.length);
        console.log('既存データ:', data);
      } catch (error) {
        console.log('データファイルが存在しないか読み込みエラー:', error);
        console.log('エラー詳細:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: (error as { code?: string })?.code,
          errno: (error as { errno?: number })?.errno
        });
        data = [];
      }

    // 重複チェック（同じidで1分以内のデータがあるかチェック）

    const currentTime = parseJapaneseDate(attendanceData.time);
    const oneMinuteAgo = new Date(currentTime.getTime() - 60 * 1000);

      const isDuplicate = data.some((record: { id: string; time: string }) => {
        if (record.id !== attendanceData.id) return false;
        const recordTime = parseJapaneseDate(record.time);
        return recordTime >= oneMinuteAgo && recordTime <= currentTime;
      });

      if (isDuplicate) {
        console.log('重複データを検出しました：', attendanceData);
        return NextResponse.json({ message: '既に記録済みです' }, { status: 200 });
      }

      data.push(attendanceData);
      
      try {
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(DATA_FILE, jsonData, 'utf-8');
        console.log('ファイル書き込み完了:', DATA_FILE);
        console.log('保存されたデータ:', data);
      } catch (writeError) {
        console.error('ファイル書き込みエラー:', writeError);
        console.error('ファイルパス:', DATA_FILE);
        console.error('書き込みエラー詳細:', {
          message: writeError instanceof Error ? writeError.message : 'Unknown error',
          code: (writeError as { code?: string })?.code,
          errno: (writeError as { errno?: number })?.errno
        });
        return NextResponse.json({ 
          error: 'ファイルの保存に失敗しました',
          details: writeError instanceof Error ? writeError.message : 'Unknown error',
          filePath: DATA_FILE
        }, { status: 500 });
      }
      
      console.log('=== ファイル保存成功 ===');
      console.log('打刻データを受信しました：', attendanceData);
      return NextResponse.json({ message: '保存しました', data: attendanceData });
    }

    // Supabaseを使用した保存（Service Role KeyでRLSをバイパス）
    console.log('=== Supabase保存モード ===');
    console.log('Service Role Key使用でRLSをバイパス');
    
      // 重複チェック（同じ学籍番号で1分以内のデータがあるかチェック）

    const currentTime = parseJapaneseDate(attendanceData.time);
    const oneMinuteAgo = new Date(currentTime.getTime() - 60 * 1000); // 1分前

    const { data: existingRecords, error: checkError } = await supabaseAdmin
      .from('attend_management')
      .select('*')
      .eq('id', attendanceDataWithPeriod.id)
      .gte('time', oneMinuteAgo.toISOString())
      .lte('time', currentTime.toISOString());

    if (checkError) {
      console.error('重複チェックエラー:', checkError);
    }

    if (existingRecords && existingRecords.length > 0) {
      console.log('重複データを検出しました：', attendanceDataWithPeriod);
      return NextResponse.json({ message: '既に記録済みです' }, { status: 200 });
    }

    // 出席データをattend_managementテーブルに保存（Service Role Key使用）
    const { data: newAttendance, error: insertError } = await (supabaseAdmin as any)
      .from('attend_management')
      .insert({
        id: attendanceDataWithPeriod.id,
        name: attendanceDataWithPeriod.name,
        class: attendanceDataWithPeriod.class,
        time: currentTime.toISOString(), // ISO形式に変換
        place: attendanceDataWithPeriod.place,
        attend: attendanceDataWithPeriod.attend,
        period: attendanceDataWithPeriod.period
      })
      .select()
      .single();

    if (insertError) {
      console.error('出席データ保存エラー:', insertError);
      console.error('エラー詳細:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      return NextResponse.json({ 
        error: '出席データの保存に失敗しました',
        details: insertError.message,
        code: insertError.code
      }, { status: 500 });
    }
    
    console.log('打刻データを受信しました：', newAttendance);
    return NextResponse.json({ message: '保存しました', data: newAttendance });
  } catch (error) {
    console.error('API エラー:', error);
    console.error('エラーの詳細:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({ 
      error: 'サーバーエラー',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : 'Unknown'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Supabaseが利用できない場合はファイルベースの取得を使用
    if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('Supabase not available, using file-based storage');
      
      try {
        const file = await fs.readFile(DATA_FILE, 'utf-8');
        const data = JSON.parse(file);
        return NextResponse.json({ attendance: data });
      } catch {
        return NextResponse.json({ attendance: [] });
      }
    }

    // 出席データをattend_managementテーブルから取得（Service Role Key使用）
    if (!supabaseAdmin) {
      console.error('Supabase admin client not available');
      return NextResponse.json({ attendance: [] });
    }
    
    const { data: attendance, error: fetchError } = await supabaseAdmin
      .from('attend_management')
      .select('*')
      .order('time', { ascending: false });

    if (fetchError) {
      console.error('出席データ取得エラー:', fetchError);
      return NextResponse.json({ attendance: [] });
    }

    // 既存のAPI形式に合わせてレスポンスを整形
    const formattedData = (attendance || []).map((item: { id: string; name: string; class: string; attend: string; time: string; place: string }) => ({
      id: item.id,
      name: item.name,
      student_id: item.id,
      class: item.class,
      attendance_type: item.attend,
      timestamp: item.time,
      location: {
        address: item.place
      }
    }));

    return NextResponse.json({ attendance: formattedData });
  } catch (error) {
    console.error('出席データ取得エラー:', error);
    return NextResponse.json({ attendance: [] });
  }
} 
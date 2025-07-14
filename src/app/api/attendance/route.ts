import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'attendance.json');

export async function POST(req: NextRequest) {
  try {
    console.log('API attendance POST リクエスト受信');
    
    const body = await req.json();
    console.log('リクエストボディ:', body);
    
    if (!body.name || !body.timestamp) {
      console.error('不正なデータ:', { name: body.name, timestamp: body.timestamp });
      return NextResponse.json({ error: '不正なデータです' }, { status: 400 });
    }

    // 学生情報を取得してクラスと学籍番号の情報を追加
    let studentClass = '';
    let studentId = '';
    try {
      const configFile = path.join(process.cwd(), 'user_config.json');
      console.log('設定ファイルパス:', configFile);
      const configData = await fs.readFile(configFile, 'utf-8');
      const config = JSON.parse(configData);
      studentClass = config.user_info.class || '';
      studentId = config.user_info.student_id || '';
      console.log('学生情報取得:', { studentClass, studentId });
    } catch (error) {
      console.log('学生情報の取得に失敗しました:', error);
    }

    // 出席タイプのデフォルト値を設定し、クラス、学籍番号と位置情報を追加
    const attendanceData = {
      ...body,
      attendance_type: body.attendance_type || '出席',
      class: studentClass,
      student_id: studentId
    };

    console.log('処理する出席データ:', attendanceData);

    let data = [];
    try {
      console.log('データファイル読み込み開始:', DATA_FILE);
      const file = await fs.readFile(DATA_FILE, 'utf-8');
      data = JSON.parse(file);
      console.log('既存データ数:', data.length);
    } catch (error) {
      console.log('データファイルが存在しないか読み込みエラー:', error);
      // ファイルがなければ空配列
      data = [];
    }

    // 重複チェック（同じnameで1分以内のデータがあるかチェック）
    const currentTime = new Date(attendanceData.timestamp);
    const oneMinuteAgo = new Date(currentTime.getTime() - 60 * 1000); // 1分前

    const isDuplicate = data.some((record: { name: string; timestamp: string }) => {
      if (record.name !== attendanceData.name) return false;
      
      const recordTime = new Date(record.timestamp);
      return recordTime >= oneMinuteAgo && recordTime <= currentTime;
    });

    if (isDuplicate) {
      console.log('重複データを検出しました：', attendanceData);
      return NextResponse.json({ message: '既に記録済みです' }, { status: 200 });
    }

    data.push(attendanceData);
    console.log('データファイル書き込み開始');
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log('打刻データを受信しました：', attendanceData);
    return NextResponse.json({ message: '保存しました' });
  } catch (error) {
    console.error('API エラー:', error);
    console.error('エラーの詳細:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const file = await fs.readFile(DATA_FILE, 'utf-8');
    const data = JSON.parse(file);
    return NextResponse.json({ attendance: data });
  } catch {
    return NextResponse.json({ attendance: [] });
  }
} 
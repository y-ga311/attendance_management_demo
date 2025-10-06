import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { settings } = await request.json();
    
    if (!settings) {
      return NextResponse.json({ error: '設定データが提供されていません' }, { status: 400 });
    }

    // テーブルが存在するかチェック
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not available' }, { status: 500 });
    }
    
    const { error: tableError } = await supabaseAdmin
      .from('period_settings')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.error('テーブルが存在しません:', tableError);
      return NextResponse.json({ 
        error: 'period_settingsテーブルが存在しません。データベースのセットアップが必要です。',
        code: 'TABLE_NOT_EXISTS'
      }, { status: 500 });
    }

    // 時間割設定をデータベースに保存
    // 既存の設定を削除してから新しい設定を挿入
    const { error: deleteError } = await supabaseAdmin
      .from('period_settings')
      .delete()
      .neq('id', 0); // 全件削除

    if (deleteError) {
      console.error('既存設定削除エラー:', deleteError);
      return NextResponse.json({ error: '既存設定の削除に失敗しました: ' + deleteError.message }, { status: 500 });
    }

    // 新しい設定を挿入
    const settingsArray = Object.entries(settings).map(([period, times]) => ({
      period,
      start_time: (times as { startTime: string; endTime: string }).startTime,
      end_time: (times as { startTime: string; endTime: string }).endTime,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await (supabaseAdmin as any)
      .from('period_settings')
      .insert(settingsArray);

    if (insertError) {
      console.error('設定保存エラー:', insertError);
      return NextResponse.json({ error: '設定の保存に失敗しました: ' + insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: '時間割設定を保存しました',
      savedSettings: settings
    });
  } catch (error: unknown) {
    console.error('時間割設定保存エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    return NextResponse.json({ 
      error: 'サーバーエラーが発生しました: ' + errorMessage 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not available' }, { status: 500 });
    }
    
    const { data: settings, error } = await supabaseAdmin
      .from('period_settings')
      .select('*')
      .order('period');

    if (error) {
      console.error('時間割設定取得エラー:', error);
      return NextResponse.json({ error: '設定の取得に失敗しました' }, { status: 500 });
    }

    // 設定データをオブジェクト形式に変換
    const settingsObject = settings?.reduce((acc, setting: { period: string; start_time: string; end_time: string }) => {
      acc[setting.period] = {
        startTime: setting.start_time,
        endTime: setting.end_time
      };
      return acc;
    }, {} as {[key: string]: {startTime: string, endTime: string}}) || {};

    return NextResponse.json({ settings: settingsObject });
  } catch (error) {
    console.error('時間割設定取得エラー:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

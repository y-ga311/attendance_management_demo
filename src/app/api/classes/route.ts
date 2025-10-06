import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Classes API - supabaseAdmin check:', !!supabaseAdmin);
    
    if (!supabaseAdmin) {
      console.error('Classes API - Supabase admin client is null');
      return NextResponse.json({ error: 'Supabase not available' }, { status: 500 });
    }

    // studentsテーブルからクラス一覧を取得
    console.log('Classes API - Attempting to query students table');
    const { data: classes, error } = await supabaseAdmin
      .from('students')
      .select('class')
      .not('class', 'is', null);

    if (error) {
      console.error('クラス一覧取得エラー:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json({ error: 'クラス一覧の取得に失敗しました: ' + error.message }, { status: 500 });
    }

    // 重複を除去してソート
    const uniqueClasses = [...new Set(classes?.map((item: { class: string }) => item.class) || [])]
      .filter(Boolean)
      .sort();

    return NextResponse.json({ classes: uniqueClasses });
  } catch (error) {
    console.error('クラス一覧取得エラー:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

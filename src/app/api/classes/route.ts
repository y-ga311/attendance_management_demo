import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not available' }, { status: 500 });
    }

    // studentsテーブルからクラス一覧を取得
    const { data: classes, error } = await supabaseAdmin
      .from('students')
      .select('class')
      .not('class', 'is', null);

    if (error) {
      console.error('クラス一覧取得エラー:', error);
      return NextResponse.json({ error: 'クラス一覧の取得に失敗しました' }, { status: 500 });
    }

    // 重複を除去してソート
    const uniqueClasses = [...new Set(classes?.map(item => item.class) || [])]
      .filter(Boolean)
      .sort();

    return NextResponse.json({ classes: uniqueClasses });
  } catch (error) {
    console.error('クラス一覧取得エラー:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

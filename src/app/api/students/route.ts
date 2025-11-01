import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// 学生一覧取得
export async function GET() {
  try {
    const { data: students, error } = await supabaseAdmin
      .from('students')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('学生データ取得エラー:', error);
      return NextResponse.json({ error: '学生データの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ students });
  } catch (error) {
    console.error('学生データ取得エラー:', error);
    return NextResponse.json({ error: '学生データの取得に失敗しました' }, { status: 500 });
  }
}

// 学生情報更新
export async function PUT(request: NextRequest) {
  try {
    const { id, name, class: studentClass, student_id, email } = await request.json();

    if (!id || !name || !studentClass) {
      return NextResponse.json({ error: '必要な情報が不足しています' }, { status: 400 });
    }

    const updateData: any = { name, class: studentClass };
    if (student_id !== undefined) {
      updateData.student_id = student_id;
    }
    if (email !== undefined) {
      updateData.email = email;
    }

    const { data, error } = await supabaseAdmin
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('学生情報更新エラー:', error);
      return NextResponse.json({ error: '学生情報の更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ student: data[0] });
  } catch (error) {
    console.error('学生情報更新エラー:', error);
    return NextResponse.json({ error: '学生情報の更新に失敗しました' }, { status: 500 });
  }
}

// 学生削除
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '学生IDが必要です' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('students')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('学生削除エラー:', error);
      return NextResponse.json({ error: '学生の削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('学生削除エラー:', error);
    return NextResponse.json({ error: '学生の削除に失敗しました' }, { status: 500 });
  }
}
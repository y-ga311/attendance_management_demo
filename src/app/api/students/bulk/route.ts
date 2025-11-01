import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// CSV一括学生登録
export async function POST(request: NextRequest) {
  try {
    const { students } = await request.json();

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: '学生データが必要です' }, { status: 400 });
    }

    const errors: string[] = [];
    const successCount: number[] = [];
    const failCount: number[] = [];

    // 各学生データを順次処理
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const rowNumber = i + 2; // CSVの行番号（ヘッダーを含む）

      // 必須フィールドのチェック
      if (!student.id) {
        errors.push(`行${rowNumber}: 学籍番号（id）がありません`);
        failCount.push(rowNumber);
        continue;
      }

      if (!student.name) {
        errors.push(`行${rowNumber}: 氏名（name）がありません`);
        failCount.push(rowNumber);
        continue;
      }

      if (!student.class) {
        errors.push(`行${rowNumber}: クラス（class）がありません`);
        failCount.push(rowNumber);
        continue;
      }

      try {
        // 既存の学生をチェック
        const { data: existing } = await supabaseAdmin
          .from('students')
          .select('id')
          .eq('id', student.id)
          .single();

        if (existing) {
          // 既存の学生を更新
          const updateData: any = {
            name: student.name,
            class: student.class,
          };

          if (student.gakusei_id !== undefined) {
            updateData.gakusei_id = student.gakusei_id;
          }
          if (student.gakusei_password !== undefined) {
            updateData.gakusei_password = student.gakusei_password;
          }

          const { error: updateError } = await supabaseAdmin
            .from('students')
            .update(updateData)
            .eq('id', student.id);

          if (updateError) {
            errors.push(`行${rowNumber}: 更新エラー - ${updateError.message}`);
            failCount.push(rowNumber);
          } else {
            successCount.push(rowNumber);
          }
        } else {
          // 新規学生を追加
          const insertData: any = {
            id: student.id,
            name: student.name,
            class: student.class,
          };

          if (student.gakusei_id !== undefined) {
            insertData.gakusei_id = student.gakusei_id;
          }
          if (student.gakusei_password !== undefined) {
            insertData.gakusei_password = student.gakusei_password;
          }

          const { error: insertError } = await supabaseAdmin
            .from('students')
            .insert(insertData);

          if (insertError) {
            errors.push(`行${rowNumber}: 登録エラー - ${insertError.message}`);
            failCount.push(rowNumber);
          } else {
            successCount.push(rowNumber);
          }
        }
      } catch (error: any) {
        errors.push(`行${rowNumber}: 処理エラー - ${error.message}`);
        failCount.push(rowNumber);
      }
    }

    return NextResponse.json({
      success: true,
      total: students.length,
      successCount: successCount.length,
      failCount: failCount.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('一括登録エラー:', error);
    return NextResponse.json({ error: '一括登録に失敗しました' }, { status: 500 });
  }
}

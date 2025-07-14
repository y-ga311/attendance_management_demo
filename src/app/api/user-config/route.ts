import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'user_config.json');

export async function GET() {
  try {
    const file = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(file);
    return NextResponse.json(config);
  } catch (e) {
    // ファイルが存在しない場合はデフォルト値を返す
    return NextResponse.json({
      user_info: {
        name: "東洋太郎",
        class: "22期生昼間部"
      }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 設定を更新
    const config = {
      user_info: {
        name: body.name || "東洋太郎",
        class: body.class || "22期生昼間部"
      }
    };
    
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return NextResponse.json({ message: '設定を更新しました' });
  } catch (e) {
    return NextResponse.json({ error: '設定の更新に失敗しました' }, { status: 500 });
  }
} 
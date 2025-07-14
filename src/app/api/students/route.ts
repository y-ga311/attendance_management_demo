import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const STUDENTS_FILE = path.join(process.cwd(), 'students_data.json');

export async function GET() {
  try {
    const file = await fs.readFile(STUDENTS_FILE, 'utf-8');
    const students = JSON.parse(file);
    return NextResponse.json({ students });
  } catch {
    // ファイルが存在しない場合は空配列を返す
    return NextResponse.json({ students: [] });
  }
} 
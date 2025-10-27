// 時間に基づいてperiodを判定するユーティリティ関数
import { supabaseAdmin } from '@/lib/supabase';

export interface PeriodSetting {
  startTime: string;
  endTime: string;
}

export interface PeriodSettings {
  [period: string]: PeriodSetting;
}

/**
 * 指定された時間がどの限目に該当するかを判定する
 * @param timeString - 判定する時間（HH:mm形式）
 * @param periodSettings - 時間割設定
 * @returns 該当する限目、該当しない場合はnull
 */
export function getPeriodFromTime(timeString: string, periodSettings: PeriodSettings): string | null {
  // 時間文字列を分に変換
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const targetMinutes = timeToMinutes(timeString);

  // 各限目の時間範囲をチェック
  for (const [period, setting] of Object.entries(periodSettings)) {
    const startMinutes = timeToMinutes(setting.startTime);
    const endMinutes = timeToMinutes(setting.endTime);

    // 時間範囲内かチェック（開始時間は含む、終了時間は含まない）
    if (targetMinutes >= startMinutes && targetMinutes < endMinutes) {
      return period;
    }
  }

  return null;
}

/**
 * デフォルトの時間割設定を取得（フォールバック用）
 */
export function getDefaultPeriodSettings(): PeriodSettings {
  return {
    '昼間部1限': { startTime: '09:10', endTime: '10:40' },
    '昼間部2限': { startTime: '10:50', endTime: '12:20' },
    '昼間部3限': { startTime: '13:20', endTime: '14:50' },
    '昼間部4限': { startTime: '15:00', endTime: '16:50' },
    '夜間部1限': { startTime: '18:00', endTime: '19:30' },
    '夜間部2限': { startTime: '19:40', endTime: '21:10' }
  };
}

/**
 * period_settingsテーブルから時間割設定を取得
 * @returns Promise<PeriodSettings> - 時間割設定オブジェクト
 */
export async function getPeriodSettingsFromDB(): Promise<PeriodSettings> {
  try {
    console.log('getPeriodSettingsFromDB: 開始');
    
    if (!supabaseAdmin) {
      console.warn('Supabase admin client not available, using default settings');
      return getDefaultPeriodSettings();
    }

    console.log('period_settingsテーブルからデータを取得中...');
    const { data: settings, error } = await supabaseAdmin
      .from('period_settings')
      .select('period, start_time, end_time')
      .order('period');

    if (error) {
      console.error('period_settings取得エラー:', error);
      return getDefaultPeriodSettings();
    }

    console.log('取得したデータ:', settings);

    if (!settings || settings.length === 0) {
      console.warn('period_settingsテーブルが空、デフォルト設定を使用');
      return getDefaultPeriodSettings();
    }

    // データベースの設定をオブジェクト形式に変換
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.period] = {
        startTime: setting.start_time,
        endTime: setting.end_time
      };
      return acc;
    }, {} as PeriodSettings);

    console.log('period_settingsテーブルから設定を取得:', settingsObject);
    return settingsObject;
  } catch (error) {
    console.error('period_settings取得エラー:', error);
    return getDefaultPeriodSettings();
  }
}

/**
 * 現在時刻に基づいてperiodを判定する
 * @param periodSettings - 時間割設定
 * @returns 該当する限目、該当しない場合はnull
 */
export function getCurrentPeriod(periodSettings: PeriodSettings): string | null {
  const now = new Date();
  const timeString = now.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  return getPeriodFromTime(timeString, periodSettings);
}

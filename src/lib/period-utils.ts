// 時間に基づいてperiodを判定するユーティリティ関数

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
 * デフォルトの時間割設定を取得
 */
export function getDefaultPeriodSettings(): PeriodSettings {
  return {
    '1限': { startTime: '09:00', endTime: '10:30' },
    '2限': { startTime: '10:40', endTime: '12:10' },
    '3限': { startTime: '13:00', endTime: '14:30' },
    '4限': { startTime: '14:40', endTime: '16:10' },
    '5限': { startTime: '16:20', endTime: '17:50' },
    '6限': { startTime: '18:00', endTime: '19:30' },
    '7限': { startTime: '19:40', endTime: '21:10' },
    '8限': { startTime: '21:20', endTime: '22:50' }
  };
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

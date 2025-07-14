'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

type AttendanceType = '出席' | '遅刻' | '欠課' | '早退';
type CameraStatus = 'idle' | 'starting' | 'active' | 'error';

export default function ClassroomPage() {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [scanMessage, setScanMessage] = useState('');
  const [scanResult, setScanResult] = useState('');
  const [selectedCamera] = useState('user'); // 前面カメラ固定
  
  // カメラ管理用のref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrCodeRef = useRef<any>(null); // Html5Qrcodeのインスタンスを保持
  const qrReaderContainerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // カメラ権限チェック関数
  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      return false;
    }
  };

  // カメラの初期化
  useEffect(() => {
    let initTimeout: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 3;

    const initializeCamera = async () => {
      if (typeof window === 'undefined') return; // SSR対策
      
      console.log('カメラ初期化開始');
      setCameraStatus('starting');
      
      try {
        // 動的import
        const { Html5Qrcode, Html5QrcodeScanType, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        console.log('html5-qrcodeライブラリ読み込み完了');
        
        // カメラ権限チェック
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setScanMessage('このブラウザはカメラに対応していません');
          setCameraStatus('error');
          return;
        }
        
        // HTTPS環境でのカメラアクセス確認
        if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          console.error('カメラアクセスにはHTTPSが必要です');
          setScanMessage('カメラアクセスにはHTTPSが必要です');
          setCameraStatus('error');
          return;
        }

        // まず、Permissions APIで権限状態を確認
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          
          if (permission.state === 'denied') {
            setScanMessage('カメラ権限が拒否されています');
            setCameraStatus('error');
            return;
          }
        }
        
        // Permissions APIが利用できない場合や状態が不明な場合は、実際にカメラアクセスを試行
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        // ストリームを即座に停止
        stream.getTracks().forEach(track => {
          track.stop();
        });

        console.log('カメラ権限確認完了');

        // コンテナの準備を確認してカメラを自動起動
        const checkAndStartCamera = () => {
          if (qrReaderContainerRef.current) {
            console.log('QRリーダーコンテナ準備完了、カメラ起動開始');
            // 少し遅延してからカメラを起動
            initTimeout = setTimeout(() => {
              startCamera(Html5Qrcode, Html5QrcodeScanType, Html5QrcodeSupportedFormats);
            }, 500);
          } else {
            retryCount++;
            console.log(`QRリーダーコンテナ準備中... 試行回数: ${retryCount}/${maxRetries}`);
            if (retryCount <= maxRetries) {
              // 再試行
              initTimeout = setTimeout(checkAndStartCamera, 1000);
            } else {
              setScanMessage('カメラコンテナが準備できませんでした。ページを再読み込みしてください。');
              setCameraStatus('error');
            }
          }
        };
        
        checkAndStartCamera();
      } catch (e) {
        console.error('カメラ初期化エラー:', e);
        setScanMessage('カメラの初期化に失敗しました。');
        setCameraStatus('error');
      }
    };
    
    // 少し遅延してから初期化を開始
    const delayTimeout = setTimeout(() => {
      initializeCamera();
    }, 1000);
    
    return () => {
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      if (delayTimeout) {
        clearTimeout(delayTimeout);
      }
      cleanupCamera().catch(console.error);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // カメラのクリーンアップ
  const cleanupCamera = useCallback(async () => {
    
    // html5QrCodeの停止
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (error) {
        console.error('html5QrCode停止エラー:', error);
      }
    }
    
    // メディアストリームの停止
    try {
      const videoElements = document.querySelectorAll('video');
      for (const video of videoElements) {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (trackError) {
              console.error('トラック停止エラー:', trackError);
            }
          });
          video.srcObject = null;
        }
      }
    } catch (streamError) {
      console.error('メディアストリーム停止エラー:', streamError);
    }
    
    // すべてのvideo要素を削除
    try {
      const allVideos = document.querySelectorAll('video');
      allVideos.forEach(video => {
        const parentNode = video.parentNode;
        if (parentNode) {
          parentNode.removeChild(video);
        }
      });
    } catch (error) {
      console.error('video要素削除エラー:', error);
    }
    
    // canvas要素も削除
    try {
      const allCanvases = document.querySelectorAll('canvas');
      allCanvases.forEach(canvas => {
        const parentNode = canvas.parentNode;
        if (parentNode) {
          parentNode.removeChild(canvas);
        }
      });
    } catch (error) {
      console.error('canvas要素削除エラー:', error);
    }
    
    // Html5Qrcode関連の要素を削除
    try {
      const allQrElements = document.querySelectorAll('[id^="html5-qrcode-"]');
      allQrElements.forEach(element => {
        const parentNode = element.parentNode;
        if (parentNode) {
          parentNode.removeChild(element);
        }
      });
    } catch (error) {
      console.error('Html5Qrcode要素削除エラー:', error);
    }
    
    // インスタンスをクリア
    html5QrCodeRef.current = null;
    isInitializedRef.current = false;
  }, []);

  // startCameraを引数付きで修正
  const startCamera = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Html5Qrcode: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Html5QrcodeScanType: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Html5QrcodeSupportedFormats: any
  ) => {
    // エラーの場合のみ早期リターン
    if (cameraStatus === 'error') {
      console.log('カメラエラー状態のため起動をスキップ');
      return;
    }

    console.log('startCamera関数開始');
    setCameraStatus('starting');

    try {
      // 既存のインスタンスをクリーンアップ
      console.log('既存インスタンスのクリーンアップ開始');
      await cleanupCamera();
      console.log('クリーンアップ完了');

      // ページ全体からHtml5Qrcode関連の要素を完全に削除
      const allQrElements = document.querySelectorAll('[id^="html5-qrcode-"]');
      allQrElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      
      // すべてのvideo要素を削除
      const allVideos = document.querySelectorAll('video');
      allVideos.forEach(video => {
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
      });
      
      // canvas要素も削除
      const allCanvases = document.querySelectorAll('canvas');
      allCanvases.forEach(canvas => {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      });
      
      // コンテナを完全にクリア
      const container = document.getElementById("qr-reader");
      if (container) {
        // すべての子要素を削除
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        // コンテナ自体もクリア
        container.innerHTML = '';
        console.log('QRリーダーコンテナクリア完了');
      } else {
        console.warn('警告: QRリーダーコンテナが見つかりません');
      }
      
      // より長く待機してから新しいインスタンスを作成
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 新しいインスタンスを作成
      console.log('新しいHtml5Qrcodeインスタンス作成開始');
      
      // コンテナの存在を確認
      const qrContainer = document.getElementById("qr-reader");
      if (!qrContainer) {
        throw new Error("QRリーダーコンテナが見つかりません");
      }
      
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;
      isInitializedRef.current = true;
      console.log('Html5Qrcodeインスタンス作成完了');

      // 画面サイズに応じてQRボックスのサイズを動的に調整
      const getQRBoxSize = () => {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // 画面サイズに応じて適切なサイズを計算
        let size = 250; // デフォルトサイズを大きくする
        
        if (screenWidth < 480) {
          size = Math.max(150, Math.min(screenWidth * 0.7, screenHeight * 0.5)); // 最小150px
        } else if (screenWidth < 768) {
          size = Math.max(200, Math.min(screenWidth * 0.6, screenHeight * 0.6)); // 最小200px
        } else {
          size = Math.max(250, Math.min(screenWidth * 0.5, screenHeight * 0.7)); // 最小250px
        }
        
        // 50pxの最小制限を確実に満たす
        size = Math.max(50, size);
        
        return Math.floor(size);
      };

      // カメラ設定
      const config = {
        fps: 3, // フレームレートをさらに下げて安定性を向上
        qrbox: { width: getQRBoxSize(), height: getQRBoxSize() }, // 動的にサイズ調整
        aspectRatio: 1.0,
        disableFlip: false,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        // デプロイ環境での互換性を向上
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false // デプロイ環境では無効化
        },
        // QRコードのみに限定して検出精度を向上
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      };

      console.log('カメラ設定完了:', config);

      // カメラを開始（選択されたカメラを使用）
      try {
        // カメラ権限を再確認
        const hasPermission = await checkCameraPermission();
        if (!hasPermission) {
          throw new Error('カメラ権限がありません');
        }
        
        console.log('カメラ開始処理開始');
        await html5QrCode.start(
          { facingMode: selectedCamera },
          config,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (decodedText: any) => {
            console.log('QRコード検出:', decodedText);
            // 読み取り成功時にカメラを一時停止して重複読み取りを防ぐ
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
              html5QrCodeRef.current.pause();
            }
            processQRCode(decodedText);
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (errorMessage: any) => {
            // QRコードが検出されていない場合はログを出力しない
            if (errorMessage.includes('No barcode or QR code detected') || 
                errorMessage.includes('NotFoundException')) {
              // 検出エラーは無視（継続スキャン）
              return;
            }
            
            // その他のエラーのみログ出力
            console.error('読み取りエラー:', errorMessage);
            setScanMessage(`読み取りエラー: ${errorMessage}`);
          }
        );
        
        console.log('html5QrCode.start()が正常に完了しました');
        
      } catch (startError) {
        console.error('カメラ開始エラー:', startError);
        setCameraStatus('error');
        setScanMessage('カメラの起動に失敗しました。ページを再読み込みしてください。');
        throw startError;
      }

      setCameraStatus('active');
      setScanMessage('QRコードをカメラに向けてください');
      console.log('カメラ状態をactiveに設定');
      
      // カメラの状態を確認
      setTimeout(() => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          console.log('カメラが正常に動作中です');
          setScanMessage('QRコードをカメラに向けてください');
        } else {
          console.error('カメラが動作していません');
          setScanMessage('カメラが動作していません。ページを再読み込みしてください。');
          setCameraStatus('error');
        }
      }, 2000);

      // 2重表示を防ぐための追加処理
      setTimeout(() => {
        // 重複するvideo要素を削除
        const videos = document.querySelectorAll('video');
        if (videos.length > 1) {
          // 最初のvideo要素以外を削除
          for (let i = 1; i < videos.length; i++) {
            const parentNode = videos[i].parentNode;
            if (parentNode) {
              parentNode.removeChild(videos[i]);
            }
          }
        }
        
        // フレームを非表示にするCSSを追加
        const existingStyle = document.getElementById('qr-reader-style');
        if (existingStyle) {
          existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = 'qr-reader-style';
        style.textContent = `
          #qr-reader video {
            border: none !important;
            outline: none !important;
            max-width: 100% !important;
            max-height: 80vh !important;
            height: auto !important;
            width: auto !important;
            object-fit: contain !important;
          }
          #qr-reader canvas {
            border: none !important;
            outline: none !important;
            display: none !important;
          }
          #qr-reader * {
            border: none !important;
            outline: none !important;
          }
          [id^="html5-qrcode-"] {
            border: none !important;
            outline: none !important;
          }
          @media (max-width: 768px) {
            #qr-reader video {
              max-height: 70vh !important;
            }
          }
          @media (max-width: 480px) {
            #qr-reader video {
              max-height: 60vh !important;
            }
          }
        `;
        document.head.appendChild(style);
      }, 200);

    } catch (error) {
      console.error('カメラ起動エラー:', error);
      setCameraStatus('error');
      setScanMessage('カメラの起動に失敗しました。ページを再読み込みしてください。');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stopCamera = async () => {
    cleanupCamera();
    setCameraStatus('idle');
    setScanMessage('');
  };



  const processQRCode = async (qrData: string) => {
    try {
      setScanResult('QRコードを処理中...');
      console.log('QRコードデータ受信:', qrData);

      // QRコードデータをパース
      const parsedData = JSON.parse(qrData);
      console.log('パースされたデータ:', parsedData);

      // 検証チェック
      const validationResult = validateQRCode(parsedData);
      console.log('検証結果:', validationResult);
      
      if (!validationResult.isValid) {
        setScanResult(`エラー: ${validationResult.error}`);
        setScanMessage('❌ QRコードが無効です');
        
        // 3秒後にメッセージをクリア
        setTimeout(() => {
          setScanResult('');
          setScanMessage('QRコードをカメラに向けてください');
          // カメラを再開
          if (html5QrCodeRef.current && !html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.resume();
          }
        }, 3000);
        return;
      }

      console.log('APIに送信するデータ:', parsedData);

      // 出席データをサーバーに送信
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedData),
      });

      console.log('APIレスポンスステータス:', response.status);
      console.log('APIレスポンスヘッダー:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result = await response.json();
        console.log('API成功レスポンス:', result);
        setScanResult(`出席記録完了: ${parsedData.name} (${parsedData.attendance_type})`);
        setScanMessage('✅ 出席が正常に記録されました');
        
        // 3秒後にメッセージをクリア
        setTimeout(() => {
          setScanResult('');
          setScanMessage('QRコードをカメラに向けてください');
        }, 3000);
      } else {
        const errorData = await response.json();
        console.error('APIエラーレスポンス:', errorData);
        console.error('レスポンスステータス:', response.status);
        setScanResult(`エラー: ${errorData.error || '出席記録に失敗しました'}`);
        setScanMessage('❌ 出席記録に失敗しました');
      }
    } catch (error) {
      console.error('QRコード処理エラー:', error);
      console.error('エラーの詳細:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setScanResult(`エラー: QRコードの処理に失敗しました`);
      setScanMessage('❌ QRコードの処理に失敗しました');
    }
  };

  // QRコードの検証関数
  const validateQRCode = (data: { timestamp: string; location: { address?: string } }): { isValid: boolean; error?: string } => {
    try {
      // 必須フィールドのチェック
      if (!data.timestamp || !data.location) {
        return { isValid: false, error: 'QRコードデータが不完全です' };
      }

      // 3分経過チェック
      const qrTimestamp = new Date(data.timestamp);
      const currentTime = new Date();
      const timeDiff = currentTime.getTime() - qrTimestamp.getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      if (minutesDiff > 3) {
        return { isValid: false, error: 'QRコードが3分以上経過しています。新しいQRコードを生成してください。' };
      }

      // 西宮原位置チェック
      if (data.location && data.location.address) {
        const address = data.location.address.toLowerCase();
        if (!address.includes('西宮原') && !address.includes('にしみやはら')) {
          return { isValid: false, error: '大阪市の西宮原で作成されたQRコードではありません。' };
        }
      } else {
        return { isValid: false, error: '位置情報が取得できていません。' };
      }

      return { isValid: true };
    } catch {
      return { isValid: false, error: 'QRコードデータの検証に失敗しました' };
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTypeColor = (type: AttendanceType) => {
    switch (type) {
      case '出席': return 'bg-green-100 text-green-800 border-green-200';
      case '遅刻': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '欠課': return 'bg-red-100 text-red-800 border-red-200';
      case '早退': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCameraStatusDisplay = () => {
    switch (cameraStatus) {
      case 'idle':
        return { text: 'カメラ停止中', color: 'text-gray-600', bgColor: 'bg-gray-100' };
      case 'starting':
        return { text: 'カメラ起動中...', color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case 'active':
        return { text: 'カメラ動作中', color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'error':
        return { text: 'カメラエラー', color: 'text-red-600', bgColor: 'bg-red-100' };
      default:
        return { text: '不明', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const statusDisplay = getCameraStatusDisplay();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">🏫 教室側</h1>
            <Link 
              href="/"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full text-sm font-medium transition duration-200 shadow-md"
            >
              🏠 ホーム
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 py-6 space-y-6">
        {/* カメラ制御 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">QRコード読み取り</h3>
          
          {/* カメラ状態表示 */}
          <div className="text-center mb-4">
            <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${statusDisplay.bgColor} ${statusDisplay.color}`}>
              {statusDisplay.text}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              前面カメラ（インカメラ）を使用しています
            </p>
          </div>



          {/* QRコードリーダー */}
          <div className="bg-gray-50 rounded-xl p-2">
            <div 
              id="qr-reader" 
              ref={qrReaderContainerRef}
              className="w-full max-w-2xl mx-auto"
              style={{ 
                minHeight: '60vh',
                maxHeight: '80vh',
                height: 'auto',
                position: 'relative'
              }}
            ></div>
          </div>

          {/* スキャンメッセージ */}
          {scanMessage && (
            <div className="mt-4 text-center">
              <p className="text-lg font-medium text-gray-700">{scanMessage}</p>
            </div>
          )}

          {/* スキャン結果 */}
          {scanResult && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">読み取り結果:</h4>
              <p className="text-blue-800">{scanResult}</p>
            </div>
          )}

          {/* デバッグ情報 */}
          {/* <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">デバッグ情報:</h4>
            <p className="text-gray-700 text-sm">{debugInfo}</p>
          </div> */}
        </div>


      </main>
    </div>
  );
} 
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Html5Qrcode, Html5QrcodeScanType } from 'html5-qrcode';

type AttendanceType = '出席' | '遅刻' | '欠課' | '早退';
type CameraStatus = 'idle' | 'starting' | 'active' | 'error';

export default function ClassroomPage() {
  const [scanResult, setScanResult] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  // 前面カメラ（インカメラ）のみ使用
  const selectedCamera: 'user' = 'user';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // カメラ管理用のref
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrReaderContainerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // 初期化
  useEffect(() => {
    let isInitializing = false;
    let initTimeout: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 3;
    
    const initializeCamera = async () => {
      if (isInitializing) return;
      isInitializing = true;
      
      await checkCameraPermission();
      
      // コンテナの準備を確認してカメラを自動起動
      const checkAndStartCamera = () => {
        if (qrReaderContainerRef.current) {
          setDebugInfo('カメラコンテナが準備されました');
          // 少し遅延してからカメラを起動
          initTimeout = setTimeout(() => {
            startCamera();
          }, 500);
        } else {
          retryCount++;
          if (retryCount <= maxRetries) {
            setDebugInfo(`カメラコンテナがまだ準備されていません (試行 ${retryCount}/${maxRetries})`);
            // 再試行
            initTimeout = setTimeout(checkAndStartCamera, 1000);
          } else {
            setDebugInfo('カメラコンテナの準備に失敗しました');
          }
        }
      };
      
      checkAndStartCamera();
    };
    
    initializeCamera();
    
    return () => {
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      cleanupCamera().catch(console.error);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // カメラのクリーンアップ
  const cleanupCamera = useCallback(async () => {
    setDebugInfo('カメラクリーンアップを実行中...');
    
    // html5QrCodeの停止
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setDebugInfo('html5QrCodeを停止しました');
      } catch (error) {
        setDebugInfo(`html5QrCode停止エラー: ${error}`);
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
      setDebugInfo('メディアストリームを停止しました');
    } catch (streamError) {
      setDebugInfo(`メディアストリーム停止エラー: ${streamError}`);
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
      setDebugInfo('すべてのvideo要素を削除しました');
    } catch (error) {
      setDebugInfo(`video要素削除エラー: ${error}`);
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
      setDebugInfo('すべてのcanvas要素を削除しました');
    } catch (error) {
      setDebugInfo(`canvas要素削除エラー: ${error}`);
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
      setDebugInfo('Html5Qrcode関連要素を削除しました');
    } catch (error) {
      setDebugInfo(`Html5Qrcode要素削除エラー: ${error}`);
    }
    
    // インスタンスをクリア
    html5QrCodeRef.current = null;
    isInitializedRef.current = false;
    setDebugInfo('カメラクリーンアップ完了');
  }, []);

  const checkCameraPermission = async (): Promise<boolean> => {
    setDebugInfo('カメラ権限状態を確認中...');
    try {
      // まず、Permissions APIで権限状態を確認
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setDebugInfo(`Permissions API - カメラ権限状態: ${permission.state}`);
        
        if (permission.state === 'denied') {
          setCameraPermission(false);
          setDebugInfo('カメラ権限が拒否されています');
          return false;
        } else if (permission.state === 'granted') {
          setCameraPermission(true);
          setDebugInfo('カメラ権限が許可されています');
          return true;
        }
      }
      
      // Permissions APIが利用できない場合や状態が不明な場合は、実際にカメラアクセスを試行
      setDebugInfo('実際のカメラアクセスを試行中...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setDebugInfo('カメラアクセスが成功しました');
        
        // ストリームを即座に停止
        stream.getTracks().forEach(track => {
          track.stop();
        });
        
        setCameraPermission(true);
        setDebugInfo('カメラ権限が確認されました');
        return true;
      } catch (mediaError) {
        setDebugInfo(`カメラアクセスエラー: ${mediaError}`);
        
        if (mediaError instanceof Error) {
          if (mediaError.name === 'NotAllowedError' || mediaError.name === 'PermissionDeniedError') {
            setCameraPermission(false);
            setDebugInfo('カメラ権限が拒否されました');
            return false;
          } else if (mediaError.name === 'NotFoundError' || mediaError.name === 'DevicesNotFoundError') {
            setDebugInfo('カメラデバイスが見つかりません');
            return false;
          } else if (mediaError.name === 'NotSupportedError' || mediaError.name === 'ConstraintNotSatisfiedError') {
            setDebugInfo('カメラ機能がサポートされていません');
            return false;
          }
        }
        
        setCameraPermission(null);
        setDebugInfo('カメラ権限状態が不明です');
        return false;
      }
    } catch (error) {
      setDebugInfo(`カメラ権限確認エラー: ${error}`);
      setCameraPermission(null);
      return false;
    }
  };

  const startCamera = async () => {
    if (cameraStatus === 'active' || cameraStatus === 'starting') {
      setDebugInfo('カメラは既に起動中です');
      return;
    }

    setCameraStatus('starting');
    setDebugInfo('カメラを起動中...');

    try {
      // 既存のインスタンスをクリーンアップ
      await cleanupCamera();

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
        setDebugInfo('コンテナを完全にクリアしました');
      }
      
      setDebugInfo('完全なクリーンアップを実行しました');

      // より長く待機してから新しいインスタンスを作成
      await new Promise(resolve => setTimeout(resolve, 500));

      // 新しいインスタンスを作成
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;
      isInitializedRef.current = true;

      setDebugInfo('Html5Qrcodeインスタンスを作成しました');

      // カメラ設定
      const config = {
        fps: 10,
        qrbox: { width: 300, height: 300 }, // QRコード検出エリアを拡大
        aspectRatio: 1.0,
        disableFlip: false,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
      };

      setDebugInfo('カメラを開始中...');

      // カメラを開始（選択されたカメラを使用）
      await html5QrCode.start(
        { facingMode: selectedCamera },
        config,
        (decodedText) => {
          setDebugInfo(`QRコード検出: ${decodedText}`);
          console.log('QRコード検出:', decodedText);
          processQRCode(decodedText);
        },
        (errorMessage) => {
          console.log('QRコード読み取りエラー:', errorMessage);
          setDebugInfo(`読み取りエラー: ${errorMessage}`);
          // エラーは無視（継続スキャン）
        }
      );

      setCameraStatus('active');
      setDebugInfo('カメラが正常に起動しました');
      setScanMessage('QRコードをカメラに向けてください');
      
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
          setDebugInfo('重複するvideo要素を削除しました');
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
        setDebugInfo('CSSスタイルを適用しました');
      }, 200);

    } catch (error) {
      console.error('カメラ起動エラー:', error);
      setCameraStatus('error');
      setDebugInfo(`カメラ起動エラー: ${error}`);
      setScanMessage('カメラの起動に失敗しました');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stopCamera = async () => {
    setDebugInfo('カメラを停止中...');
    cleanupCamera();
    setCameraStatus('idle');
    setScanMessage('');
  };



  const processQRCode = async (qrData: string) => {
    try {
      setScanResult('QRコードを処理中...');
      setDebugInfo(`QRコード処理開始: ${qrData}`);

      // QRコードデータをパース
      const parsedData = JSON.parse(qrData);
      setDebugInfo(`パースされたデータ: ${JSON.stringify(parsedData)}`);

      // 検証チェック
      const validationResult = validateQRCode(parsedData);
      if (!validationResult.isValid) {
        setScanResult(`エラー: ${validationResult.error}`);
        setScanMessage('❌ QRコードが無効です');
        setDebugInfo(`QRコード検証エラー: ${validationResult.error}`);
        
        // 3秒後にメッセージをクリア
        setTimeout(() => {
          setScanResult('');
          setScanMessage('QRコードをカメラに向けてください');
        }, 3000);
        return;
      }

      // 出席データをサーバーに送信
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedData),
      });

      if (response.ok) {
        const result = await response.json();
        setScanResult(`出席記録完了: ${parsedData.name} (${parsedData.attendance_type})`);
        setScanMessage('✅ 出席が正常に記録されました');
        setDebugInfo(`出席記録成功: ${JSON.stringify(result)}`);
        
        // 3秒後にメッセージをクリア
        setTimeout(() => {
          setScanResult('');
          setScanMessage('QRコードをカメラに向けてください');
        }, 3000);
      } else {
        const errorData = await response.json();
        setScanResult(`エラー: ${errorData.error || '出席記録に失敗しました'}`);
        setScanMessage('❌ 出席記録に失敗しました');
        setDebugInfo(`出席記録エラー: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('QRコード処理エラー:', error);
      setScanResult(`エラー: QRコードの処理に失敗しました`);
      setScanMessage('❌ QRコードの処理に失敗しました');
      setDebugInfo(`QRコード処理エラー: ${error}`);
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
            
            {/* テスト用QRコード生成ボタン */}
            <div className="mt-3 space-y-2">
              <button
                onClick={() => {
                  const testData = {
                    name: "テスト太郎",
                    attendance_type: "出席",
                    timestamp: new Date().toISOString(),
                    location: {
                      latitude: 34.7025,
                      longitude: 135.4959,
                      address: "大阪市北区西宮原1丁目"
                    }
                  };
                  const testQRData = JSON.stringify(testData);
                  console.log('テストQRコードデータ:', testQRData);
                  alert(`テストQRコードデータ:\n${testQRData}`);
                }}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs font-medium transition duration-200 mr-2"
              >
                🧪 テストデータ表示
              </button>
              
              <button
                onClick={() => {
                  const testData = {
                    name: "テスト太郎",
                    attendance_type: "出席",
                    timestamp: new Date().toISOString(),
                    location: {
                      latitude: 34.7025,
                      longitude: 135.4959,
                      address: "大阪市北区西宮原1丁目"
                    }
                  };
                  const testQRData = JSON.stringify(testData);
                  processQRCode(testQRData);
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition duration-200"
              >
                ✅ テスト実行
              </button>
            </div>
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
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">デバッグ情報:</h4>
            <p className="text-gray-700 text-sm">{debugInfo}</p>
          </div>
        </div>


      </main>
    </div>
  );
} 
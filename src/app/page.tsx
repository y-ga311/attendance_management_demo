import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">出席管理システム</h1>
          <p className="text-gray-600 mb-8">デモ用アプリケーション</p>
          
          <div className="space-y-4">
            <Link 
              href="/student"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 text-lg"
            >
              学生側
            </Link>
            
            <Link 
              href="/teacher"
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 text-lg"
            >
              教員側
            </Link>
            
            <Link 
              href="/classroom"
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 text-lg"
            >
              教室側
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

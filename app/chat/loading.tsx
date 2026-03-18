export default function ChatLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950 flex items-center justify-center">
      <div className="text-center animate-pulse">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rose-200 to-purple-200 dark:from-rose-800 dark:to-purple-800" />
        <div className="h-5 w-40 mx-auto bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  )
}

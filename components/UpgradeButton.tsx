'use client'

import { useState } from 'react'

export function UpgradeButton({ weddingId }: { weddingId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('Could not connect. Please check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="inline-flex items-center gap-2 px-8 py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-full text-base font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors disabled:opacity-50"
      >
        {loading ? 'Redirecting...' : 'Unlock outreach — $49'}
      </button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

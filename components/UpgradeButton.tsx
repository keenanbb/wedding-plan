'use client'

import { useState } from 'react'

export function UpgradeButton({ weddingId }: { weddingId: string }) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="inline-flex items-center gap-2 px-8 py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-full text-base font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors disabled:opacity-50"
    >
      {loading ? 'Redirecting...' : 'Unlock outreach — $49'}
    </button>
  )
}

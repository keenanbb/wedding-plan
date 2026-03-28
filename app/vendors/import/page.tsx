'use client'

import Link from 'next/link'
import { useState } from 'react'

const VALID_CATEGORIES = ['VENUE', 'PHOTOGRAPHER', 'CATERING', 'FLORIST', 'ENTERTAINMENT', 'MARQUEE', 'OTHER']

interface ManualVendor {
  name: string
  email: string
  category: string
  location: string
}

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

const defaultManualVendor: ManualVendor = {
  name: '',
  email: '',
  category: '',
  location: '',
}

export default function VendorImportPage() {
  const [mode, setMode] = useState<'manual' | 'csv'>('manual')
  const [manualVendor, setManualVendor] = useState<ManualVendor>({ ...defaultManualVendor })
  const [csvText, setCsvText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    setResult(null)

    try {
      // Fetch wedding ID
      const weddingRes = await fetch('/api/wedding')
      if (!weddingRes.ok) {
        setError('Could not load your wedding details. Please try again.')
        return
      }
      const weddingData = await weddingRes.json()
      const weddingId = weddingData?.wedding?.id

      if (!weddingId) {
        setError('No wedding found. Please complete your profile first.')
        return
      }

      // Build vendor list
      let vendors: Array<{ name: string; email: string; category: string; location?: string }>

      if (mode === 'manual') {
        if (!manualVendor.name.trim() || !manualVendor.email.trim() || !manualVendor.category) {
          setError('Please fill in all required fields (name, email, category).')
          return
        }
        vendors = [
          {
            name: manualVendor.name.trim(),
            email: manualVendor.email.trim(),
            category: manualVendor.category,
            location: manualVendor.location.trim() || undefined,
          },
        ]
      } else {
        // Parse CSV
        const lines = csvText
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0)

        if (lines.length === 0) {
          setError('Please paste some CSV data.')
          return
        }

        // Skip header if first line contains "name" or "email" keywords
        const firstLineLower = lines[0].toLowerCase()
        const startIndex =
          firstLineLower.includes('name') && firstLineLower.includes('email') ? 1 : 0

        vendors = lines.slice(startIndex).map(line => {
          const parts = line.split(',').map(p => p.trim())
          return {
            name: parts[0] || '',
            email: parts[1] || '',
            category: (parts[2] || '').toUpperCase(),
            location: parts[3] || undefined,
          }
        })

        if (vendors.length === 0) {
          setError('No vendor rows found in CSV data.')
          return
        }

        if (vendors.length > 50) {
          setError('Maximum 50 vendors per import. Please split your CSV into smaller batches.')
          return
        }
      }

      const res = await fetch('/api/vendors/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId, vendors }),
      })

      if (res.status === 402) {
        setError('Payment required. Please upgrade your plan to import vendors.')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Import failed. Please try again.')
        return
      }

      const data: ImportResult = await res.json()
      setResult(data)

      // Reset form on success
      if (mode === 'manual') {
        setManualVendor({ ...defaultManualVendor })
      } else {
        setCsvText('')
      }
    } catch (err) {
      console.error('Import error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-50 dark:bg-gray-950">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-stone-200/15 to-stone-100/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-stone-200/15 to-stone-100/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0_0_0/0.02)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.03)_1px,transparent_0)] bg-[size:32px_32px]" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-6">
          <Link
            href="/vendors"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-md dark:hover:shadow-gray-900/30 transition-all duration-300 group"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-light text-sm">Back to Vendors</span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-start justify-center px-6 py-8">
          <div className="max-w-2xl w-full space-y-8">
            {/* Page heading */}
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-300" />
                <span className="text-sm font-medium tracking-wide text-amber-800 dark:text-amber-400 uppercase">
                  Import
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-light text-gray-900 dark:text-white leading-tight">
                Add Vendors
              </h1>
              <p className="text-gray-500 dark:text-gray-400 font-light">
                Add a vendor manually or paste a CSV list to import multiple at once.
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 animate-fadeIn">
              <button
                onClick={() => { setMode('manual'); setResult(null); setError(null) }}
                className={`flex-1 px-5 py-3 rounded-xl border-2 font-medium transition-all duration-300 ${
                  mode === 'manual'
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100'
                    : 'bg-white dark:bg-stone-900 text-gray-700 dark:text-gray-200 border-stone-200 dark:border-stone-700 hover:border-amber-300 dark:hover:border-amber-700'
                }`}
              >
                Add manually
              </button>
              <button
                onClick={() => { setMode('csv'); setResult(null); setError(null) }}
                className={`flex-1 px-5 py-3 rounded-xl border-2 font-medium transition-all duration-300 ${
                  mode === 'csv'
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100'
                    : 'bg-white dark:bg-stone-900 text-gray-700 dark:text-gray-200 border-stone-200 dark:border-stone-700 hover:border-amber-300 dark:hover:border-amber-700'
                }`}
              >
                Paste CSV
              </button>
            </div>

            {/* Form card */}
            <div className="bg-white dark:bg-stone-900 rounded-xl p-8 shadow-2xl dark:shadow-gray-900/30 border border-stone-200 dark:border-stone-800 animate-fadeIn">
              {mode === 'manual' ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Vendor name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualVendor.name}
                      onChange={e => setManualVendor(v => ({ ...v, name: e.target.value }))}
                      placeholder="e.g. The Garden House"
                      className="w-full px-4 py-3 bg-stone-50 dark:bg-gray-800 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={manualVendor.email}
                      onChange={e => setManualVendor(v => ({ ...v, email: e.target.value }))}
                      placeholder="contact@vendor.com.au"
                      className="w-full px-4 py-3 bg-stone-50 dark:bg-gray-800 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={manualVendor.category}
                      onChange={e => setManualVendor(v => ({ ...v, category: e.target.value }))}
                      className="w-full px-4 py-3 bg-stone-50 dark:bg-gray-800 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-white appearance-none"
                    >
                      <option value="">Select a category</option>
                      {VALID_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0) + cat.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Location <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={manualVendor.location}
                      onChange={e => setManualVendor(v => ({ ...v, location: e.target.value }))}
                      placeholder="e.g. Sydney, Hunter Valley"
                      className="w-full px-4 py-3 bg-stone-50 dark:bg-gray-800 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Paste CSV data
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      One vendor per line. Format:{' '}
                      <code className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-amber-800 dark:text-amber-400">
                        name,email,category,location
                      </code>
                      . Header row is optional. Max 50 vendors.
                    </p>
                    <textarea
                      value={csvText}
                      onChange={e => setCsvText(e.target.value)}
                      rows={10}
                      placeholder={`name,email,category,location
The Garden House,hello@gardenhouse.com.au,VENUE,Hunter Valley
Bloom & Co,contact@bloomco.com,FLORIST,Sydney
Shutter Story,info@shutterstory.com.au,PHOTOGRAPHER,Newcastle`}
                      className="w-full px-4 py-3 bg-stone-50 dark:bg-gray-800 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900 dark:text-white font-mono text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-y"
                    />
                  </div>

                  <div className="p-4 bg-gradient-to-br from-amber-50 to-stone-100 dark:from-amber-950/20 dark:to-stone-900/20 border border-amber-200 dark:border-amber-900 rounded-xl">
                    <p className="text-xs text-amber-800 dark:text-amber-400 font-medium mb-1">Valid categories</p>
                    <p className="text-xs text-amber-700 dark:text-amber-500">
                      {VALID_CATEGORIES.join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="mt-6 p-5 bg-gradient-to-br from-green-50 to-stone-50 dark:from-green-950/20 dark:to-stone-900/20 border border-green-200 dark:border-green-900 rounded-xl space-y-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-400">Import complete</p>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-2xl font-serif font-light text-gray-900 dark:text-white">{result.imported}</span>
                      <span className="ml-1.5 text-gray-500 dark:text-gray-400">imported</span>
                    </div>
                    <div>
                      <span className="text-2xl font-serif font-light text-gray-900 dark:text-white">{result.skipped}</span>
                      <span className="ml-1.5 text-gray-500 dark:text-gray-400">already saved</span>
                    </div>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="pt-3 border-t border-green-200 dark:border-green-900">
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">
                        {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} could not be imported:
                      </p>
                      <ul className="space-y-1">
                        {result.errors.map((e, i) => (
                          <li key={i} className="text-xs text-red-500 dark:text-red-400">
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <div className="mt-8">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full px-6 py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-medium hover:shadow-lg dark:hover:shadow-gray-900/30 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </span>
                  ) : mode === 'manual' ? (
                    'Add vendor'
                  ) : (
                    'Import vendors'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

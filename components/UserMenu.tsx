'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface UserMenuProps {
  user: {
    name?: string | null
    email: string
  }
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth/login')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full bg-stone-900 dark:bg-stone-200 flex items-center justify-center text-white dark:text-stone-900 text-xs font-medium hover:bg-stone-700 dark:hover:bg-white transition-colors"
        aria-label="Account menu"
        aria-expanded={isOpen}
      >
        {initials}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-stone-900 rounded-lg shadow-lg border border-stone-200 dark:border-stone-800 overflow-hidden z-20 animate-fadeIn">
            {/* User info */}
            <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
              <div className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                {user.name || 'Account'}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                {user.email}
              </div>
            </div>

            {/* Sign out */}
            <div className="p-1.5">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-md transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

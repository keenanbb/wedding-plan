import Link from 'next/link'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

import MobileNav from './MobileNav'
import ThemeToggle from './ThemeToggle'
import UserMenu from './UserMenu'

export default async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let dbUser = null
  if (user) {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/60 dark:border-stone-800/60 bg-stone-50/90 dark:bg-gray-950/90 backdrop-blur-lg transition-colors">
      <div className="max-w-5xl mx-auto px-6 py-3.5">
        <div className="flex items-center justify-between">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Bower home">
            <span className="font-display text-xl text-stone-900 dark:text-stone-100 group-hover:text-amber-800 dark:group-hover:text-amber-400 transition-colors duration-200">
              Bower
            </span>
          </Link>

          {/* Navigation & Auth */}
          <div className="flex items-center gap-1">
            {user && dbUser ? (
              <>
                {/* Quick Nav Links */}
                <nav className="hidden md:flex items-center gap-0.5">
                  <Link
                    href="/dashboard"
                    className="px-3.5 py-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors duration-200"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/vendors"
                    className="px-3.5 py-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors duration-200"
                  >
                    Vendors
                  </Link>
                </nav>

                {/* Mobile Nav */}
                <MobileNav />

                <div className="hidden md:block w-px h-5 bg-stone-200 dark:bg-stone-800 mx-2" />

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* User Menu */}
                <UserMenu
                  user={{
                    name: dbUser.name,
                    email: dbUser.email,
                  }}
                />
              </>
            ) : (
              <>
                {/* Theme Toggle */}
                <ThemeToggle />

                <div className="w-px h-5 bg-stone-200 dark:bg-stone-800 mx-2" />

                {/* Not logged in */}
                <Link
                  href="/auth/login"
                  className="px-3.5 py-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors duration-200"
                >
                  Sign in
                </Link>
                <Link
                  href="/dashboard"
                  className="px-5 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium rounded-full hover:bg-stone-800 dark:hover:bg-white transition-colors duration-200"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

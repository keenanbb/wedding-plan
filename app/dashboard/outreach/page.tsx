import { VendorCategory } from '@prisma/client'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import Header from '@/components/Header'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export default async function OutreachTrackingPage() {
  // Check authentication
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/dashboard/outreach')
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: {
      weddings: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!dbUser || dbUser.weddings.length === 0) {
    redirect('/chat')
  }

  const wedding = dbUser.weddings[0]

  // Get all outreach
  const outreach = await prisma.vendorOutreach.findMany({
    where: { weddingId: wedding.id },
    include: { vendor: true },
    orderBy: { createdAt: 'desc' },
  })

  const getStatusBadge = (o: (typeof outreach)[0]) => {
    if (o.bounced) return { label: 'Bounced', color: 'red' as const, icon: '✕' }
    if (o.replied) return { label: 'Responded', color: 'green' as const, icon: '✓' }
    if (o.opened) return { label: 'Opened', color: 'blue' as const, icon: '◉' }
    if (o.delivered) return { label: 'Delivered', color: 'purple' as const, icon: '→' }
    if (o.sentAt) return { label: 'Sent', color: 'gray' as const, icon: '↑' }
    return { label: 'Pending', color: 'yellow' as const, icon: '○' }
  }

  const getCategoryIcon = (category: VendorCategory) => {
    switch (category) {
      case 'VENUE':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        )
      case 'PHOTOGRAPHER':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        )
      case 'CATERING':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )
    }
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950">
      <Header />
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-rose-200/30 to-pink-200/20 dark:from-rose-900/20 dark:to-pink-900/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-200/30 to-pink-200/20 dark:from-purple-900/20 dark:to-pink-900/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0_0_0/0.03)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.03)_1px,transparent_0)] bg-[size:32px_32px]" />
      </div>

      <div className="relative">
        {/* Header */}
        <div className="border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-rose-500 transition-colors duration-300 group mb-6"
            >
              <svg
                className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span className="text-sm font-light tracking-wide">Back to Dashboard</span>
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-rose-300" />
              <svg className="w-5 h-5 text-rose-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-purple-300" />
            </div>

            <h1 className="text-5xl font-serif font-light tracking-tight mb-4">
              <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Vendor Outreach
              </span>
            </h1>

            <p className="text-gray-600 dark:text-gray-300 font-light">
              Track all your vendor communications in one place
            </p>
          </div>
        </div>

        {/* Outreach Table */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          {outreach.length > 0 ? (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-lg dark:shadow-gray-900/30 border border-white/50 dark:border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100/50 dark:border-gray-700/50">
                      <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Vendor
                      </th>
                      <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Category
                      </th>
                      <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="hidden md:table-cell px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Sent Date
                      </th>
                      <th className="hidden lg:table-cell px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Response
                      </th>
                      <th className="px-3 sm:px-6 py-4 text-right text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50 dark:divide-gray-700/50">
                    {outreach.map((o, idx) => {
                      const status = getStatusBadge(o)
                      const colorClasses = {
                        red: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
                        green: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
                        blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
                        purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
                        gray: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600',
                        yellow: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
                      }

                      return (
                        <tr
                          key={o.id}
                          className="hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-colors animate-fadeIn"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <td className="px-3 sm:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/40 dark:to-pink-900/40 flex items-center justify-center flex-shrink-0 text-rose-600 dark:text-rose-400">
                                {getCategoryIcon(o.vendor.category)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {o.vendor.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-light truncate">
                                  {o.vendor.location}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4">
                            <span className="text-sm text-gray-700 dark:text-gray-200 font-light">
                              {o.vendor.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs sm:text-sm font-medium border ${colorClasses[status.color]}`}
                            >
                              <span aria-hidden="true" className="mr-1">{status.icon}</span>
                              {status.label}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-3 sm:px-6 py-4">
                            <span className="text-sm text-gray-700 dark:text-gray-200 font-light">
                              {o.sentAt
                                ? new Date(o.sentAt).toLocaleDateString('en-AU', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '-'}
                            </span>
                          </td>
                          <td className="hidden lg:table-cell px-3 sm:px-6 py-4">
                            {o.repliedAt ? (
                              <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                                {new Date(o.repliedAt).toLocaleDateString('en-AU', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500 font-light">-</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-right">
                            <Link
                              href={`/dashboard/vendor/${o.vendorId}`}
                              className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
                            >
                              <span className="hidden sm:inline">View Details</span>
                              <span className="sm:hidden">View</span>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/40 dark:to-pink-900/40 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-rose-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-medium text-gray-900 dark:text-white mb-3">
                No outreach yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 font-light mb-8">
                Start by browsing vendors and sending your first inquiry
              </p>
              <Link href="/vendors" className="group relative inline-block">
                <div className="absolute -inset-1 bg-gradient-to-r from-rose-400 to-purple-400 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                <div className="relative px-8 py-4 bg-gradient-to-r from-rose-400 via-pink-400 to-purple-400 text-white rounded-xl font-medium hover:shadow-lg dark:hover:shadow-gray-900/30 hover:scale-105 transition-all duration-300 flex items-center gap-2">
                  <span>Browse Vendors</span>
                  <svg
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

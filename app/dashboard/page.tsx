import Link from 'next/link'
import { redirect } from 'next/navigation'

import Header from '@/components/Header'
import WeddingSummaryCard from '@/components/WeddingSummaryCard'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage(props: { searchParams: Promise<{ payment?: string }> }) {
  const searchParams = await props.searchParams
  const paymentSuccess = searchParams?.payment === 'success'

  // Check authentication
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/dashboard')
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: {
      weddings: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          _count: {
            select: {
              vendorOutreach: true,
            },
          },
        },
      },
    },
  })

  // If user not in database, create them directly
  if (!dbUser) {
    const newUser = await prisma.user.create({
      data: {
        authId: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name || null,
      },
    })
    // Reload with the new user
    redirect('/dashboard')
  }

  // Check if user has wedding data
  const hasWedding = dbUser.weddings.length > 0
  const wedding = hasWedding ? dbUser.weddings[0] : null

  // Get outreach statistics (only if wedding exists)
  const outreach = wedding
    ? await prisma.vendorOutreach.findMany({
        where: { weddingId: wedding.id },
        include: { vendor: true },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const stats = {
    totalContacted: outreach.length,
    delivered: outreach.filter(o => o.delivered).length,
    opened: outreach.filter(o => o.opened).length,
    responded: outreach.filter(o => o.replied).length,
    pending: outreach.filter(o => !o.replied && !o.bounced).length,
  }

  // Recent activity
  const recentOutreach = outreach.slice(0, 5)

  return (
    <main className="relative min-h-screen bg-stone-50 dark:bg-gray-950">
      {/* Header */}
      <Header />

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-stone-200/20 to-stone-100/10 dark:from-stone-800/20 dark:to-stone-900/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-stone-200/20 to-stone-100/10 dark:from-stone-800/20 dark:to-stone-900/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0_0_0/0.03)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.03)_1px,transparent_0)] bg-[size:32px_32px]" />
      </div>

      <div className="relative">
        {paymentSuccess && (
          <div className="max-w-7xl mx-auto px-6 pt-6">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <p className="text-sm text-green-700 dark:text-green-400">
                Payment confirmed! You can now generate and send vendor emails.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-stone-900 dark:bg-stone-100 flex items-center justify-center shadow-lg dark:shadow-gray-900/30">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-serif font-light tracking-tight">
                    <span className="bg-stone-900 dark:bg-stone-100 bg-clip-text text-transparent">
                      Wedding Dashboard
                    </span>
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-light mt-1">
                    Welcome back, {dbUser.name || 'there'}!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/vendors"
                  className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-purple-700 dark:hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/30 rounded-lg transition-colors"
                >
                  Browse Vendors
                </Link>
                <Link
                  href="/questionnaire"
                  className="px-4 py-2 text-sm font-medium text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition-colors"
                >
                  Wedding Questionnaire
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Empty State - No Wedding Data */}
          {!hasWedding && (
            <div className="flex items-center justify-center min-h-[70vh] animate-fadeIn">
              <div className="max-w-2xl w-full text-center space-y-8">
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-stone-900 dark:bg-stone-100 rounded-full blur-2xl opacity-20" />
                    <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-amber-100 to-stone-100 dark:from-amber-950/20 dark:to-stone-800/20 flex items-center justify-center">
                      <svg
                        className="w-16 h-16 text-amber-700"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <h2 className="text-4xl font-serif font-light text-gray-900 dark:text-white">
                    Welcome to Your{' '}
                    <span className="bg-stone-900 dark:bg-stone-100 bg-clip-text text-transparent">
                      Wedding Dashboard
                    </span>
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-300 font-light max-w-xl mx-auto leading-relaxed">
                    We need a few details about your special day to find the perfect vendors and
                    create your personalized wedding plan.
                  </p>
                </div>

                {/* CTA */}
                <div className="pt-4">
                  <Link href="/questionnaire" className="group relative inline-block">
                    <div className="absolute -inset-1 bg-stone-900 dark:bg-stone-100 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                    <div className="relative px-8 py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-2xl font-medium hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-3">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="text-lg">Complete Wedding Details</span>
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

                {/* Helper Text */}
                <div className="pt-8 space-y-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-light">Takes about 2 minutes</p>
                  <div className="flex items-center justify-center gap-6 text-xs text-gray-400 dark:text-gray-500">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Save anytime</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Edit later</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing Dashboard Content - Only show if wedding exists */}
          {hasWedding && wedding && (
            <>
              {/* Wedding Summary Card */}
              <WeddingSummaryCard
                wedding={{
                  weddingDate: wedding.weddingDate ? wedding.weddingDate.toISOString() : null,
                  dateFlexible: wedding.dateFlexible,
                  preferredDates: wedding.preferredDates as Array<{ start: string; end: string }> | null,
                  location: wedding.location,
                  guestCount: wedding.guestCount,
                  budgetTotal: wedding.budgetTotal ?? 0,
                  style: wedding.style,
                }}
              />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div
              className="bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 shadow-lg dark:shadow-gray-900/30 border border-stone-200 dark:border-stone-800 animate-fadeIn"
              style={{ animationDelay: '100ms' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-950/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-amber-800 dark:text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-serif font-light text-gray-900 dark:text-white mb-1">
                {stats.totalContacted}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-light">Vendors Contacted</div>
            </div>

            <div
              className="bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 shadow-lg dark:shadow-gray-900/30 border border-stone-200 dark:border-stone-800 animate-fadeIn"
              style={{ animationDelay: '200ms' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-serif font-light text-gray-900 dark:text-white mb-1">
                {stats.responded}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-light">Responses Received</div>
            </div>

            <div
              className="bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 shadow-lg dark:shadow-gray-900/30 border border-stone-200 dark:border-stone-800 animate-fadeIn"
              style={{ animationDelay: '300ms' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-serif font-light text-gray-900 dark:text-white mb-1">
                {stats.opened}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-light">Emails Opened</div>
            </div>

            <div
              className="bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 shadow-lg dark:shadow-gray-900/30 border border-stone-200 dark:border-stone-800 animate-fadeIn"
              style={{ animationDelay: '400ms' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-stone-100 to-amber-100 dark:from-stone-800/20 dark:to-amber-950/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-stone-700 dark:text-stone-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-serif font-light text-gray-900 dark:text-white mb-1">
                {stats.pending}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 font-light">Pending Responses</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Link
              href="/dashboard/outreach"
              className="group bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 shadow-lg dark:shadow-gray-900/30 border border-stone-200 dark:border-stone-800 hover:shadow-2xl dark:hover:shadow-gray-900/40 hover:border-amber-200 dark:hover:border-amber-900 transition-all duration-300 animate-fadeIn"
              style={{ animationDelay: '500ms' }}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-950/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-7 h-7 text-amber-800 dark:text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-serif font-medium text-gray-900 dark:text-white mb-1">
                    View All Outreach
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-light">
                    Track all vendor communications
                  </p>
                </div>
                <svg
                  className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-amber-800 dark:group-hover:text-amber-700 group-hover:translate-x-1 transition-all"
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
              </div>
            </Link>

            <Link
              href="/dashboard/responses"
              className="group bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 shadow-lg dark:shadow-gray-900/30 border border-stone-200 dark:border-stone-800 hover:shadow-2xl dark:hover:shadow-gray-900/40 hover:border-stone-200 dark:hover:border-purple-700 transition-all duration-300 animate-fadeIn"
              style={{ animationDelay: '600ms' }}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800/20 dark:to-indigo-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-7 h-7 text-stone-700 dark:text-stone-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-serif font-medium text-gray-900 dark:text-white mb-1">
                    Vendor Responses
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-light">Review quotes and replies</p>
                </div>
                <svg
                  className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-stone-700 dark:group-hover:text-stone-500 group-hover:translate-x-1 transition-all"
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
              </div>
            </Link>
          </div>

          {/* Recent Activity */}
          {recentOutreach.length > 0 && (
            <div
              className="bg-white dark:bg-stone-900 rounded-xl p-6 sm:p-8 shadow-lg dark:shadow-gray-900/30 border border-stone-200 dark:border-stone-800 animate-fadeIn"
              style={{ animationDelay: '700ms' }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-300" />
                  <h2 className="text-2xl font-serif font-medium text-gray-900 dark:text-white">Recent Activity</h2>
                </div>
                <Link
                  href="/dashboard/outreach"
                  className="text-sm text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 font-medium hover:underline transition-colors"
                >
                  View All
                </Link>
              </div>

              <div className="space-y-4">
                {recentOutreach.map((outreach, idx) => (
                  <Link
                    key={outreach.id}
                    href={`/dashboard/vendor/${outreach.vendorId}`}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-amber-50/50 dark:hover:bg-amber-950/15 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-gray-600 dark:text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {outreach.vendor.name}
                        </h4>
                        <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 rounded-lg text-xs font-medium flex-shrink-0">
                          {outreach.vendor.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-light">
                        {outreach.replied
                          ? '✓ Responded'
                          : outreach.opened
                            ? 'Opened'
                            : outreach.delivered
                              ? 'Delivered'
                              : 'Sent'}{' '}
                        •{' '}
                        {new Date(outreach.sentAt || outreach.createdAt).toLocaleDateString(
                          'en-AU',
                          {
                            day: 'numeric',
                            month: 'short',
                          }
                        )}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-amber-800 dark:group-hover:text-amber-700 group-hover:translate-x-1 transition-all flex-shrink-0"
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
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {stats.totalContacted === 0 && (
            <div className="text-center py-16 animate-fadeIn">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-950/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-amber-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-medium text-gray-900 dark:text-white mb-3">
                Ready to Start?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 font-light mb-8 max-w-md mx-auto">
                Browse our curated vendor matches and send personalized inquiries with just a few
                clicks.
              </p>
              <Link href="/vendors" className="group relative inline-block">
                <div className="absolute -inset-1 bg-stone-900 dark:bg-stone-100 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                <div className="relative px-8 py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center gap-2">
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
            </>
          )}
        </div>
      </div>
    </main>
  )
}

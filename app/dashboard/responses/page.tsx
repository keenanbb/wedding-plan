import Link from 'next/link'
import { redirect } from 'next/navigation'

import Header from '@/components/Header'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export default async function ResponsesPage() {
  // Check authentication
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/dashboard/responses')
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
    redirect('/questionnaire')
  }

  const wedding = dbUser.weddings[0]

  // Get all responses
  const responses = await prisma.vendorOutreach.findMany({
    where: {
      weddingId: wedding.id,
      replied: true,
    },
    include: { vendor: true },
    orderBy: { repliedAt: 'desc' },
  })

  return (
    <main className="relative min-h-screen bg-stone-50 dark:bg-gray-950">
      <Header />
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-stone-200/20 to-stone-100/10 dark:from-stone-800/20 dark:to-stone-900/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-stone-200/20 to-stone-100/10 dark:from-stone-800/20 dark:to-stone-900/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0_0_0/0.03)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.03)_1px,transparent_0)] bg-[size:32px_32px]" />
      </div>

      <div className="relative">
        {/* Header */}
        <div className="border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-amber-700 transition-colors duration-300 group mb-6"
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
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-300" />
              <svg className="w-5 h-5 text-amber-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-stone-300" />
            </div>

            <h1 className="text-5xl font-serif font-light tracking-tight mb-4">
              <span className="bg-stone-900 dark:bg-stone-100 bg-clip-text text-transparent">
                Vendor Responses
              </span>
            </h1>

            <p className="text-gray-600 dark:text-gray-300 font-light">
              {responses.length > 0
                ? `${responses.length} ${responses.length === 1 ? 'vendor has' : 'vendors have'} responded to your inquiries`
                : 'No responses yet'}
            </p>
          </div>
        </div>

        {/* Responses List */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          {responses.length > 0 ? (
            <div className="space-y-6">
              {responses.map((response, idx) => (
                <Link
                  key={response.id}
                  href={`/dashboard/vendor/${response.vendorId}`}
                  className="block group bg-white dark:bg-stone-900 rounded-xl overflow-hidden shadow-lg dark:shadow-gray-900/30 border border-stone-200 dark:border-stone-800 hover:shadow-2xl hover:border-amber-200 dark:hover:border-amber-900 transition-all duration-300 animate-fadeIn"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-serif font-medium text-gray-900 dark:text-white group-hover:text-amber-800 transition-colors">
                            {response.vendor.name}
                          </h3>
                          <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 rounded-lg text-xs font-medium">
                            {response.vendor.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <svg
                            className="w-4 h-4 text-gray-400 dark:text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span className="font-light">{response.vendor.location}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-light mb-1">Responded</div>
                        <div className="text-base font-medium text-gray-900 dark:text-white">
                          {new Date(response.repliedAt || response.updatedAt).toLocaleDateString(
                            'en-AU',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Response Preview */}
                    <div className="bg-green-50/50 dark:bg-green-900/30 rounded-xl p-4 border border-green-200/50 dark:border-green-700/50 mb-4">
                      <div className="text-sm text-gray-700 dark:text-gray-200 font-light line-clamp-3 leading-relaxed">
                        {response.responseEmail}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {response.quote && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-stone-100 to-amber-100 dark:from-stone-800/50 dark:to-stone-800/30 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-stone-700"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Quote</div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                ${(response.quote / 100).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm font-medium text-amber-800 group-hover:text-amber-900">
                        <span>View Details</span>
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
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800/50 dark:to-indigo-900/50 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-stone-500"
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
              <h3 className="text-2xl font-serif font-medium text-gray-900 dark:text-white mb-3">
                No responses yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 font-light mb-8">
                When vendors respond to your inquiries, they&apos;ll appear here
              </p>
              <Link
                href="/dashboard/outreach"
                className="inline-flex items-center gap-2 text-amber-800 hover:text-amber-900 font-medium hover:underline transition-colors"
              >
                View All Outreach
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

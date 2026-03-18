import Link from 'next/link'
import { redirect } from 'next/navigation'

import Header from '@/components/Header'
import { VendorResponseForm } from '@/components/VendorResponseForm'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Check authentication
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/dashboard/vendor/' + id)
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

  // Get vendor details
  const vendor = await prisma.vendor.findUnique({
    where: { id },
  })

  if (!vendor) {
    redirect('/dashboard/outreach')
  }

  // Get outreach record
  const outreach = await prisma.vendorOutreach.findUnique({
    where: {
      weddingId_vendorId: {
        weddingId: wedding.id,
        vendorId: id,
      },
    },
  })

  if (!outreach) {
    redirect('/dashboard/outreach')
  }

  const getStatusInfo = () => {
    if (outreach.bounced) return { label: 'Bounced', color: 'red', icon: '⚠️' }
    if (outreach.replied) return { label: 'Responded', color: 'green', icon: '✓' }
    if (outreach.opened) return { label: 'Opened', color: 'blue', icon: '👁' }
    if (outreach.delivered) return { label: 'Delivered', color: 'purple', icon: '📬' }
    if (outreach.sentAt) return { label: 'Sent', color: 'gray', icon: '📧' }
    return { label: 'Pending', color: 'yellow', icon: '⏳' }
  }

  const status = getStatusInfo()

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
          <div className="max-w-5xl mx-auto px-6 py-8">
            <Link
              href="/dashboard/outreach"
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
              <span className="text-sm font-light tracking-wide">Back to Outreach</span>
            </Link>

            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-serif font-light tracking-tight mb-3">
                  <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    {vendor.name}
                  </span>
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <span className="px-3 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-lg font-medium">
                    {vendor.category}
                  </span>
                  <div className="flex items-center gap-1.5">
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
                    <span className="font-light">{vendor.location}</span>
                  </div>
                  {vendor.website && (
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline"
                    >
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
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      Website
                    </a>
                  )}
                </div>
              </div>

              <div className="px-4 py-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <div className="text-2xl mb-1">{status.icon}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">{status.label}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">
          {/* Email Sent */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-lg dark:shadow-gray-900/30 border border-white/50 dark:border-gray-700/50 animate-fadeIn">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-rose-300" />
              <h2 className="text-2xl font-serif font-medium text-gray-900 dark:text-white">Email Sent</h2>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Subject</div>
                <div className="text-base text-gray-900 dark:text-white font-light">{outreach.emailSubject}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Message</div>
                <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-xl p-4">
                  <p className="whitespace-pre-wrap break-words font-light text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
                    {outreach.emailBody}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-4 text-sm text-gray-600 dark:text-gray-300">
                {outreach.sentAt && (
                  <div className="flex items-center gap-2">
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-light">
                      Sent{' '}
                      {new Date(outreach.sentAt).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                {outreach.deliveredAt && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-light">
                      Delivered{' '}
                      {new Date(outreach.deliveredAt).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                )}
                {outreach.openedAt && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fillRule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-light">
                      Opened{' '}
                      {new Date(outreach.openedAt).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Response Section */}
          {outreach.replied && outreach.responseEmail ? (
            <div
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-lg dark:shadow-gray-900/30 border border-white/50 dark:border-gray-700/50 animate-fadeIn"
              style={{ animationDelay: '100ms' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-green-300" />
                <h2 className="text-2xl font-serif font-medium text-gray-900 dark:text-white">Vendor Response</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Response</div>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap font-light text-gray-700 dark:text-gray-200 bg-green-50/50 dark:bg-green-900/30 rounded-xl p-4 text-sm leading-relaxed border border-green-200/50 dark:border-green-700/50">
                      {outreach.responseEmail}
                    </pre>
                  </div>
                </div>

                {outreach.quote && (
                  <div className="flex items-center gap-3 p-4 bg-purple-50/50 dark:bg-purple-900/30 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white flex-shrink-0">
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
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-0.5">
                        Quote
                      </div>
                      <div className="text-2xl font-serif font-light text-gray-900 dark:text-white">
                        ${(outreach.quote / 100).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-light">
                    Received{' '}
                    {new Date(outreach.repliedAt || outreach.updatedAt).toLocaleDateString(
                      'en-AU',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-lg dark:shadow-gray-900/30 border border-white/50 dark:border-gray-700/50 animate-fadeIn"
              style={{ animationDelay: '100ms' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-300" />
                <h2 className="text-2xl font-serif font-medium text-gray-900 dark:text-white">Add Response</h2>
              </div>

              <p className="text-gray-600 dark:text-gray-300 font-light mb-6">
                Received a response from this vendor? Add it here to keep track of all
                communications.
              </p>

              <VendorResponseForm outreachId={outreach.id} />
            </div>
          )}

          {/* Notes */}
          {outreach.notes && (
            <div
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-lg dark:shadow-gray-900/30 border border-white/50 dark:border-gray-700/50 animate-fadeIn"
              style={{ animationDelay: '200ms' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-rose-300" />
                <h2 className="text-2xl font-serif font-medium text-gray-900 dark:text-white">Notes</h2>
              </div>
              <p className="text-gray-700 dark:text-gray-200 font-light leading-relaxed">{outreach.notes}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

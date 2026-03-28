import Link from 'next/link'

import Header from '@/components/Header'

export default function Home() {
  return (
    <main className="relative min-h-screen bg-stone-50 dark:bg-gray-950 transition-colors overflow-hidden">
      <Header />

      {/* Subtle grain texture */}
      <div className="fixed inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

      {/* Warm accent line at very top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-700/20 dark:via-amber-500/10 to-transparent" />

      {/* Hero */}
      <section className="relative pt-24 sm:pt-32 lg:pt-40 pb-20 sm:pb-28 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Eyebrow */}
          <div className="flex items-center gap-4 mb-8 animate-fadeIn">
            <div className="h-px w-10 bg-amber-800/30 dark:bg-amber-500/30" />
            <span className="text-xs font-medium tracking-[0.25em] uppercase text-amber-800/70 dark:text-amber-400/70">
              New South Wales, Australia
            </span>
          </div>

          {/* Headline — editorial, large, warm */}
          <h1 className="animate-fadeIn" style={{ animationDelay: '100ms' }}>
            <span className="block font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] text-stone-900 dark:text-stone-100 leading-[1.05] tracking-tight">
              Your wedding vendors,
            </span>
            <span className="block font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] text-amber-800/80 dark:text-amber-400/80 leading-[1.05] tracking-tight mt-1">
              found & contacted.
            </span>
          </h1>

          {/* Subhead */}
          <p
            className="mt-8 sm:mt-10 text-lg sm:text-xl text-stone-600 dark:text-stone-400 max-w-xl leading-relaxed font-light animate-fadeIn"
            style={{ animationDelay: '200ms' }}
          >
            Tell us about your day. We match you with venues, photographers, and caterers across NSW — then help you reach out with personalised emails.
          </p>

          {/* CTA */}
          <div
            className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-start gap-4 animate-fadeIn"
            style={{ animationDelay: '300ms' }}
          >
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-full text-base font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors duration-200"
            >
              Start planning
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-8 py-4 text-base font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors duration-200"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-stone-200 dark:bg-stone-800" />
      </div>

      {/* How it works */}
      <section className="relative py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-px w-10 bg-stone-300 dark:bg-stone-700" />
            <span className="text-xs font-medium tracking-[0.25em] uppercase text-stone-500 dark:text-stone-500">
              How it works
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {[
              {
                step: '01',
                title: 'Share your details',
                description: 'Date, location, guest count, budget, and style. A quick questionnaire — takes a few minutes.',
              },
              {
                step: '02',
                title: 'Browse matched vendors',
                description: 'We surface NSW vendors that fit your criteria, scored and sorted by relevance to your wedding.',
              },
              {
                step: '03',
                title: 'Send & track inquiries',
                description: 'Generate personalised emails, send them in one click, and track every response from your dashboard.',
              },
            ].map((item, idx) => (
              <div key={idx} className="group">
                <div className="text-sm font-medium text-amber-800/50 dark:text-amber-500/40 mb-4 tracking-wider">
                  {item.step}
                </div>
                <h3 className="font-display text-2xl text-stone-900 dark:text-stone-100 mb-3">
                  {item.title}
                </h3>
                <p className="text-stone-500 dark:text-stone-400 leading-relaxed text-[0.95rem]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-stone-200 dark:bg-stone-800" />
      </div>

      {/* Stats / trust band */}
      <section className="relative py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: '85+', label: 'Verified vendors' },
              { value: '5', label: 'NSW regions' },
              { value: '6', label: 'Vendor categories' },
              { value: '$49', label: 'One-time fee' },
            ].map((stat, idx) => (
              <div key={idx}>
                <div className="font-display text-3xl sm:text-4xl text-stone-900 dark:text-stone-100 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-stone-500 dark:text-stone-500">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-stone-200 dark:bg-stone-800" />
      </div>

      {/* Regions */}
      <section className="relative py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-px w-10 bg-stone-300 dark:bg-stone-700" />
            <span className="text-xs font-medium tracking-[0.25em] uppercase text-stone-500 dark:text-stone-500">
              Regions we cover
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {['Sydney', 'Newcastle', 'Hunter Valley', 'Blue Mountains', 'South Coast'].map(region => (
              <div
                key={region}
                className="px-5 py-2.5 rounded-full border border-stone-200 dark:border-stone-800 text-sm text-stone-700 dark:text-stone-300 hover:border-amber-700/40 dark:hover:border-amber-500/30 hover:text-amber-800 dark:hover:text-amber-400 transition-colors duration-200 cursor-default"
              >
                {region}
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm text-stone-400 dark:text-stone-600">
            Venues, photographers, caterers, florists, and entertainment across New South Wales.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative py-20 sm:py-28 px-6 bg-stone-100/50 dark:bg-stone-900/30">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-stone-900 dark:text-stone-100 mb-6">
            Less admin, more celebration.
          </h2>
          <p className="text-stone-500 dark:text-stone-400 max-w-lg mx-auto mb-10 leading-relaxed">
            Stop chasing vendors through Instagram DMs and outdated directories. Get matched, send inquiries, and track it all in one place.
          </p>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-full text-base font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors duration-200"
          >
            Get started
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-stone-200 dark:border-stone-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-display text-lg text-stone-900 dark:text-stone-100">
            Bower
          </div>
          <div className="text-xs text-stone-400 dark:text-stone-600">
            Built for couples planning weddings in Australia
          </div>
        </div>
      </footer>
    </main>
  )
}

import { describe, it, expect } from 'vitest'

import { VendorMatch, VendorMatches } from '@/lib/vendor-matching'

describe('VendorMatches interface', () => {
  it('includes all vendor categories', () => {
    const matches: VendorMatches = {
      venues: [],
      photographers: [],
      caterers: [],
      florists: [],
      entertainment: [],
      other: [],
      totalMatches: 0,
    }

    expect(matches.totalMatches).toBe(0)
    expect(matches.venues).toHaveLength(0)
    expect(matches.florists).toHaveLength(0)
    expect(matches.entertainment).toHaveLength(0)
    expect(matches.other).toHaveLength(0)
  })

  it('VendorMatch extends Vendor with score and reasons', () => {
    const match = {
      matchScore: 85,
      matchReasons: ['Located in Sydney', 'Within your budget'],
    } as Partial<VendorMatch>

    expect(match.matchScore).toBe(85)
    expect(match.matchReasons).toHaveLength(2)
  })
})

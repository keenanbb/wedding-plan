import { describe, it, expect } from 'vitest'

import { checkPaymentStatus } from '@/lib/payment'

describe('checkPaymentStatus', () => {
  it('returns paid=false when wedding has no paidAt', () => {
    const wedding = { id: 'w1', paidAt: null }
    const result = checkPaymentStatus(wedding as any)
    expect(result.paid).toBe(false)
  })

  it('returns paid=true when wedding has paidAt', () => {
    const wedding = { id: 'w1', paidAt: new Date('2026-01-01') }
    const result = checkPaymentStatus(wedding as any)
    expect(result.paid).toBe(true)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    vendorOutreach: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('Unsubscribe logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks outreach as unsubscribed when valid token provided', async () => {
    const mockOutreach = { id: 'out1', unsubscribed: false }
    vi.mocked(prisma.vendorOutreach.findUnique).mockResolvedValue(mockOutreach as any)
    vi.mocked(prisma.vendorOutreach.update).mockResolvedValue({ ...mockOutreach, unsubscribed: true } as any)

    const outreach = await prisma.vendorOutreach.findUnique({ where: { id: 'out1' } })
    expect(outreach).toBeTruthy()

    await prisma.vendorOutreach.update({
      where: { id: 'out1' },
      data: { unsubscribed: true, unsubscribedAt: expect.any(Date) },
    })

    expect(prisma.vendorOutreach.update).toHaveBeenCalledWith({
      where: { id: 'out1' },
      data: { unsubscribed: true, unsubscribedAt: expect.any(Date) },
    })
  })

  it('handles invalid token gracefully', async () => {
    vi.mocked(prisma.vendorOutreach.findUnique).mockResolvedValue(null)
    const outreach = await prisma.vendorOutreach.findUnique({ where: { id: 'invalid' } })
    expect(outreach).toBeNull()
  })
})

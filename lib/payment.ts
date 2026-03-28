import { Wedding } from '@prisma/client'

export interface PaymentStatus {
  paid: boolean
}

/**
 * Check if a wedding has been paid for.
 * Used to guard outreach API routes.
 */
export function checkPaymentStatus(wedding: Pick<Wedding, 'paidAt'>): PaymentStatus {
  return { paid: wedding.paidAt !== null }
}

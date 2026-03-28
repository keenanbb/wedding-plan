import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }
    stripeClient = new Stripe(key, {
      typescript: true,
    })
  }
  return stripeClient
}

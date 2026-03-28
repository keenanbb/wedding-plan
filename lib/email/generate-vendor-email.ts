import { Vendor, Wedding } from '@prisma/client'

import { anthropic } from '@/lib/claude'
import { sanitizeForAIPrompt } from '@/lib/input-validation'
import { withRetry, isTransientError } from '@/lib/retry'

export interface GeneratedEmail {
  subject: string
  body: string
}

/**
 * Generate a personalized email to a vendor using Claude AI
 */
export async function generateVendorEmail(
  vendor: Vendor,
  wedding: Wedding,
  userEmail: string
): Promise<GeneratedEmail> {
  // Sanitize all user inputs to prevent prompt injection
  const sanitizedVendorName = sanitizeForAIPrompt(vendor.name)
  const sanitizedLocation = sanitizeForAIPrompt(wedding.location || 'Not specified')
  const sanitizedStyle = sanitizeForAIPrompt(wedding.style || 'Not specified')
  const sanitizedMustHaves = wedding.mustHaves.map(h => sanitizeForAIPrompt(h)).join(', ')
  const sanitizedDietaryNeeds = wedding.dietaryNeeds.map(d => sanitizeForAIPrompt(d)).join(', ')

  const prompt = `You are helping a couple contact wedding vendors. Generate a professional, warm, and personalized email inquiry.

VENDOR DETAILS:
- Name: ${sanitizedVendorName}
- Category: ${vendor.category}
- Location: ${vendor.location}
- Services: ${vendor.servicesOffered.join(', ')}

WEDDING DETAILS:
- Date: ${formatWeddingDateForEmail(wedding)}
- Location: ${sanitizedLocation}
- Guest Count: ${wedding.guestCount || 'To be determined'}
- Style: ${sanitizedStyle}
${wedding.mustHaves.length > 0 ? `- Must-haves: ${sanitizedMustHaves}` : ''}
${wedding.dietaryNeeds.length > 0 ? `- Dietary requirements: ${sanitizedDietaryNeeds}` : ''}

Generate a professional email with:
1. A compelling subject line (max 60 characters)
2. An email body that:
   - Opens warmly and mentions how you found them
   - Briefly describes the wedding vision and key details
   - Asks about availability for the date (if flexible dates, mention the couple is flexible and list the date ranges they're considering)
   - Requests pricing/packages information
   - Mentions 1-2 specific things about their services that appeal to the couple
   - Ends with a clear call-to-action
   - Includes the couple's contact email: ${userEmail}
   - Is professional but friendly (Australian English)
   - Is concise (200-300 words)

Format your response as:
SUBJECT: [subject line]

BODY:
[email body]

Do not include any other text before or after.`

  try {
    const response = await withRetry(
      () =>
        anthropic.messages.create({
          model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
          max_tokens: 1000,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }],
        }),
      { maxAttempts: 3, initialDelayMs: 1000, shouldRetry: isTransientError }
    )

    const textContent = response.content.find(block => block.type === 'text')
    const generatedText = textContent && textContent.type === 'text' ? textContent.text : ''

    // Parse the response
    const subjectMatch = generatedText.match(/SUBJECT:\s*(.+?)(?:\n|$)/i)
    const bodyMatch = generatedText.match(/BODY:\s*([\s\S]+?)(?:\n\n---|\n\nBest regards|$)/i)

    const subject =
      subjectMatch?.[1]?.trim() ||
      `Wedding Inquiry - ${new Date(wedding.weddingDate || Date.now()).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}`
    const body = bodyMatch?.[1]?.trim() || generatedText

    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://wedding-plan-v2.vercel.app'}/api/unsubscribe?token=OUTREACH_ID_PLACEHOLDER`

    const footer = `\n\n---\nSent via Bower on behalf of a couple planning their wedding.\nIf you'd prefer not to receive inquiries like this, you can unsubscribe: ${unsubscribeUrl}`

    return { subject, body: body + footer }
  } catch (error) {
    console.error('Error generating email with Claude:', error)

    // Fallback to template if AI fails
    return generateFallbackEmail(vendor, wedding, userEmail)
  }
}

/**
 * Format wedding date for email content
 */
function formatWeddingDateForEmail(wedding: Wedding): string {
  if (wedding.weddingDate && !wedding.dateFlexible) {
    return new Date(wedding.weddingDate).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (wedding.dateFlexible && wedding.preferredDates) {
    const ranges = wedding.preferredDates as Array<{ start: string; end: string }>
    if (ranges.length > 0) {
      const formatted = ranges.map(r => {
        const start = new Date(r.start + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
        const end = new Date(r.end + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
        return `${start} to ${end}`
      })
      return `Flexible - considering: ${formatted.join('; ')}`
    }
  }

  return 'Flexible'
}

/**
 * Fallback email template if AI generation fails
 */
function generateFallbackEmail(
  vendor: Vendor,
  wedding: Wedding,
  userEmail: string
): GeneratedEmail {
  const dateStr = formatWeddingDateForEmail(wedding)

  const subject = `Wedding Inquiry - ${vendor.category} for ${new Date(wedding.weddingDate || Date.now()).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}`

  const body = `Dear ${vendor.name} team,

I hope this email finds you well. I'm reaching out regarding ${vendor.category.toLowerCase()} services for our upcoming wedding.

Wedding Details:
• Date: ${dateStr}
• Location: ${wedding.location}
• Guest Count: ${wedding.guestCount || 'Approximately 50-150'} guests
${wedding.style ? `• Style: ${wedding.style}` : ''}

We're very interested in learning more about your services and would love to know:
1. Are you available for our wedding date?
2. What packages do you offer, and what are your rates?
3. Do you have any portfolio examples we could review?

${wedding.mustHaves.length > 0 ? `We're particularly looking for: ${wedding.mustHaves.slice(0, 2).join(', ')}.` : ''}

Please let me know if you'd like to arrange a call or meeting to discuss our requirements in more detail.

Looking forward to hearing from you!

Best regards,
${userEmail}`

  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://wedding-plan-v2.vercel.app'}/api/unsubscribe?token=OUTREACH_ID_PLACEHOLDER`

  const footer = `\n\n---\nSent via Bower on behalf of a couple planning their wedding.\nIf you'd prefer not to receive inquiries like this, you can unsubscribe: ${unsubscribeUrl}`

  return { subject, body: body + footer }
}

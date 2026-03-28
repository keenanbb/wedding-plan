import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-helpers'
import { checkPaymentStatus } from '@/lib/payment'
import { getResendClient, validateEmailConfig } from '@/lib/email/resend-client'
import { getEnvVar } from '@/lib/env-validation'
import { isValidEmail, validateArray } from '@/lib/input-validation'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { withRetry, isTransientError } from '@/lib/retry'

interface EmailToSend {
  vendorId: string
  vendorName: string
  vendorEmail: string
  vendorCategory: string
  subject: string
  body: string
}

interface ResendEmailResult {
  id: string
  [key: string]: unknown
}

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(req)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    // Rate limiting for email sending
    const rateLimitResult = await checkRateLimit(user.dbUser.id, RATE_LIMITS.EMAIL_SEND, 'email')
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Email rate limit exceeded. You can send more emails in an hour.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
          },
        }
      )
    }

    // Validate email configuration
    const emailConfigValidation = validateEmailConfig()
    if (!emailConfigValidation.isValid) {
      return NextResponse.json(
        { error: `Email not configured: ${emailConfigValidation.error}` },
        { status: 500 }
      )
    }

    const body = await req.json()
    const emails = validateArray<EmailToSend>(body.emails, 100) // Max 100 emails per batch
    const { weddingId } = body

    if (emails.length === 0) {
      return NextResponse.json({ error: 'At least one email is required' }, { status: 400 })
    }

    if (!weddingId || typeof weddingId !== 'string') {
      return NextResponse.json({ error: 'Valid weddingId is required' }, { status: 400 })
    }

    // Verify wedding ownership
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: { user: true },
    })

    if (!wedding || wedding.user.authId !== user.supabaseUser.id) {
      return NextResponse.json({ error: 'Wedding not found or access denied' }, { status: 404 })
    }

    // Require payment
    const paymentStatus = checkPaymentStatus(wedding)
    if (!paymentStatus.paid) {
      return NextResponse.json(
        { error: 'Payment required. Upgrade to send vendor emails.', requiresPayment: true },
        { status: 402 }
      )
    }

    // Validate vendor emails before attempting to send
    const validEmails: EmailToSend[] = []
    const invalidEmails: { vendorId: string; error: string }[] = []

    for (const email of emails) {
      if (!isValidEmail(email.vendorEmail)) {
        invalidEmails.push({ vendorId: email.vendorId, error: `Invalid email: ${email.vendorEmail}` })
      } else {
        validEmails.push(email)
      }
    }

    if (validEmails.length === 0) {
      return NextResponse.json({
        success: false,
        sent: 0,
        failed: invalidEmails.length,
        total: emails.length,
        failedVendors: invalidEmails,
        outreachRecords: [],
      }, { status: 400 })
    }

    // Filter out vendors who have previously unsubscribed
    const filteredEmails: EmailToSend[] = []
    for (const email of validEmails) {
      // Skip vendors who have unsubscribed from a previous outreach
      const previousOutreach = await prisma.vendorOutreach.findFirst({
        where: {
          vendorId: email.vendorId,
          unsubscribed: true,
        },
      })
      if (previousOutreach) {
        invalidEmails.push({ vendorId: email.vendorId, error: 'Vendor has unsubscribed from previous outreach' })
        continue // Skip this vendor — they've opted out
      }
      filteredEmails.push(email)
    }

    // Send batch emails via Resend
    // Note: Resend batch API accepts up to 100 emails at once
    const batchSize = 100
    const batches = []

    for (let i = 0; i < filteredEmails.length; i += batchSize) {
      const batch = filteredEmails.slice(i, i + batchSize)
      batches.push(batch)
    }

    // Pre-create outreach records so we have IDs to embed in unsubscribe links.
    // sentAt is left null until we confirm Resend accepted the email.
    const outreachRecordMap = new Map<string, string>() // vendorId -> outreachId
    await Promise.all(
      filteredEmails.map(async email => {
        const outreach = await prisma.vendorOutreach.create({
          data: {
            weddingId,
            vendorId: email.vendorId,
            emailSubject: email.subject,
            emailBody: email.body,
            emailId: null,
            sentAt: null,
            delivered: false,
            opened: false,
            replied: false,
            bounced: false,
          },
        })
        outreachRecordMap.set(email.vendorId, outreach.id)
      })
    )

    // Map each email to its send result: { emailId, vendorId, success }
    const sendResults: { vendorId: string; emailId: string | null; error?: string }[] = []

    for (const batch of batches) {
      try {
        const resend = getResendClient()
        // Personalize "from" name and set reply-to user's email
        const fromBase = getEnvVar('EMAIL_FROM')
        const fromAddress = wedding.user.name
          ? `${wedding.user.name} via Bower <${fromBase}>`
          : fromBase

        const batchResult = await withRetry(
          () =>
            resend.batch.send(
              batch.map(email => {
                const outreachId = outreachRecordMap.get(email.vendorId) || ''
                const finalBody = email.body.replace('OUTREACH_ID_PLACEHOLDER', outreachId)
                return {
                  from: fromAddress,
                  replyTo: wedding.user.email,
                  to: email.vendorEmail,
                  subject: email.subject,
                  text: finalBody,
                  tags: [
                    { name: 'wedding_id', value: weddingId },
                    { name: 'vendor_id', value: email.vendorId },
                    { name: 'category', value: email.vendorCategory },
                  ],
                }
              })
            ),
          { maxAttempts: 3, initialDelayMs: 1000, shouldRetry: isTransientError }
        )

        if (batchResult.data) {
          const batchData = batchResult.data as unknown as ResendEmailResult | ResendEmailResult[]
          const dataArray = Array.isArray(batchData) ? batchData : [batchData]
          batch.forEach((email, i) => {
            sendResults.push({
              vendorId: email.vendorId,
              emailId: dataArray[i]?.id || null,
            })
          })
        } else {
          // API returned no data — mark all in this batch as failed
          batch.forEach(email => {
            sendResults.push({
              vendorId: email.vendorId,
              emailId: null,
              error: 'No response from email service',
            })
          })
        }
      } catch (error) {
        console.error('Batch send error:', error)
        // Mark all emails in this failed batch
        batch.forEach(email => {
          sendResults.push({
            vendorId: email.vendorId,
            emailId: null,
            error: error instanceof Error ? error.message : 'Unknown send error',
          })
        })
      }
    }

    // Update outreach records with Resend email IDs for successfully sent emails
    const successfulSends = sendResults.filter(r => r.emailId !== null)
    const failedSends = sendResults.filter(r => r.emailId === null)

    const sentAt = new Date()
    const outreachRecords = await Promise.all(
      successfulSends.map(async result => {
        const outreachId = outreachRecordMap.get(result.vendorId)!
        return prisma.vendorOutreach.update({
          where: { id: outreachId },
          data: { emailId: result.emailId, sentAt },
        })
      })
    )

    // Update wedding status to OUTREACH if at least one email was sent
    if (successfulSends.length > 0) {
      await prisma.wedding.update({
        where: { id: weddingId },
        data: { status: 'OUTREACH' },
      })
    }

    const allFailures = [
      ...invalidEmails,
      ...failedSends.map(r => ({ vendorId: r.vendorId, error: r.error || 'Send failed' })),
    ]

    return NextResponse.json({
      success: successfulSends.length > 0,
      sent: successfulSends.length,
      failed: allFailures.length,
      total: emails.length,
      failedVendors: allFailures,
      outreachRecords: outreachRecords.map(r => r.id),
    })
  } catch (error) {
    console.error('Error sending batch emails:', error)
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 })
  }
}

/**
 * bootstrap-vendors.ts
 *
 * CLI tool for importing vendor data from external sources (Outscraper JSON or CSV)
 * into the Prisma database.
 *
 * Usage:
 *   npx tsx scripts/bootstrap-vendors.ts --file data/outscraper-sydney.json --region Sydney
 *   npx tsx scripts/bootstrap-vendors.ts --file data/vendors.csv --region "Hunter Valley" --format csv
 *   npx tsx scripts/bootstrap-vendors.ts --file data/outscraper-sydney.json --region Sydney --dry-run
 */

import { PrismaClient, VendorCategory, PriceRange } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  file: string
  region: string
  format: 'json' | 'csv'
  dryRun: boolean
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  let file = ''
  let region = ''
  let format: 'json' | 'csv' = 'json'
  let dryRun = false

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
        file = args[++i] ?? ''
        break
      case '--region':
        region = args[++i] ?? ''
        break
      case '--format':
        const fmt = args[++i]
        if (fmt === 'csv' || fmt === 'json') {
          format = fmt
        } else {
          console.error(`[bootstrap] Unknown format "${fmt}". Use "json" or "csv".`)
          process.exit(1)
        }
        break
      case '--dry-run':
        dryRun = true
        break
      default:
        console.error(`[bootstrap] Unknown argument: ${args[i]}`)
        process.exit(1)
    }
  }

  if (!file) {
    console.error('[bootstrap] --file <path> is required')
    process.exit(1)
  }
  if (!region) {
    console.error('[bootstrap] --region <region> is required')
    process.exit(1)
  }

  return { file, region, format, dryRun }
}

// ---------------------------------------------------------------------------
// Normalised vendor shape (internal)
// ---------------------------------------------------------------------------

interface NormalisedVendor {
  name: string
  email: string
  category: VendorCategory
  location: string
  region: string
  phone?: string
  website?: string
  address?: string
  state: string
  latitude?: number
  longitude?: number
  rating?: number
  priceRange?: PriceRange
  description: string
}

// ---------------------------------------------------------------------------
// Category mapping
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, VendorCategory> = {
  // Venues
  'wedding venue': 'VENUE',
  venue: 'VENUE',
  'event venue': 'VENUE',
  'function venue': 'VENUE',
  'reception venue': 'VENUE',
  hall: 'VENUE',
  'banquet hall': 'VENUE',
  // Photographers
  photographer: 'PHOTOGRAPHER',
  photography: 'PHOTOGRAPHER',
  'wedding photographer': 'PHOTOGRAPHER',
  'wedding photography': 'PHOTOGRAPHER',
  videographer: 'PHOTOGRAPHER',
  'wedding videographer': 'PHOTOGRAPHER',
  // Catering
  catering: 'CATERING',
  caterer: 'CATERING',
  'wedding catering': 'CATERING',
  'wedding caterer': 'CATERING',
  'food catering': 'CATERING',
  restaurant: 'CATERING',
  // Florists
  florist: 'FLORIST',
  florist: 'FLORIST',
  'wedding florist': 'FLORIST',
  floristry: 'FLORIST',
  flowers: 'FLORIST',
  'flower shop': 'FLORIST',
  // Entertainment
  entertainment: 'ENTERTAINMENT',
  'wedding entertainment': 'ENTERTAINMENT',
  dj: 'ENTERTAINMENT',
  'wedding dj': 'ENTERTAINMENT',
  band: 'ENTERTAINMENT',
  'wedding band': 'ENTERTAINMENT',
  musician: 'ENTERTAINMENT',
  'live music': 'ENTERTAINMENT',
  // Marquees
  marquee: 'MARQUEE',
  'marquee hire': 'MARQUEE',
  'tent hire': 'MARQUEE',
  'wedding marquee': 'MARQUEE',
}

function mapCategory(raw: string): VendorCategory | null {
  if (!raw) return null
  const normalised = raw.trim().toLowerCase()
  // Exact match first
  if (CATEGORY_MAP[normalised]) return CATEGORY_MAP[normalised]
  // Partial match
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (normalised.includes(key) || key.includes(normalised)) return value
  }
  return null
}

// ---------------------------------------------------------------------------
// Price level mapping
// ---------------------------------------------------------------------------

function mapPriceLevel(raw: string | undefined | null): PriceRange | undefined {
  if (!raw) return undefined
  switch (raw.trim()) {
    case '$':
      return 'BUDGET'
    case '$$':
      return 'MODERATE'
    case '$$$':
      return 'PREMIUM'
    case '$$$$':
      return 'LUXURY'
    default:
      return undefined
  }
}

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------

function isValidEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

// ---------------------------------------------------------------------------
// Outscraper JSON format
// ---------------------------------------------------------------------------

interface OutscraperRecord {
  name?: string
  full_address?: string
  city?: string
  state?: string
  phone?: string
  site?: string
  email_1?: string
  email_2?: string
  category?: string
  rating?: number
  reviews?: number
  latitude?: number
  longitude?: number
  price_level?: string
}

function normaliseOutscraper(record: OutscraperRecord, region: string): NormalisedVendor | null {
  const name = record.name?.trim()
  if (!name) return null

  const category = mapCategory(record.category ?? '')
  if (!category) return null

  // Prefer email_1, fall back to email_2
  const emailRaw = isValidEmail(record.email_1)
    ? record.email_1!
    : isValidEmail(record.email_2)
      ? record.email_2!
      : null
  if (!emailRaw) return null

  return {
    name,
    email: emailRaw.trim().toLowerCase(),
    category,
    location: record.city?.trim() || region,
    region,
    phone: record.phone?.trim() || undefined,
    website: record.site?.trim() || undefined,
    address: record.full_address?.trim() || undefined,
    state: record.state?.trim() || 'NSW',
    latitude: record.latitude ?? undefined,
    longitude: record.longitude ?? undefined,
    rating: record.rating ?? undefined,
    priceRange: mapPriceLevel(record.price_level),
    description: '',
  }
}

// ---------------------------------------------------------------------------
// CSV format
// Header: name,email,category,location,phone,website,rating,priceMin,priceMax,maxGuests,description
// ---------------------------------------------------------------------------

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim())
  const records: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const record: Record<string, string> = {}
    headers.forEach((header, idx) => {
      record[header] = (values[idx] ?? '').trim()
    })
    records.push(record)
  }

  return records
}

function normaliseCsv(record: Record<string, string>, region: string): NormalisedVendor | null {
  const name = record['name']?.trim()
  if (!name) return null

  const category = mapCategory(record['category'] ?? '')
  if (!category) return null

  const email = record['email']?.trim()
  if (!isValidEmail(email)) return null

  return {
    name,
    email: email!.toLowerCase(),
    category,
    location: record['location']?.trim() || region,
    region,
    phone: record['phone']?.trim() || undefined,
    website: record['website']?.trim() || undefined,
    state: 'NSW',
    rating: record['rating'] ? parseFloat(record['rating']) : undefined,
    description: record['description']?.trim() || '',
  }
}

// ---------------------------------------------------------------------------
// Summary tracking
// ---------------------------------------------------------------------------

interface Summary {
  total: number
  imported: number
  skipped: number
  duplicates: number
  byCategory: Partial<Record<VendorCategory, number>>
}

function printSummary(summary: Summary, dryRun: boolean): void {
  const mode = dryRun ? ' (DRY RUN)' : ''
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`[bootstrap] Import complete${mode}`)
  console.log(`${'─'.repeat(50)}`)
  console.log(`  Total records processed : ${summary.total}`)
  console.log(`  Imported                : ${summary.imported}`)
  console.log(`  Skipped (invalid)       : ${summary.skipped}`)
  console.log(`  Duplicates              : ${summary.duplicates}`)
  console.log(`\n  Category breakdown:`)
  for (const [cat, count] of Object.entries(summary.byCategory)) {
    console.log(`    ${cat.padEnd(16)}: ${count}`)
  }
  console.log(`${'─'.repeat(50)}\n`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { file, region, format, dryRun } = parseArgs()

  const filePath = path.resolve(process.cwd(), file)
  if (!fs.existsSync(filePath)) {
    console.error(`[bootstrap] File not found: ${filePath}`)
    process.exit(1)
  }

  console.log(`[bootstrap] Reading ${filePath}`)
  console.log(`[bootstrap] Region: ${region} | Format: ${format}${dryRun ? ' | DRY RUN' : ''}`)

  const content = fs.readFileSync(filePath, 'utf-8')

  // Parse into normalised vendor list
  let normalised: (NormalisedVendor | null)[] = []

  if (format === 'json') {
    let raw: OutscraperRecord[]
    try {
      raw = JSON.parse(content)
    } catch {
      console.error('[bootstrap] Failed to parse JSON file')
      process.exit(1)
    }
    if (!Array.isArray(raw)) {
      console.error('[bootstrap] JSON file must contain an array at the top level')
      process.exit(1)
    }
    normalised = raw.map((r) => normaliseOutscraper(r, region))
  } else {
    const rows = parseCsv(content)
    normalised = rows.map((r) => normaliseCsv(r, region))
  }

  const vendors = normalised.filter((v): v is NormalisedVendor => v !== null)
  const skippedDuringNormalise = normalised.length - vendors.length

  console.log(
    `[bootstrap] Parsed ${normalised.length} records, ${vendors.length} valid after normalisation` +
      (skippedDuringNormalise > 0 ? `, ${skippedDuringNormalise} skipped (missing name/email/category)` : ''),
  )

  if (vendors.length === 0) {
    console.log('[bootstrap] Nothing to import.')
    process.exit(0)
  }

  const prisma = new PrismaClient()

  const summary: Summary = {
    total: normalised.length,
    imported: 0,
    skipped: skippedDuringNormalise,
    duplicates: 0,
    byCategory: {},
  }

  try {
    for (const vendor of vendors) {
      // Check for duplicates by email
      const existing = await prisma.vendor.findFirst({
        where: { email: vendor.email },
        select: { id: true, name: true },
      })

      if (existing) {
        console.log(`[bootstrap] DUPLICATE  — ${vendor.email} (existing: "${existing.name}")`)
        summary.duplicates++
        continue
      }

      if (dryRun) {
        console.log(`[bootstrap] WOULD IMPORT — [${vendor.category}] ${vendor.name} <${vendor.email}>`)
      } else {
        await prisma.vendor.create({
          data: {
            name: vendor.name,
            category: vendor.category,
            email: vendor.email,
            phone: vendor.phone,
            website: vendor.website,
            location: vendor.location,
            region: vendor.region,
            address: vendor.address,
            state: vendor.state,
            latitude: vendor.latitude,
            longitude: vendor.longitude,
            rating: vendor.rating,
            priceRange: vendor.priceRange,
            description: vendor.description,
          },
        })
        console.log(`[bootstrap] IMPORTED   — [${vendor.category}] ${vendor.name} <${vendor.email}>`)
      }

      summary.imported++
      summary.byCategory[vendor.category] = (summary.byCategory[vendor.category] ?? 0) + 1
    }
  } finally {
    await prisma.$disconnect()
  }

  printSummary(summary, dryRun)
}

main().catch((err) => {
  console.error('[bootstrap] Fatal error:', err)
  process.exit(1)
})

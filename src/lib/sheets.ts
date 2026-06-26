import { google, sheets_v4 } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

// Cache client di module level — reuse antar request dalam instance yang sama
let cachedSheets: sheets_v4.Sheets | null = null

export function getAuthClient() {
  const key = process.env.GOOGLE_PRIVATE_KEY ?? ''
  // Handle berbagai format newline yang mungkin dari Vercel env vars
  const formattedKey = key.includes('\\n')
    ? key.replace(/\\n/g, '\n')
    : key

  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: formattedKey,
    scopes: SCOPES,
  })
}

export async function getSheets(): Promise<sheets_v4.Sheets> {
  if (cachedSheets) return cachedSheets
  const auth = getAuthClient()
  // Pre-authorize agar token di-cache oleh client
  await auth.authorize()
  cachedSheets = google.sheets({ version: 'v4', auth })
  return cachedSheets
}

// Retry wrapper untuk handle transient Google API errors
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string }
      const isTransient = e.code === 503 || e.code === 429 || e.code === 500
      if (!isTransient || attempt === retries) throw err
      // Reset cache kalau auth error supaya re-authenticate
      if (e.code === 401 || e.code === 403) cachedSheets = null
      await new Promise(r => setTimeout(r, delayMs * attempt))
    }
  }
  throw new Error('Max retries exceeded')
}

export const SPREADSHEET_ID           = process.env.SPREADSHEET_ID!
export const INVENTORY_SPREADSHEET_ID = process.env.INVENTORY_SPREADSHEET_ID!

export const SHEETS = {
  MASTER:   '1_Master_Article',
  SALES:    '2_Sales_Data',
  REQUESTS: '3_Request_Log',
  DISPLAY:  '4_Pengajuan_Display',
  CONFIG:   '5_Config',
}

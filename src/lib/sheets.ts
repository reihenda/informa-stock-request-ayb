import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

export function getAuthClient() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  })
}

export async function getSheets() {
  const auth = getAuthClient()
  return google.sheets({ version: 'v4', auth })
}

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID!

// Sheet names — sesuaikan jika berbeda di file lu
export const SHEETS = {
  MASTER:   '1_Master_Article',
  SALES:    '2_Sales_Data',
  REQUESTS: '3_Request_Log',
  DISPLAY:  '4_Pengajuan_Display',
  CONFIG:   '5_Config',
}

export const DAYPARTS = [
  'Early Morning',
  'Daytime',
  'Early Fringe',
  'Early News',
  'Prime Access',
  'Prime Time',
  'Late News',
  'Late Fringe',
  'Overnight',
  'Weekend',
] as const

export const PSA_CATEGORIES = [
  'Health',
  'Safety',
  'Education',
  'Environment',
  'Community',
  'Emergency Preparedness',
  'Other',
] as const

export const LANGUAGES = ['English', 'Spanish', 'Bilingual', 'Other'] as const

export const DURATIONS = [15, 30, 60] as const

export const DEFAULT_CPM_DOLLARS = 25

export function centsToDollars(cents: number | null | undefined): number {
  return Math.round(((cents ?? 0) / 100) * 100) / 100
}

export function nielsenCsvTemplate(): string {
  return [
    'station,market,air_date,air_time,program,daypart,duration_sec,impressions,rate_value,creative_title,isci',
    'WABC,New York NY,2026-09-12,18:24,Evening News,Early News,30,45200,1125.50,Flu Shots Save Lives,ABCD1234',
    'WABC,New York NY,2026-09-13,21:05,Prime Movie,Prime Time,30,78900,,Flu Shots Save Lives,ABCD1234',
  ].join('\n')
}

export type ParsedAiringRow = {
  station: string
  market: string
  airDate: string
  airTime: string
  program: string
  daypart: string
  durationSec: number
  impressions: number
  rateValue: number | null
  creativeTitle: string
  isci: string
  _error?: string
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQ = !inQ
      }
    } else if (ch === ',' && !inQ) {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}

export function parseNielsenCsv(text: string): ParsedAiringRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n)
      if (i >= 0) return i
    }
    return -1
  }
  const iStation = idx(['station', 'callsign', 'call_sign'])
  const iMarket = idx(['market', 'dma', 'market_name'])
  const iDate = idx(['air_date', 'airdate', 'date'])
  const iTime = idx(['air_time', 'airtime', 'time'])
  const iProgram = idx(['program', 'show', 'program_name'])
  const iDaypart = idx(['daypart', 'day_part'])
  const iDur = idx(['duration_sec', 'duration', 'length', 'spot_length'])
  const iImp = idx(['impressions', 'imp', 'audience', 'hh_imp'])
  const iRate = idx(['rate_value', 'rate', 'value', 'media_value', 'spot_rate'])
  const iTitle = idx(['creative_title', 'creative', 'spot_title', 'title'])
  const iIsci = idx(['isci', 'ad_id', 'adid', 'iscii'])

  const rows: ParsedAiringRow[] = []
  for (let li = 1; li < lines.length; li++) {
    const cols = splitCsvLine(lines[li])
    const get = (i: number) => (i >= 0 && i < cols.length ? cols[i].replace(/^"|"$/g, '').trim() : '')
    const durRaw = get(iDur).replace(/s$/i, '')
    const impRaw = get(iImp).replace(/[",]/g, '')
    const rateRaw = get(iRate).replace(/[$,]/g, '')
    const row: ParsedAiringRow = {
      station: get(iStation).toUpperCase(),
      market: get(iMarket),
      airDate: get(iDate),
      airTime: get(iTime),
      program: get(iProgram),
      daypart: get(iDaypart),
      durationSec: parseInt(durRaw, 10) || 30,
      impressions: parseInt(impRaw, 10) || 0,
      rateValue: rateRaw === '' ? null : Number(rateRaw) || 0,
      creativeTitle: get(iTitle),
      isci: get(iIsci).toUpperCase(),
      _error: undefined,
    }
    if (!row.station) row._error = 'Missing station'
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.airDate)) row._error = `Bad date "${row.airDate}" (use YYYY-MM-DD)`
    rows.push(row)
  }
  return rows
}

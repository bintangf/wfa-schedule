import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isWeekend, format, addDays, startOfMonth, endOfMonth } from 'date-fns'

// Helper: get blocks and per-block pattern from ENV
function getBlocksAndPattern() {
  const blocks = (process.env.NEXT_PUBLIC_WFA_BLOCKS || 'A,B,C,D')
    .replace(/\"/g, '')
    .split(',')
    .map(b => b.trim())
    .filter(Boolean)
  let pattern: string[] = []
  try {
    pattern = JSON.parse(process.env.NEXT_PUBLIC_WFA_PER_BLOCK_PATTERN || '[]')
  } catch {
    pattern = []
  }
  if (!Array.isArray(pattern) || pattern.length === 0) {
    pattern = ['WFA', 'WFO', 'WFO', 'WFO']
  }
  return { blocks, pattern }
}

// Compute WFA schedule on-the-fly for a date range
async function computeWFASchedule(startDate: Date, endDate: Date) {
  const { blocks, pattern } = getBlocksAndPattern()
  const wfaStartDate = new Date(process.env.NEXT_PUBLIC_WFA_START_DATE || '2025-01-01')

  // Don't generate schedules before the WFA start date
  if (endDate < wfaStartDate) {
    return { schedules: [], holidays: [] }
  }

  // Adjust startDate to not go before WFA start date
  const actualStartDate = startDate < wfaStartDate ? wfaStartDate : startDate

  // Get holidays from database
  const holidays = await prisma.publicHoliday.findMany({
    where: {
      date: {
        gte: wfaStartDate,
        lte: endDate
      }
    }
  })

  const holidayDates = new Set(holidays.map(h => format(h.date, 'yyyy-MM-dd')))

  // Generate schedule for the requested range
  const schedules: Array<{
    id: string
    date: Date
    block: string
    status: string
    createdAt: Date
    updatedAt: Date
  }> = [];
  let currentDate = new Date(actualStartDate)
  
  // Hitung offset hari kerja dari wfaStartDate ke actualStartDate
  let dayIndex = 0
  if (actualStartDate > wfaStartDate) {
    let tempDate = new Date(wfaStartDate)
    while (tempDate < actualStartDate) {
      const dateStr = format(tempDate, 'yyyy-MM-dd')
      if (!isWeekend(tempDate) && !holidayDates.has(dateStr)) {
        dayIndex++
      }
      tempDate = addDays(tempDate, 1)
    }
  }

  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    
    // Only add working days (not weekend, not holiday)
    if (!isWeekend(currentDate) && !holidayDates.has(dateStr)) {
      // Circular shift pattern ke kanan sesuai hari kerja ke-x
      const shiftedPattern = pattern.slice(-dayIndex % pattern.length).concat(pattern.slice(0, -dayIndex % pattern.length))
      blocks.forEach((block, blockIdx) => {
        const status = shiftedPattern[blockIdx % shiftedPattern.length]
        if (status === 'WFA') {
          schedules.push({
            id: `${format(currentDate, 'yyyy-MM-dd')}-${block}`,
            date: new Date(currentDate),
            block,
            status,
            createdAt: new Date(currentDate),
            updatedAt: new Date(currentDate)
          })
        }
      })
      dayIndex++
    }
    
    currentDate = addDays(currentDate, 1)
  }

  const holidaysFiltered = holidays.filter((h: { date: Date }) => h.date >= startDate && h.date <= endDate)
  return { schedules, holidays: holidaysFiltered }
}

// GET /api/wfa-schedule - Get computed WFA schedule for a month or date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const monthStr = searchParams.get('month') // format: YYYY-MM
    const startDateParam = searchParams.get('startDate') // format: YYYY-MM-DD
    const endDateParam = searchParams.get('endDate') // format: YYYY-MM-DD
    
    let startDate: Date
    let endDate: Date
    
    if (startDateParam && endDateParam) {
      // Use provided date range (for extended calendar view)
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
    } else if (monthStr) {
      // Use month range (backward compatibility)
      const [year, month] = monthStr.split('-').map(Number)
      startDate = startOfMonth(new Date(year, month - 1))
      endDate = endOfMonth(new Date(year, month - 1))
    } else {
      return NextResponse.json(
        { error: 'Either month parameter (YYYY-MM) or startDate/endDate parameters (YYYY-MM-DD) required' },
        { status: 400 }
      )
    }

    // Compute schedule on-the-fly
    const result = await computeWFASchedule(startDate, endDate)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error computing WFA schedule:', error)
    return NextResponse.json(
      { error: 'Failed to compute WFA schedule' },
      { status: 500 }
    )
  }
}

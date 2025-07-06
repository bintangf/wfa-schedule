import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isWeekend, format, addDays, startOfMonth, endOfMonth } from 'date-fns'

// WFA Schedule Pattern: A -> B -> C -> D -> A (cycle)
const WFA_PATTERN = ['A', 'B', 'C', 'D']

// Compute WFA schedule on-the-fly for a date range
async function computeWFASchedule(startDate: Date, endDate: Date) {
  // Get WFA start date and pattern from ENV
  const wfaStartDate = new Date(process.env.NEXT_PUBLIC_WFA_START_DATE || '2025-01-01')
  const wfaStartPattern = process.env.NEXT_PUBLIC_WFA_START_PATTERN || 'A'
  const startPatternIndex = WFA_PATTERN.indexOf(wfaStartPattern)

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

  // If we start exactly at WFA start date, use the configured pattern
  let patternIndex = startPatternIndex
  
  // If we start after WFA start date, compute working days from WFA start to actual start
  if (actualStartDate > wfaStartDate) {
    let workingDayCount = 0
    let currentDate = new Date(wfaStartDate)

    while (currentDate < actualStartDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      
      // Count working days (not weekend, not holiday)
      if (!isWeekend(currentDate) && !holidayDates.has(dateStr)) {
        workingDayCount++
      }
      
      currentDate = addDays(currentDate, 1)
    }
    
    patternIndex = (startPatternIndex + workingDayCount) % WFA_PATTERN.length
  }

  // Generate schedule for the requested range
  const schedules = []
  let currentDate = new Date(actualStartDate)

  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    
    // Only add working days (not weekend, not holiday)
    if (!isWeekend(currentDate) && !holidayDates.has(dateStr)) {
      schedules.push({
        id: `${format(currentDate, 'yyyy-MM-dd')}-${WFA_PATTERN[patternIndex % WFA_PATTERN.length]}`,
        date: new Date(currentDate),
        schedule: WFA_PATTERN[patternIndex % WFA_PATTERN.length],
        createdAt: new Date(currentDate),
        updatedAt: new Date(currentDate)
      })
      patternIndex++
    }
    
    currentDate = addDays(currentDate, 1)
  }

  return { schedules, holidays: holidays.filter(h => h.date >= startDate && h.date <= endDate) }
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

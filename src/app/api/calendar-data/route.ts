import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isWeekend, format, addDays, startOfMonth, endOfMonth } from 'date-fns'

// Combined API endpoint to reduce round trips
// GET /api/calendar-data?month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const monthStr = searchParams.get('month')
    
    if (!monthStr) {
      return NextResponse.json(
        { error: 'Month parameter (YYYY-MM) required' },
        { status: 400 }
      )
    }

    const [year, month] = monthStr.split('-').map(Number)
    const startDate = startOfMonth(new Date(year, month - 1))
    const endDate = endOfMonth(new Date(year, month - 1))

    // Fetch all data in parallel
    const [scheduleResult, userLeaves] = await Promise.all([
      computeWFASchedule(startDate, endDate),
      prisma.userLeave.findMany({
        where: {
          OR: [
            {
              startDate: {
                gte: startDate,
                lte: endDate
              }
            },
            {
              endDate: {
                gte: startDate,
                lte: endDate
              }
            },
            {
              AND: [
                { startDate: { lte: startDate } },
                { endDate: { gte: endDate } }
              ]
            }
          ]
        },
        orderBy: { startDate: 'asc' }
      })
    ])

    return NextResponse.json({
      schedules: scheduleResult.schedules,
      holidays: scheduleResult.holidays,
      userLeaves,
      month: monthStr,
      cachedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching calendar data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    )
  }
}

// Helper function - move from wfa-schedule/route.ts
async function computeWFASchedule(startDate: Date, endDate: Date) {
  // Implementation here (copy from existing WFA schedule API)
  // ... existing computeWFASchedule code
  return { schedules: [], holidays: [] }
}

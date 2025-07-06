import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAdminSession } from '@/lib/auth-utils'
import { getClientIPv4 } from '@/lib/ip-utils'

// Fetch holidays from Indonesia's official API (Grei only)
async function fetchHolidaysFromAPI(year: number) {
  try {
    const response = await fetch(`https://grei.pythonanywhere.com/api/id_holiday/${year}-01-01/${year}-12-31`)
    if (response.ok) {
      const data = await response.json()
      // API returns object with date as key and name as value: {"2025-01-01": "Holiday Name"}
      if (data && typeof data === 'object') {
        const holidays = Object.entries(data).map(([dateStr, name]) => ({
          date: new Date(dateStr),
          name: name as string,
          description: name as string,
          isManual: false
        }))
        console.log(`Fetched ${holidays.length} holidays from grei.pythonanywhere`)
        return holidays
      }
    }
  } catch (error) {
    console.error('Error fetching from grei.pythonanywhere:', error)
  }
  
  return []
}

// GET /api/holidays - Get holidays for a year
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    
    // Check if we have holidays for this year in database
    const existingHolidays = await prisma.publicHoliday.findMany({
      where: {
        date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31)
        }
      },
      orderBy: { date: 'asc' }
    })
    
    // If we have data, return it
    if (existingHolidays.length > 0) {
      // Log public holiday fetch (read from DB)
      const ip = getClientIPv4(request)
      await prisma.adminLog.create({
        data: {
          action: 'FETCH_HOLIDAYS_PUBLIC',
          details: JSON.stringify({
            year,
            source: 'database',
            fetchedAt: new Date().toISOString(),
            count: existingHolidays.length
          }),
          localIP: ip
        }
      })
      return NextResponse.json(existingHolidays)
    }
    
    // Fetch from external API
    const holidaysFromAPI = await fetchHolidaysFromAPI(year)
    
    // Save to database
    const savedHolidays = []
    for (const holiday of holidaysFromAPI) {
      try {
        const saved = await prisma.publicHoliday.upsert({
          where: { date: holiday.date },
          update: {
            name: holiday.name,
            description: holiday.description
          },
          create: {
            date: holiday.date,
            name: holiday.name,
            description: holiday.description,
            isManual: holiday.isManual
          }
        })
        savedHolidays.push(saved)
      } catch (error) {
        console.error('Error saving holiday:', error)
      }
    }
    
    // Auto-regenerate WFA schedule for all affected months - REMOVED (now computed on-the-fly)
    console.log(`Saved ${savedHolidays.length} holidays for ${year} - WFA schedule will be computed on-the-fly`)
    
    // Log admin action for fetching holidays from external API (only if new holidays were saved)
    if (savedHolidays.length > 0) {
      const isAdmin = validateAdminSession(request)
      if (isAdmin) {
        const ip = getClientIPv4(request)
        await prisma.adminLog.create({
          data: {
            action: 'FETCH_HOLIDAYS',
            details: JSON.stringify({
              year,
              holidayCount: savedHolidays.length,
              source: 'grei.pythonanywhere.com',
              fetchedAt: new Date().toISOString()
            }),
            localIP: ip
          }
        })
      }
    }
    
    return NextResponse.json(savedHolidays)
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return NextResponse.json(
      { error: 'Failed to fetch holidays' },
      { status: 500 }
    )
  }
}

// POST /api/holidays - Add manual holiday (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Validate admin session
    if (!validateAdminSession(request)) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { date, name, description } = body
    
    if (!date || !name) {
      return NextResponse.json(
        { error: 'Date and name are required' },
        { status: 400 }
      )
    }
    
    // Get client IP (convert IPv6 to IPv4)
    const ip = getClientIPv4(request)
    
    const holiday = await prisma.publicHoliday.create({
      data: {
        date: new Date(date),
        name,
        description: description || name,
        isManual: true
      }
    })
    
    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'ADD_HOLIDAY',
        details: JSON.stringify({ date, name, description }),
        localIP: ip
      }
    })
    
    // Auto-regenerate WFA schedule for the affected month - REMOVED (now computed on-the-fly)
    console.log(`Holiday added for ${date} - WFA schedule will be computed on-the-fly`)
    
    return NextResponse.json(holiday, { status: 201 })
  } catch (error) {
    console.error('Error adding holiday:', error)
    return NextResponse.json(
      { error: 'Failed to add holiday' },
      { status: 500 }
    )
  }
}

// DELETE /api/holidays - Remove holiday (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Validate admin session
    if (!validateAdminSession(request)) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Holiday ID is required' },
        { status: 400 }
      )
    }
    
    // Get client IP (convert IPv6 to IPv4)
    const ip = getClientIPv4(request)
    
    const deletedHoliday = await prisma.publicHoliday.delete({
      where: { id }
    })
    
    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'REMOVE_HOLIDAY',
        details: JSON.stringify({ 
          id, 
          name: deletedHoliday.name, 
          date: deletedHoliday.date 
        }),
        localIP: ip
      }
    })
    
    // Auto-regenerate WFA schedule for the affected month - REMOVED (now computed on-the-fly)
    console.log(`Holiday deleted for ${deletedHoliday.date} - WFA schedule will be computed on-the-fly`)
    
    return NextResponse.json({ message: 'Holiday deleted successfully' })
  } catch (error) {
    console.error('Error deleting holiday:', error)
    return NextResponse.json(
      { error: 'Failed to delete holiday' },
      { status: 500 }
    )
  }
}

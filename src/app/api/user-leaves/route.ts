import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientIPv4 } from '@/lib/ip-utils'
import { validateAdminSession } from '@/lib/auth-utils'

// GET /api/user-leaves - Get user leaves for a month
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const monthStr = searchParams.get('month') // format: YYYY-MM
    const searchInitials = searchParams.get('initials') // search by initials
    
    const whereClause: Record<string, unknown> = {}
    
    if (monthStr) {
      const [year, month] = monthStr.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)
      
      whereClause.OR = [
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
    }
    
    if (searchInitials) {
      whereClause.initials = {
        contains: searchInitials.toUpperCase()
      }
    }
    
    const leaves = await prisma.userLeave.findMany({
      where: whereClause,
      orderBy: { startDate: 'asc' }
    })
    
    return NextResponse.json(leaves)
  } catch (error) {
    console.error('Error fetching user leaves:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user leaves' },
      { status: 500 }
    )
  }
}

// POST /api/user-leaves - Add user leave (cuti)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startDate, endDate, initials } = body

    if (!startDate || !initials) {
      return NextResponse.json(
        { error: 'Start date and initials are required' },
        { status: 400 }
      )
    }

    if (initials.length > 3) {
      return NextResponse.json(
        { error: 'Initials must be maximum 3 characters' },
        { status: 400 }
      )
    }

    // Parse dates
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : start
    
    if (end < start) {
      return NextResponse.json(
        { error: 'End date cannot be before start date' },
        { status: 400 }
      )
    }
    
    // Get client IPv4
    const clientIP = getClientIPv4(request)
    
    // Check for conflicts with existing leaves
    const existingLeaves = await prisma.userLeave.findMany({
      where: {
        initials: initials.toUpperCase(),
        OR: [
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: start } }
            ]
          }
        ]
      }
    })
    
    if (existingLeaves.length > 0) {
      const conflictRanges = existingLeaves.map(leave =>
        leave.startDate.getTime() === leave.endDate.getTime() 
          ? leave.startDate.toLocaleDateString()
          : `${leave.startDate.toLocaleDateString()} - ${leave.endDate.toLocaleDateString()}`
      )
      
      return NextResponse.json(
        { error: `Leave already exists for ${initials} on: ${conflictRanges.join(', ')}` },
        { status: 409 }
      )
    }
    
    // Create single leave entry with date range
    const leave = await prisma.userLeave.create({
      data: {
        startDate: start,
        endDate: end,
        initials: initials.toUpperCase(),
        localIP: clientIP
      }
    })

    const dateRange = start.getTime() === end.getTime() 
      ? start.toLocaleDateString()
      : `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`

    return NextResponse.json({
      message: 'Successfully created leave',
      leave,
      dateRange
    }, { status: 201 })
  } catch (error) {
    console.error('Error adding user leave:', error)
    return NextResponse.json(
      { error: 'Failed to add user leave' },
      { status: 500 }
    )
  }
}

// DELETE /api/user-leaves?id=xxx - Delete user leave (cuti)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Leave ID is required' },
        { status: 400 }
      )
    }
    
    // Validate admin session instead of URL parameter
    const isAdmin = validateAdminSession(request)
    
    // Get client IPv4
    const clientIP = getClientIPv4(request)
    
    // Find the leave first
    const leave = await prisma.userLeave.findUnique({
      where: { id }
    })
    
    if (!leave) {
      return NextResponse.json(
        { error: 'Leave not found' },
        { status: 404 }
      )
    }
    
    // Check if user can delete (same IP or admin)
    if (!isAdmin && leave.localIP !== clientIP) {
      return NextResponse.json(
        { error: 'You can only delete leaves created from your IP address' },
        { status: 403 }
      )
    }
    
    const deletedLeave = await prisma.userLeave.delete({
      where: { id }
    })
    
    return NextResponse.json({
      message: 'Leave deleted successfully',
      deletedLeave
    })
  } catch (error) {
    console.error('Error deleting user leave:', error)
    return NextResponse.json(
      { error: 'Failed to delete user leave' },
      { status: 500 }
    )
  }
}

// PUT /api/user-leaves?id=xxx - Update user leave (cuti)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Leave ID is required' },
        { status: 400 }
      )
    }

    // Validate admin session instead of URL parameter
    const isAdmin = validateAdminSession(request)

    const body = await request.json()
    const { startDate, endDate, initials } = body

    if (!startDate || !initials) {
      return NextResponse.json(
        { error: 'Start date and initials are required' },
        { status: 400 }
      )
    }

    if (initials.length > 3) {
      return NextResponse.json(
        { error: 'Initials must be maximum 3 characters' },
        { status: 400 }
      )
    }

    // Parse dates
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : start
    
    if (end < start) {
      return NextResponse.json(
        { error: 'End date cannot be before start date' },
        { status: 400 }
      )
    }

    // Get client IPv4
    const clientIP = getClientIPv4(request)
    
    // Find the existing leave
    const existingLeave = await prisma.userLeave.findUnique({
      where: { id }
    })
    
    if (!existingLeave) {
      return NextResponse.json(
        { error: 'Leave not found' },
        { status: 404 }
      )
    }
    
    // Check if user can edit (same IP or admin)
    if (!isAdmin && existingLeave.localIP !== clientIP) {
      return NextResponse.json(
        { error: 'You can only edit leaves created from your IP address' },
        { status: 403 }
      )
    }

    // Check for conflicts with other leaves (excluding current one)
    const conflictingLeaves = await prisma.userLeave.findMany({
      where: {
        id: { not: id },
        initials: initials.toUpperCase(),
        OR: [
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: start } }
            ]
          }
        ]
      }
    })
    
    if (conflictingLeaves.length > 0) {
      const conflictRanges = conflictingLeaves.map(leave =>
        leave.startDate.getTime() === leave.endDate.getTime() 
          ? leave.startDate.toLocaleDateString()
          : `${leave.startDate.toLocaleDateString()} - ${leave.endDate.toLocaleDateString()}`
      )
      
      return NextResponse.json(
        { error: `Leave conflicts with existing leave(s) for ${initials} on: ${conflictRanges.join(', ')}` },
        { status: 409 }
      )
    }

    // Update the leave
    const updatedLeave = await prisma.userLeave.update({
      where: { id },
      data: {
        startDate: start,
        endDate: end,
        initials: initials.toUpperCase(),
        localIP: clientIP
      }
    })

    const dateRange = start.getTime() === end.getTime() 
      ? start.toLocaleDateString()
      : `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`

    return NextResponse.json({
      message: 'Leave updated successfully',
      leave: updatedLeave,
      dateRange
    })
  } catch (error) {
    console.error('Error updating user leave:', error)
    return NextResponse.json(
      { error: 'Failed to update user leave' },
      { status: 500 }
    )
  }
}

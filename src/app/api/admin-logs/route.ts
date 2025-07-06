import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAdminSession } from '@/lib/auth-utils'

// GET /api/admin-logs - Get admin action logs (Admin only)
export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    if (!validateAdminSession(request)) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') // Filter by action type
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereClause: Record<string, unknown> = {}
    
    if (action) {
      whereClause.action = action
    }

    const logs = await prisma.adminLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    const total = await prisma.adminLog.count({
      where: whereClause
    })

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
      hasMore: total > offset + limit
    })

  } catch (error) {
    console.error('Error fetching admin logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin logs' },
      { status: 500 }
    )
  }
}

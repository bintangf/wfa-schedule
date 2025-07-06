import { NextRequest, NextResponse } from 'next/server'
import { getClientIPv4 } from '@/lib/ip-utils'

// GET /api/user-ip - Get current user's IP address
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIPv4(request)
    
    return NextResponse.json({ ip: clientIP })
  } catch (error) {
    console.error('Error getting user IP:', error)
    return NextResponse.json(
      { error: 'Failed to get user IP' },
      { status: 500 }
    )
  }
}

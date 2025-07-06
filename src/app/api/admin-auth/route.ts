import { NextRequest, NextResponse } from 'next/server'
import { generateAdminSession } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    const adminPassword = process.env.ADMIN_PASSWORD
    
    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin password not configured' },
        { status: 500 }
      )
    }

    const isValid = password === adminPassword
    
    if (isValid) {
      const sessionToken = generateAdminSession()
      const response = NextResponse.json({ 
        isValid: true,
        message: 'Authentication successful'
      })
      
      // Set httpOnly cookie for security
      response.cookies.set('admin-session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 // 24 hours
      })
      
      return response
    } else {
      return NextResponse.json({ 
        isValid: false,
        message: 'Invalid password'
      })
    }
    
  } catch (error) {
    console.error('Admin auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin-auth - Logout admin
export async function DELETE() {
  try {
    const response = NextResponse.json({ 
      message: 'Logged out successfully' 
    })
    
    // Clear the admin session cookie
    response.cookies.set('admin-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0 // Expire immediately
    })
    
    return response
  } catch (error) {
    console.error('Admin logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}

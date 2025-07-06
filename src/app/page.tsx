'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { isWeekend, format } from 'date-fns'
import { WFACalendarGrid } from '@/components/WFACalendarGrid'
import { ThemeToggle } from '@/components/ThemeToggle'
import { UserLeaveDialog } from '@/components/UserLeaveDialog'
import { AdminPanel } from '@/components/AdminPanel'
import { LeaveSearch, LeaveSearchRef } from '@/components/LeaveSearch'
import { AdminPasswordDialog } from '@/components/AdminPasswordDialog'
import { Button } from '@/components/ui/button'
import { useWFAStore } from '@/lib/store'
import { Settings, UserPlus } from 'lucide-react'
import { apiCache } from '@/lib/cache'

interface UserLeave {
  id: string
  initials: string
  startDate: string
  endDate: string
  creatorIP: string
}

export default function WFAHomePage() {
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false)
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false)
  const [isAdminPasswordDialogOpen, setIsAdminPasswordDialogOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<UserLeave[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingLeave, setEditingLeave] = useState<{ id: string, initials: string, startDate: Date, endDate: Date } | null>(null)
  
  const leaveSearchRef = useRef<LeaveSearchRef>(null)
  
  const { 
    selectedDate, 
    isLoading, 
    isAdminMode, 
    setAdminAuthenticated,
    exitAdminMode,
    getLeavesForDate,
    getHolidayForDate,
    setUserIP,
    setSelectedDate,
    setCurrentMonth
  } = useWFAStore()

  // Fetch user IP on component mount
  useEffect(() => {
    const fetchUserIP = async () => {
      try {
        const response = await fetch('/api/user-ip')
        if (response.ok) {
          const data = await response.json()
          setUserIP(data.ip)
        }
      } catch (error) {
        console.error('Failed to fetch user IP:', error)
      }
    }
    
    fetchUserIP()
  }, [setUserIP])

  const todayLeaves = getLeavesForDate(new Date())
  const selectedDateLeaves = getLeavesForDate(selectedDate)
  const todayHoliday = getHolidayForDate(new Date())
  const selectedDateHoliday = getHolidayForDate(selectedDate)

  const handleDataRefresh = async () => {
    // Clear cache to force fresh data fetch
    apiCache.clear()
    console.log('Cache cleared for data refresh')
    
    // Instead of full page reload, just refresh the current month data
    const { setLoading, currentMonth } = useWFAStore.getState()
    setLoading(true)
    
    // Re-fetch WFA data for current month
    try {
      const response = await fetch(`/api/wfa-schedule?month=${currentMonth}`)
      if (response.ok) {
        const data = await response.json()
        
        const { setSchedules, setHolidays } = useWFAStore.getState()
        
        const parsedSchedules = data.schedules.map((schedule: { id: string, date: string, schedule: string, createdAt: string, updatedAt: string }) => ({
          ...schedule,
          date: new Date(schedule.date),
          createdAt: new Date(schedule.createdAt),
          updatedAt: new Date(schedule.updatedAt)
        }))
        
        const parsedHolidays = data.holidays.map((holiday: { id: string, date: string, name: string, description?: string, isManual: boolean, createdAt: string, updatedAt: string }) => ({
          ...holiday,
          date: new Date(holiday.date),
          createdAt: new Date(holiday.createdAt),
          updatedAt: new Date(holiday.updatedAt)
        }))
        
        setSchedules(parsedSchedules)
        setHolidays(parsedHolidays)
      }
      
      // Also refresh user leaves
      const leavesResponse = await fetch('/api/user-leaves')
      if (leavesResponse.ok) {
        const leavesData = await leavesResponse.json()
        const { setUserLeaves } = useWFAStore.getState()
        
        const parsedLeaves = leavesData.map((leave: { id: string, startDate: string, endDate: string, initials: string, localIP: string, createdAt: string, updatedAt: string }) => ({
          ...leave,
          // Normalize dates to local timezone to avoid UTC comparison issues
          startDate: new Date(new Date(leave.startDate).getFullYear(), new Date(leave.startDate).getMonth(), new Date(leave.startDate).getDate()),
          endDate: new Date(new Date(leave.endDate).getFullYear(), new Date(leave.endDate).getMonth(), new Date(leave.endDate).getDate()),
          createdAt: new Date(leave.createdAt),
          updatedAt: new Date(leave.updatedAt)
        }))
        
        setUserLeaves(parsedLeaves)
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = useCallback(async (initials: string) => {
    setIsSearching(true)
    setSearchQuery(initials)
    try {
      const response = await fetch(`/api/user-leaves?initials=${encodeURIComponent(initials)}`)
      if (response.ok) {
        const results = await response.json()
        setSearchResults(results)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchResults([])
    setSearchQuery('')
  }, [])

  const handleEditLeave = (leave: { id: string, initials: string, startDate: Date, endDate: Date }) => {
    setEditingLeave(leave)
    setIsLeaveDialogOpen(true)
  }

  const handleJumpToDate = (date: Date) => {
    // Set the selected date first
    setSelectedDate(date)
    
    // Update current month to match the selected date
    const monthStr = format(date, 'yyyy-MM')
    setCurrentMonth(monthStr)
    
    // Clear search input and results after jumping
    leaveSearchRef.current?.clearSearch()
    handleClearSearch()
  }

  const handleAdminModeToggle = () => {
    if (isAdminMode) {
      // Exit admin mode
      exitAdminMode()
    } else {
      // Request admin mode (show password dialog)
      setIsAdminPasswordDialogOpen(true)
    }
  }

  const handleAdminAuthenticated = () => {
    setAdminAuthenticated(true)
    setIsAdminPasswordDialogOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              🏢 WFA Schedule Manager
            </h1>
            <p className="text-muted-foreground">
              Team Work From Anywhere (WFA) scheduling with A, B, C, D rotation
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* User Leave Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLeaveDialogOpen(true)}
              disabled={isWeekend(selectedDate)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Leave
            </Button>
            
            {/* Admin Toggle */}
            <Button
              variant={isAdminMode ? "default" : "outline"}
              size="sm"
              onClick={handleAdminModeToggle}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isAdminMode ? "Admin" : "User"}
            </Button>
            
            {/* Admin Panel */}
            {isAdminMode && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAdminPanelOpen(true)}
              >
                Manage Holidays
              </Button>
            )}
            
            <ThemeToggle />
          </div>
        </div>

        {/* Main Content: Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Top Loading Bar - Fixed to top of page */}
          {isLoading && (
            <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 dark:bg-gray-700">
              <div className="h-full bg-blue-500 animate-pulse origin-left transform transition-transform duration-300 w-full"></div>
            </div>
          )}
          
          {/* Left Column: Calendar (3/4 width) */}
          <div className="lg:col-span-3">
            <WFACalendarGrid onEditLeave={handleEditLeave} />
          </div>

          {/* Right Column: Info & Controls (1/4 width) */}
          <div className="space-y-4">
            {/* Search */}
            <LeaveSearch 
              ref={leaveSearchRef}
              onSearch={handleSearch} 
              onClear={handleClearSearch}
              isLoading={isSearching}
            />

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-card p-4 rounded-lg border shadow-sm">
                <h3 className="font-semibold mb-3 text-card-foreground">
                  Search Results for &quot;{searchQuery}&quot;:
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((leave: UserLeave) => {
                    const startDate = new Date(leave.startDate)
                    const endDate = new Date(leave.endDate)
                    const isRange = startDate.getTime() !== endDate.getTime()
                    
                    return (
                      <div 
                        key={leave.id}
                        onClick={() => handleJumpToDate(startDate)}
                        className="flex justify-between items-center p-3 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer group"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{leave.initials}</span>
                          <span className="text-xs text-muted-foreground">
                            Click to jump to date
                          </span>
                        </div>
                        <div className="text-sm text-right">
                          <div className="text-foreground">
                            {startDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: startDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
                            })}
                            {isRange && (
                              <span>
                                {' - '}
                                {endDate.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: endDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
                                })}
                              </span>
                            )}
                          </div>
                          {isRange && (
                            <div className="text-xs text-muted-foreground">
                              {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Today's Status */}
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                📊 Today&apos;s Status
              </h3>
              {todayHoliday ? (
                <p className="text-sm text-red-600 dark:text-red-300 mb-1">
                  🏖️ Holiday: {todayHoliday.name}
                </p>
              ) : null}
              <p className="text-sm text-blue-600 dark:text-blue-300">
                {todayLeaves.length > 0 
                  ? `${todayLeaves.length} person(s) on leave: ${todayLeaves.map(l => l.initials).join(', ')}`
                  : 'No leaves today'
                }
              </p>
            </div>

            {/* Selected Date Holiday Info */}
            {selectedDateHoliday && (
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                  🏖️ Holiday on {selectedDate.toLocaleDateString()}:
                </h3>
                <div className="text-sm text-red-600 dark:text-red-300">
                  <div className="font-medium">{selectedDateHoliday.name}</div>
                  {selectedDateHoliday.description && (
                    <div className="text-xs mt-1 opacity-80">{selectedDateHoliday.description}</div>
                  )}
                  <div className="text-xs mt-1 opacity-70">
                    {selectedDateHoliday.isManual ? 'Manual Holiday' : 'Public Holiday'}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Date Info */}
            {selectedDateLeaves.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                  Leaves on {selectedDate.toLocaleDateString()}:
                </h3>
                <div className="space-y-1">
                  {selectedDateLeaves.map((leave) => (
                    <div 
                      key={leave.id}
                      className="text-sm text-orange-600 dark:text-orange-300"
                    >
                      {leave.initials}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekend Warning */}
            {isWeekend(selectedDate) && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  ⚠️ Weekend selected. Leaves can span weekends but won&apos;t affect work schedule.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <UserLeaveDialog
          open={isLeaveDialogOpen}
          onOpenChange={(open) => {
            setIsLeaveDialogOpen(open)
            if (!open) {
              setEditingLeave(null) // Clear editing leave when dialog closes
            }
          }}
          selectedDate={selectedDate}
          onLeaveSaved={handleDataRefresh}
          editingLeave={editingLeave}
        />

        <AdminPanel
          open={isAdminPanelOpen}
          onOpenChange={setIsAdminPanelOpen}
          onDataRefresh={handleDataRefresh}
          selectedDate={selectedDate}
        />

        <AdminPasswordDialog
          open={isAdminPasswordDialogOpen}
          onOpenChange={setIsAdminPasswordDialogOpen}
          onAuthenticated={handleAdminAuthenticated}
        />
      </div>
    </div>
  )
}

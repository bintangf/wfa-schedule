'use client'

import { useState, useEffect } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isWeekend,
  startOfWeek,
  endOfWeek,
  isToday
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useWFAStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface ScheduleResponse {
  id: string
  date: string
  schedule: string
  createdAt: string
  updatedAt: string
}

interface HolidayResponse {
  id: string
  date: string
  name: string
  description?: string
  isManual: boolean
  createdAt: string
  updatedAt: string
}

interface LeaveResponse {
  id: string
  startDate: string
  endDate: string
  initials: string
  reason?: string
  localIP: string
  createdAt: string
  updatedAt: string
}

const WFA_COLORS = {
  A: '#3b82f6', // Blue
  B: '#10b981', // Green
  C: '#f59e0b', // Yellow
  D: '#ef4444'  // Red
}

interface WFACalendarGridProps {
  onEditLeave?: (leave: { id: string, initials: string, startDate: Date, endDate: Date }) => void
}

export function WFACalendarGrid({ onEditLeave }: WFACalendarGridProps) {
  const [currentMonth, setCurrentMonthState] = useState(new Date())
  
  const { 
    selectedDate,
    setSelectedDate,
    currentMonth: storeCurrentMonth,
    setCurrentMonth,
    setSchedules,
    setHolidays,
    setUserLeaves,
    isLoading,
    setLoading,
    getScheduleForDate,
    getHolidayForDate,
    getLeavesForDate,
    canEditLeave
  } = useWFAStore()

  useEffect(() => {
    const monthStr = format(currentMonth, 'yyyy-MM')
    fetchWFAData(monthStr)
  }, [currentMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state with store when store changes (from search jump only)
  useEffect(() => {
    if (storeCurrentMonth) {
      const storeDate = new Date(storeCurrentMonth + '-01')
      const storeMonthStr = format(storeDate, 'yyyy-MM')
      const localMonthStr = format(currentMonth, 'yyyy-MM')
      
      // Only update if store month is different AND it's not the current month we just set
      if (localMonthStr !== storeMonthStr) {
        setCurrentMonthState(storeDate)
      }
    }
  }, [storeCurrentMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchWFAData = async (month: string) => {
    try {
      setLoading(true)
      
      // Calculate the full calendar view date range (including cross-month dates)
      const monthStart = startOfMonth(new Date(month + '-01'))
      const monthEnd = endOfMonth(new Date(month + '-01'))
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
      
      const startDateStr = format(calendarStart, 'yyyy-MM-dd')
      const endDateStr = format(calendarEnd, 'yyyy-MM-dd')
      
      // Fetch WFA schedules and user leaves in parallel for faster loading
      const [scheduleResponse, userLeavesResponse] = await Promise.all([
        fetch(`/api/wfa-schedule?month=${month}&startDate=${startDateStr}&endDate=${endDateStr}`),
        fetch(`/api/user-leaves?month=${month}`)
      ])
      
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json()
        
        const parsedSchedules = scheduleData.schedules.map((schedule: ScheduleResponse) => ({
          ...schedule,
          date: new Date(schedule.date),
          createdAt: new Date(schedule.createdAt),
          updatedAt: new Date(schedule.updatedAt)
        }))
        
        const parsedHolidays = scheduleData.holidays.map((holiday: HolidayResponse) => ({
          ...holiday,
          date: new Date(holiday.date),
          createdAt: new Date(holiday.createdAt),
          updatedAt: new Date(holiday.updatedAt)
        }))
        
        setSchedules(parsedSchedules)
        setHolidays(parsedHolidays)
      }
      
      if (userLeavesResponse.ok) {
        const leavesData = await userLeavesResponse.json()
        const parsedLeaves = leavesData.map((leave: LeaveResponse) => ({
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
      console.error('Failed to fetch WFA data:', error)
    } finally {
      setLoading(false)
    }
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  
  // Get the calendar grid including previous/next month dates to fill weeks
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday = 0
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonthState(today)
    setSelectedDate(today)
    // Update store for consistency
    const monthStr = format(today, 'yyyy-MM')
    setCurrentMonth(monthStr)
  }

  const nextMonth = () => {
    const newMonth = addMonths(currentMonth, 1)
    setCurrentMonthState(newMonth)
    // Update store for consistency
    const monthStr = format(newMonth, 'yyyy-MM')
    setCurrentMonth(monthStr)
  }
  
  const prevMonth = () => {
    const newMonth = subMonths(currentMonth, 1)
    
    // Don't allow navigation before WFA start date
    const wfaStartDate = new Date(process.env.NEXT_PUBLIC_WFA_START_DATE || '2025-01-01')
    if (newMonth < startOfMonth(wfaStartDate)) {
      return // Don't navigate if it's before WFA start
    }
    
    setCurrentMonthState(newMonth)
    // Update store for consistency
    const monthStr = format(newMonth, 'yyyy-MM')
    setCurrentMonth(monthStr)
  }

  // Check if prev button should be disabled
  const isPrevDisabled = () => {
    const wfaStartDate = new Date(process.env.NEXT_PUBLIC_WFA_START_DATE || '2025-01-01')
    const prevMonthDate = subMonths(currentMonth, 1)
    return prevMonthDate < startOfMonth(wfaStartDate)
  }

  const handleEditLeave = (leave: { id: string, initials: string, startDate: Date, endDate: Date }) => {
    if (onEditLeave) {
      onEditLeave(leave)
    }
  }

  const renderDayContent = (date: Date) => {
    const schedule = getScheduleForDate(date)
    const holiday = getHolidayForDate(date)
    const leaves = getLeavesForDate(date)
    const isWeekendDay = isWeekend(date)
    const isToday = isSameDay(date, new Date())
    
    return (
      <div className="w-full h-full flex flex-col">
        {/* Date number */}
        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            "text-sm font-medium",
            isToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs"
          )}>
            {format(date, 'd')}
          </span>
          
          {/* WFA Schedule Badge */}
          {schedule && !holiday && !isWeekendDay && (
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: WFA_COLORS[schedule.schedule as keyof typeof WFA_COLORS] }}
            >
              {schedule.schedule}
            </div>
          )}
        </div>
        
        {/* Holiday indicator */}
        {holiday && (
          <div className="text-xs bg-red-500 text-white px-1 py-0.5 rounded mb-1 truncate">
            {holiday.name}
          </div>
        )}
        
        {/* User leaves - click to edit */}
        {leaves.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {leaves.slice(0, 3).map((leave) => {
              const canEdit = canEditLeave(leave)
              
              return (
                <span 
                  key={leave.id}
                  className="text-xs bg-orange-500 text-white px-1 py-0.5 rounded cursor-pointer hover:bg-orange-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (canEdit) {
                      handleEditLeave(leave)
                    }
                  }}
                  title={canEdit ? "Click to edit leave" : "Cannot edit (different IP)"}
                >
                  {leave.initials}
                </span>
              )
            })}
            {leaves.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{leaves.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top Loading Bar - Fixed to top of page */}
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm animate-pulse origin-left w-full"></div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={prevMonth}
            disabled={isPrevDisabled()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date) => {
          const isSelected = isSameDay(date, selectedDate)
          const isCurrentMonth = isSameMonth(date, currentMonth)
          const isTodayDate = isToday(date)
          const isWeekendDay = isWeekend(date)

          return (
            <Card
              key={date.toISOString()}
              className={cn(
                "min-h-[100px] p-2 cursor-pointer transition-all duration-200 hover:shadow-md",
                isSelected && "ring-2 ring-primary",
                !isCurrentMonth && "opacity-30 bg-muted/20",
                isTodayDate && "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700",
                isWeekendDay && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
              )}
              onClick={() => handleDateClick(date)}
            >
              {renderDayContent(date)}
            </Card>
          )
        })}
      </div>

    </div>
  )
}

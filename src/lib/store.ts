import { create } from 'zustand'

// WFA Schedule Types
export interface WFASchedule {
  id: string
  date: Date
  block: string
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface PublicHoliday {
  id: string
  date: Date
  name: string
  description?: string
  isManual: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UserLeave {
  id: string
  startDate: Date
  endDate: Date
  initials: string
  localIP: string
  createdAt: Date
  updatedAt: Date
}

interface WFAStore {
  // State
  schedules: WFASchedule[]
  holidays: PublicHoliday[]
  userLeaves: UserLeave[]
  selectedDate: Date
  currentMonth: string // YYYY-MM format
  isLoading: boolean
  isDarkMode: boolean
  isAdminMode: boolean
  isAdminAuthenticated: boolean
  userIP: string | null
  
  // Actions
  setSchedules: (schedules: WFASchedule[] | ((prev: WFASchedule[]) => WFASchedule[])) => void
  setHolidays: (holidays: PublicHoliday[]) => void
  setUserLeaves: (leaves: UserLeave[]) => void
  addUserLeave: (leave: UserLeave) => void
  removeUserLeave: (id: string) => void
  updateUserLeave: (id: string, leave: Partial<UserLeave>) => void
  setSelectedDate: (date: Date) => void
  setCurrentMonth: (month: string) => void
  setLoading: (loading: boolean) => void
  toggleDarkMode: () => void
  requestAdminMode: () => void
  setAdminAuthenticated: (authenticated: boolean) => void
  exitAdminMode: () => void
  setUserIP: (ip: string) => void
  canEditLeave: (leave: UserLeave) => boolean
  getLeaveRange: (leave: UserLeave) => UserLeave[]
  
  // Computed
  getScheduleForDate: (date: Date) => WFASchedule | null
  getHolidayForDate: (date: Date) => PublicHoliday | null
  getLeavesForDate: (date: Date) => UserLeave[]
  isWorkingDay: (date: Date) => boolean
}

export const useWFAStore = create<WFAStore>((set, get) => ({
  // Initial state
  schedules: [],
  holidays: [],
  userLeaves: [],
  selectedDate: new Date(),
  currentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
  isLoading: false,
  isDarkMode: true,
  isAdminMode: false,
  isAdminAuthenticated: false,
  userIP: null,
  
  // Actions
  setSchedules: (updaterOrSchedules: WFASchedule[] | ((prev: WFASchedule[]) => WFASchedule[])) => set((state) => {
    if (typeof updaterOrSchedules === 'function') {
      return { schedules: (updaterOrSchedules as (prev: WFASchedule[]) => WFASchedule[])(state.schedules) }
    } else {
      return { schedules: updaterOrSchedules }
    }
  }),
  
  setHolidays: (holidays) => set({ holidays }),
  
  setUserLeaves: (userLeaves) => set({ userLeaves }),
  
  addUserLeave: (leave) => set((state) => ({ 
    userLeaves: [...state.userLeaves, leave] 
  })),
  
  removeUserLeave: (id) => set((state) => ({
    userLeaves: state.userLeaves.filter(leave => leave.id !== id)
  })),
  
  updateUserLeave: (id, updatedLeave) => set((state) => ({
    userLeaves: state.userLeaves.map(leave => 
      leave.id === id ? { ...leave, ...updatedLeave } : leave
    )
  })),
  
  setSelectedDate: (date) => set({ selectedDate: date }),
  
  setCurrentMonth: (month) => set({ currentMonth: month }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  
  requestAdminMode: () => {
    // This will be handled by the component to show password dialog
    // Don't set isAdminMode here, wait for authentication
  },
  
  setAdminAuthenticated: (authenticated) => set({ 
    isAdminAuthenticated: authenticated,
    isAdminMode: authenticated 
  }),
  
  exitAdminMode: () => {
    // Call logout API to clear session cookie
    fetch('/api/admin-auth', { method: 'DELETE' })
      .catch(console.error) // Fire and forget
    
    set({ 
      isAdminMode: false, 
      isAdminAuthenticated: false 
    })
  },
  
  setUserIP: (ip) => set({ userIP: ip }),
  
  canEditLeave: (leave) => {
    const { isAdminMode, userIP } = get()
    return isAdminMode || (userIP !== null && leave.localIP === userIP)
  },
  
  getLeaveRange: (leave) => {
    const { userLeaves } = get()
    // Find the same leave entry (with date range support, each leave is already a range)
    return userLeaves.filter(l => 
      l.initials === leave.initials && 
      l.localIP === leave.localIP &&
      Math.abs(l.startDate.getTime() - leave.startDate.getTime()) <= 24 * 60 * 60 * 1000 // Same or next day
    ).sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  },
  
  // Computed functions
  getScheduleForDate: (date) => {
    const { schedules } = get()
    return schedules.find(schedule => 
      schedule.date.toDateString() === date.toDateString()
    ) || null
  },
  
  getHolidayForDate: (date) => {
    const { holidays } = get()
    return holidays.find(holiday => 
      holiday.date.toDateString() === date.toDateString()
    ) || null
  },
  
  getLeavesForDate: (date) => {
    const { userLeaves } = get()
    return userLeaves.filter(leave => {
      const targetTime = date.getTime()
      const startTime = leave.startDate.getTime()
      const endTime = leave.endDate.getTime()
      return targetTime >= startTime && targetTime <= endTime
    })
  },
  
  isWorkingDay: (date) => {
    const { getHolidayForDate } = get()
    const dayOfWeek = date.getDay()
    
    // Check if weekend (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false
    }
    
    // Check if holiday
    if (getHolidayForDate(date)) {
      return false
    }
    
    return true
  }
}))

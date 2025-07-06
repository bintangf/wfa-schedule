'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Shield, Plus, Trash2, RefreshCw, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useWFAStore } from '@/lib/store'
import { AdminLogsViewer } from '@/components/AdminLogsViewer'

interface AdminPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDataRefresh: () => void
  selectedDate?: Date
}

export function AdminPanel({ open, onOpenChange, onDataRefresh, selectedDate }: AdminPanelProps) {
  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayName, setNewHolidayName] = useState('')
  const [newHolidayDesc, setNewHolidayDesc] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAdminLogs, setShowAdminLogs] = useState(false)

  const { holidays } = useWFAStore()
  
  // Pre-fill date when dialog opens with selected date
  useEffect(() => {
    if (open && selectedDate) {
      setNewHolidayDate(format(selectedDate, 'yyyy-MM-dd'))
    }
  }, [open, selectedDate])

  // Fetch holidays from external API
  const fetchHolidaysFromAPI = async () => {
    setIsRefreshing(true)
    try {
      const year = new Date().getFullYear()
      const response = await fetch(`/api/holidays?year=${year}`)
      
      if (response.ok) {
        onDataRefresh()
        alert('✅ Holidays updated from external API!')
      } else {
        alert('❌ Failed to fetch holidays from API')
      }
    } catch (error) {
      console.error('Error fetching holidays:', error)
      alert('❌ Error fetching holidays from API')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Add manual holiday
  const addManualHoliday = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newHolidayDate || !newHolidayName) {
      alert('Date and name are required')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newHolidayDate,
          name: newHolidayName,
          description: newHolidayDesc
        }),
      })

      if (response.ok) {
        setNewHolidayDate('')
        setNewHolidayName('')
        setNewHolidayDesc('')
        onDataRefresh()
        alert('✅ Holiday added successfully!')
      } else {
        const error = await response.json()
        alert(`❌ ${error.error}`)
      }
    } catch (error) {
      console.error('Error adding holiday:', error)
      alert('❌ Failed to add holiday')
    } finally {
      setIsLoading(false)
    }
  }

  // Delete holiday
  const deleteHoliday = async (holidayId: string, holidayName: string) => {
    if (!confirm(`Are you sure you want to delete "${holidayName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/holidays?id=${holidayId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onDataRefresh()
        alert('✅ Holiday deleted successfully!')
      } else {
        alert('❌ Failed to delete holiday')
      }
    } catch (error) {
      console.error('Error deleting holiday:', error)
      alert('❌ Failed to delete holiday')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Panel - Holiday Management
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Fetch from API */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🌐 Fetch from External API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Get official Indonesia holidays from external API
              </p>
              <Button 
                onClick={fetchHolidaysFromAPI}
                disabled={isRefreshing}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Fetching...' : 'Fetch Holidays from API'}
              </Button>
            </CardContent>
          </Card>

          {/* Add Manual Holiday */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">➕ Add Manual Holiday</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addManualHoliday} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Holiday Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Company Event"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Optional description"
                    value={newHolidayDesc}
                    onChange={(e) => setNewHolidayDesc(e.target.value)}
                  />
                </div>
                
                <Button type="submit" disabled={isLoading} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {isLoading ? 'Adding...' : 'Add Holiday'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Current Holidays */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📅 Current Holidays</CardTitle>
            </CardHeader>
            <CardContent>
              {holidays.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No holidays found. Fetch from API or add manually.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {holidays.map((holiday) => (
                    <div 
                      key={holiday.id} 
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium">{holiday.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(holiday.date, 'MMM d, yyyy')} 
                          {holiday.isManual && ' (Manual)'}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteHoliday(holiday.id, holiday.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Activity Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📋 Admin Activity Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                View all administrative actions including leave management and holiday changes
              </p>
              <Button 
                onClick={() => setShowAdminLogs(true)}
                variant="outline"
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Admin Logs
              </Button>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
        
        {/* Admin Logs Viewer */}
        <AdminLogsViewer 
          open={showAdminLogs} 
          onOpenChange={setShowAdminLogs} 
        />
        
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p>🔐 Admin actions are logged with your local IP for security.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

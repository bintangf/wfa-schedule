'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar, User, Edit3 } from 'lucide-react'
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
import { useWFAStore } from '@/lib/store'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'

interface UserLeaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  onLeaveSaved: () => void
  editingLeave?: { id: string, initials: string, startDate: Date, endDate: Date } | null
}

export function UserLeaveDialog({ open, onOpenChange, selectedDate, onLeaveSaved, editingLeave: propEditingLeave }: UserLeaveDialogProps) {
  const [initials, setInitials] = useState('')
  const [startDate, setStartDate] = useState(format(selectedDate, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(selectedDate, 'yyyy-MM-dd'))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingLeave, setEditingLeave] = useState<{ id: string, initials: string, startDate: Date, endDate: Date } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [leaveToDelete, setLeaveToDelete] = useState<{ id: string, initials: string, startDate: Date, endDate: Date } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { getLeavesForDate, removeUserLeave, isAdminMode, canEditLeave } = useWFAStore()
  
  // Get leaves for the selected date
  const leavesForDate = getLeavesForDate(selectedDate)
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStartDate(format(selectedDate, 'yyyy-MM-dd'))
      setEndDate(format(selectedDate, 'yyyy-MM-dd'))
      setInitials('')
      setError('')
      
      // If editing leave is passed from parent, set it up
      if (propEditingLeave) {
        setEditingLeave(propEditingLeave)
        setInitials(propEditingLeave.initials)
        setStartDate(format(propEditingLeave.startDate, 'yyyy-MM-dd'))
        setEndDate(format(propEditingLeave.endDate, 'yyyy-MM-dd'))
      } else {
        setEditingLeave(null)
      }
    }
  }, [open, selectedDate, propEditingLeave])

  const handleEdit = (leave: { id: string, initials: string, startDate: Date, endDate: Date }) => {
    setEditingLeave(leave)
    setInitials(leave.initials)
    setStartDate(format(leave.startDate, 'yyyy-MM-dd'))
    setEndDate(format(leave.endDate, 'yyyy-MM-dd'))
  }
  
  const handleDelete = async (leaveId: string) => {
    if (!leaveToDelete) return
    
    try {
      setIsDeleting(true)
      // Remove admin parameter - backend will check session cookie
      const response = await fetch(`/api/user-leaves?id=${leaveId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        removeUserLeave(leaveId)
        onLeaveSaved()
        // Close both delete dialog and main dialog
        setDeleteDialogOpen(false)
        setLeaveToDelete(null)
        onOpenChange(false) // Close the main edit dialog
      } else {
        const data = await response.json()
        console.error(`Failed to delete: ${data.error}`)
      }
    } catch (err) {
      console.error('Failed to delete leave:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteClick = (leave: { id: string, initials: string, startDate: Date, endDate: Date }) => {
    setLeaveToDelete(leave)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!initials.trim()) {
      setError('Initials are required')
      return
    }
    
    if (initials.length > 3) {
      setError('Initials must be maximum 3 characters')
      return
    }

    if (!startDate) {
      setError('Start date is required')
      return
    }

    setIsLoading(true)
    
    try {
      // Remove admin parameter - backend will check session cookie
      const url = editingLeave 
        ? `/api/user-leaves?id=${editingLeave.id}` 
        : '/api/user-leaves'
      const method = editingLeave ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate: endDate || startDate, // If no end date, use start date (single day)
          initials: initials.trim().toUpperCase(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save leave')
      }

      onLeaveSaved()
      onOpenChange(false)
      
      // Reset form
      setInitials('')
      setStartDate(format(selectedDate, 'yyyy-MM-dd'))
      setEndDate(format(selectedDate, 'yyyy-MM-dd'))
      setEditingLeave(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save leave')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    setInitials('')
    setStartDate(format(selectedDate, 'yyyy-MM-dd'))
    setEndDate(format(selectedDate, 'yyyy-MM-dd'))
    setEditingLeave(null)
    // Also close delete dialog if open
    setDeleteDialogOpen(false)
    setLeaveToDelete(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {editingLeave ? 'Edit' : 'Add'} Leave Request - {format(selectedDate, 'MMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>
        
        {/* Show existing leaves for this date */}
        {leavesForDate.length > 0 && !editingLeave && (
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <h4 className="font-medium text-sm">Existing leaves for this date:</h4>
            {leavesForDate.map((leave) => {
              const canEdit = canEditLeave(leave)
              return (
                <div key={leave.id} className="flex items-center justify-between p-2 bg-background rounded border">
                  <div className="flex flex-col">
                    <span className="font-medium">{leave.initials}</span>
                    <span className="text-xs text-muted-foreground">
                      {leave.startDate.getTime() === leave.endDate.getTime() 
                        ? format(leave.startDate, 'MMM d, yyyy')
                        : `${format(leave.startDate, 'MMM d')} - ${format(leave.endDate, 'MMM d, yyyy')}`
                      }
                    </span>
                    {!canEdit && (
                      <span className="text-xs text-muted-foreground">
                        {isAdminMode ? 'Different IP' : 'Cannot edit (different IP)'}
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(leave)}
                        title="Edit leave"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="initials">Initials (max 3 characters)</Label>
            <Input
              id="initials"
              type="text"
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              placeholder="e.g., JD"
              maxLength={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate} // End date cannot be before start date
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 inline mr-1" />
            Leave request will include weekends between dates (if any)
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}
        </form>

        <DialogFooter className="flex justify-between items-center gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          
          <div className="flex gap-2">
            {editingLeave && (
              <Button 
                variant="destructive" 
                onClick={() => handleDeleteClick(editingLeave)}
                disabled={isLoading}
                title="Delete this leave"
              >
                Delete
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Saving...' : editingLeave ? 'Update Leave' : 'Save Leave'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        leave={leaveToDelete}
        onConfirmDelete={() => leaveToDelete && handleDelete(leaveToDelete.id)}
        isDeleting={isDeleting}
      />
    </Dialog>
  )
}

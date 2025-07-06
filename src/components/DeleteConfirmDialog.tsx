'use client'

import { format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leave: {
    id: string
    initials: string
    startDate: Date
    endDate: Date
  } | null
  onConfirmDelete: () => void
  isDeleting?: boolean
}

export function DeleteConfirmDialog({ 
  open, 
  onOpenChange, 
  leave, 
  onConfirmDelete, 
  isDeleting = false 
}: DeleteConfirmDialogProps) {
  if (!leave) return null

  const isMultiDay = leave.startDate.getTime() !== leave.endDate.getTime()
  const dateDisplay = isMultiDay
    ? `${format(leave.startDate, 'MMM d')} - ${format(leave.endDate, 'MMM d, yyyy')}`
    : format(leave.startDate, 'MMM d, yyyy')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Leave Request
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Are you sure you want to delete this leave request? This action cannot be undone.
          </p>
          
          <div className="bg-muted p-3 rounded-lg">
            <div className="font-medium text-sm mb-1">Leave Details:</div>
            <div className="text-sm">
              <span className="font-medium">{leave.initials}</span> - {dateDisplay}
            </div>
            {isMultiDay && (
              <div className="text-xs text-muted-foreground mt-1">
                This will delete the entire {Math.ceil((leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1}-day leave period
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Leave'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

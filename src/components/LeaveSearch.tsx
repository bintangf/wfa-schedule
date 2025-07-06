'use client'

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface LeaveSearchProps {
  onSearch: (initials: string) => void
  onClear: () => void
  isLoading?: boolean
}

export interface LeaveSearchRef {
  clearSearch: () => void
}

export const LeaveSearch = forwardRef<LeaveSearchRef, LeaveSearchProps>(({ onSearch, onClear, isLoading }, ref) => {
  const [searchTerm, setSearchTerm] = useState('')

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        onSearch(searchTerm.trim())
      } else {
        onClear()
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [searchTerm]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = () => {
    setSearchTerm('')
    onClear()
  }

  // Expose clearSearch function via ref
  useImperativeHandle(ref, () => ({
    clearSearch: handleClear
  }))

  return (
    <Card className="p-4">
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search leaves by initials... (auto-search after 500ms)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            className="pl-10"
            maxLength={3}
          />
        </div>
        <Button 
          variant="outline" 
          onClick={handleClear}
          size="sm"
          disabled={!searchTerm}
        >
          <X className="h-4 w-4" />
        </Button>
        {isLoading && (
          <div className="text-sm text-muted-foreground">
            Searching...
          </div>
        )}
      </div>
    </Card>
  )
})

LeaveSearch.displayName = 'LeaveSearch'

'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Eye, Calendar, User, Clock } from 'lucide-react'

interface AdminLog {
  id: string
  action: string
  details: string
  localIP: string
  createdAt: string
}

interface AdminLogsViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminLogsViewer({ open, onOpenChange }: AdminLogsViewerProps) {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<string>('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const url = filter 
        ? `/api/admin-logs?action=${encodeURIComponent(filter)}&limit=100`
        : '/api/admin-logs?limit=100'
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs.map((log: AdminLog & { createdAt: string | Date }) => ({
          ...log,
          createdAt: new Date(log.createdAt).toISOString()
        })))
      } else {
        console.error('Failed to fetch admin logs')
      }
    } catch (error) {
      console.error('Error fetching admin logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    if (open) {
      fetchLogs()
    }
  }, [open, fetchLogs])

  const getActionColor = (action: string) => {
    switch (action) {
      case 'ADD_USER_LEAVE': return 'bg-green-500'
      case 'UPDATE_USER_LEAVE': return 'bg-blue-500'
      case 'DELETE_USER_LEAVE': return 'bg-red-500'
      case 'ADD_HOLIDAY': return 'bg-purple-500'
      case 'REMOVE_HOLIDAY': return 'bg-orange-500'
      case 'FETCH_HOLIDAYS': return 'bg-indigo-500'
      case 'ADMIN_LOGIN': return 'bg-emerald-500'
      case 'ADMIN_LOGOUT': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ADD_USER_LEAVE':
      case 'UPDATE_USER_LEAVE':
      case 'DELETE_USER_LEAVE':
        return <User className="h-3 w-3" />
      case 'ADD_HOLIDAY':
      case 'REMOVE_HOLIDAY':
      case 'FETCH_HOLIDAYS':
        return <Calendar className="h-3 w-3" />
      case 'ADMIN_LOGIN':
      case 'ADMIN_LOGOUT':
        return <Eye className="h-3 w-3" />
      default:
        return <Eye className="h-3 w-3" />
    }
  }

  const formatActionName = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const parseDetails = (details: string) => {
    try {
      return JSON.parse(details)
    } catch {
      return { error: 'Invalid JSON', raw: details }
    }
  }

  const renderDetails = (details: string) => {
    const parsed = parseDetails(details)
    
    if (parsed.error) {
      return <span className="text-red-500 text-sm">{parsed.raw}</span>
    }

    return (
      <div className="space-y-2 text-sm">
        {Object.entries(parsed).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="font-medium text-gray-600 capitalize">
              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
            </span>
            <span className="text-gray-900 max-w-xs truncate">
              {typeof value === 'string' ? value : JSON.stringify(value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const actionTypes = [
    '',
    'ADD_USER_LEAVE',
    'UPDATE_USER_LEAVE', 
    'DELETE_USER_LEAVE',
    'ADD_HOLIDAY',
    'REMOVE_HOLIDAY',
    'FETCH_HOLIDAYS',
    'ADMIN_LOGIN',
    'ADMIN_LOGOUT'
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Admin Activity Logs
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters and Refresh */}
          <div className="flex gap-3 items-center">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Actions</option>
              {actionTypes.slice(1).map(action => (
                <option key={action} value={action}>
                  {formatActionName(action)}
                </option>
              ))}
            </select>
            
            <Button 
              onClick={fetchLogs}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {/* Logs List */}
          <ScrollArea className="h-[500px] w-full">
            <div className="space-y-3">
              {logs.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    {isLoading ? 'Loading admin logs...' : 'No admin logs found'}
                  </CardContent>
                </Card>
              ) : (
                logs.map((log) => (
                  <Card key={log.id} className="transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={`${getActionColor(log.action)} text-white flex items-center gap-1`}>
                            {getActionIcon(log.action)}
                            {formatActionName(log.action)}
                          </Badge>
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.createdAt), 'PPp')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          IP: {log.localIP}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="text-sm"
                        >
                          {expandedLog === log.id ? 'Hide Details' : 'Show Details'}
                        </Button>
                        
                        {expandedLog === log.id && (
                          <div className="bg-gray-50 p-3 rounded-md">
                            {renderDetails(log.details)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWFAStore } from '@/lib/store'
import { useEffect } from 'react'

export function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useWFAStore()

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleDarkMode}
      className="w-9 h-9"
    >
      {isDarkMode ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}

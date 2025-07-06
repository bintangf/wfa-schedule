// Example implementation with SWR for better caching
// npm install swr

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Custom hook for WFA data with caching
export function useWFAData(month: string) {
  const { data: scheduleData, error: scheduleError } = useSWR(
    `/api/wfa-schedule?month=${month}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
      staleTime: 300000
    }
  )

  const { data: leavesData, error: leavesError } = useSWR(
    `/api/user-leaves?month=${month}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute (more frequent for leaves)
      staleTime: 60000
    }
  )

  return {
    scheduleData,
    leavesData,
    isLoading: !scheduleData || !leavesData,
    error: scheduleError || leavesError
  }
}

// Usage in component:
// const { scheduleData, leavesData, isLoading } = useWFAData(monthStr)

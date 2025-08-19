'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // البيانات تعتبر حديثة لمدة دقيقة
            refetchOnWindowFocus: false, // لا تعيد تحميل البيانات عند التركيز على النافذة
            retry: 1, // محاولة واحدة إضافية عند الفشل
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
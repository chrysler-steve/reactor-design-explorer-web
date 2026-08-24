import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { RouteLoading } from '@/components/RouteLoading'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    // Every child below is code-split; without this the router renders nothing
    // while the first chunk loads.
    HydrateFallback: RouteLoading,
    children: [
      {
        index: true,
        lazy: async () => {
          const { HomePage } = await import('@/pages/HomePage')
          return { Component: HomePage }
        },
      },
      {
        path: 'batch',
        lazy: async () => {
          const { BatchPage } = await import('@/pages/BatchPage')
          return { Component: BatchPage }
        },
      },
      {
        path: 'cstr',
        lazy: async () => {
          const { CSTRPage } = await import('@/pages/CSTRPage')
          return { Component: CSTRPage }
        },
      },
      {
        path: 'pfr',
        lazy: async () => {
          const { PFRPage } = await import('@/pages/PFRPage')
          return { Component: PFRPage }
        },
      },
      {
        path: 'compare',
        lazy: async () => {
          const { ComparePage } = await import('@/pages/ComparePage')
          return { Component: ComparePage }
        },
      },
    ],
  },
])

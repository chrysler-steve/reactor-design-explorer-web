import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { HomePage } from '@/pages/HomePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
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

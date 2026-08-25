import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { RouteLoading } from '@/components/RouteLoading'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    // Every child below is code-split; without this the router renders nothing
    // while the first chunk loads.
    HydrateFallback: RouteLoading,
    // Replaces react-router's built-in "Unexpected Application Error!" screen,
    // which talks to the developer rather than the visitor. Rendered without
    // the layout, since a failure in the layout itself is one of the cases
    // this has to survive.
    errorElement: <NotFoundPage />,
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
      // Unmatched URLs render inside the layout, so the nav is still there to
      // get out with. Vercel serves these with a real 404 status.
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

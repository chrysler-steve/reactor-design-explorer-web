import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useParamsStore } from '@/store/paramsStore'
import { decodeParams, SHARE_QUERY_KEY } from '@/lib/shareConfig'

/** On first load, hydrates the param store from a `?p=` share link if present
 * and valid, then strips the query param so the URL doesn't linger stale once
 * the user starts tweaking values. A bad/tampered link is silently ignored —
 * the app just falls back to defaults, same as no link at all. */
export function useSyncParamsFromUrl() {
  const [searchParams, setSearchParams] = useSearchParams()
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true

    const encoded = searchParams.get(SHARE_QUERY_KEY)
    if (!encoded) return

    const decoded = decodeParams(encoded)
    if (decoded) useParamsStore.getState().reset(decoded)

    const next = new URLSearchParams(searchParams)
    next.delete(SHARE_QUERY_KEY)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])
}

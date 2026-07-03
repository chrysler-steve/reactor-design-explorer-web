import { describe, it, expect } from 'vitest'
import { encodeParams, decodeParams, buildShareUrl, SHARE_QUERY_KEY } from './shareConfig'
import { defaultParams } from './rxKinetics'

describe('shareConfig', () => {
  it('round-trips a full RxParams object through encode/decode', () => {
    const params = defaultParams()
    params.species = ['Ethylene', 'B', 'C', 'D']
    params.C0s = [0.2, 0.1, 0, 0]

    const decoded = decodeParams(encodeParams(params))
    expect(decoded).toEqual(params)
  })

  it('returns null for malformed input rather than throwing', () => {
    expect(decodeParams('not-valid-base64!!!')).toBeNull()
    expect(decodeParams(btoa(encodeURIComponent(JSON.stringify({ foo: 'bar' }))))).toBeNull()
  })

  it('builds a share URL with the encoded params under the expected query key', () => {
    const params = defaultParams()
    const url = new URL(buildShareUrl(params))
    const encoded = url.searchParams.get(SHARE_QUERY_KEY)
    expect(encoded).not.toBeNull()
    expect(decodeParams(encoded!)).toEqual(params)
  })
})

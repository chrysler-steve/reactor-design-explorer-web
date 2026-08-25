/**
 * Rasterises public/favicon.svg into the PNG icons iOS and Android need:
 * apple-touch-icon.png (iOS home screen) and icon-192/512.png (web manifest).
 * iOS ignores SVG for apple-touch-icon, so a PNG is the only option.
 *
 * Hand-rolled rather than pulled from a dependency: the artwork is one stroked
 * path on a solid ground, and adding a native image toolchain to a pure-JS
 * build for three static files that change ~never is a bad trade. Run manually
 * and commit the output — this is not part of `npm run build`.
 *
 *   node scripts/generate-icons.mjs
 *
 * The path below mirrors public/favicon.svg in its 48x48 viewBox. If the
 * favicon artwork changes, update these coordinates and re-run.
 */

import { deflateSync } from 'node:zlib'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const BG = [0x12, 0x18, 0x1f] // #12181F
const FG = [0xe0, 0x8a, 0x4f] // #E08A4F
const VIEW = 48
const STROKE_W = 4.5

// M8 32 H16 C21 32 22 12 27 12 C32 12 33 26 40 26
const SEGMENTS = [
  { type: 'line', p: [[8, 32], [16, 32]] },
  { type: 'cubic', p: [[16, 32], [21, 32], [22, 12], [27, 12]] },
  { type: 'cubic', p: [[27, 12], [32, 12], [33, 26], [40, 26]] },
]

/** Dense point samples along the path; the stroke is then a distance field
 *  around them, which gives round caps and joins for free. */
function samplePath(perSegment = 600) {
  const pts = []
  for (const seg of SEGMENTS) {
    for (let i = 0; i <= perSegment; i++) {
      const t = i / perSegment
      if (seg.type === 'line') {
        const [[x0, y0], [x1, y1]] = seg.p
        pts.push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
      } else {
        const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = seg.p
        const u = 1 - t
        const a = u * u * u
        const b = 3 * u * u * t
        const c = 3 * u * t * t
        const d = t * t * t
        pts.push(a * x0 + b * x1 + c * x2 + d * x3, a * y0 + b * y1 + c * y2 + d * y3)
      }
    }
  }
  return Float64Array.from(pts)
}

function renderRGB(size, samples) {
  const scale = size / VIEW
  const half = (STROKE_W / 2) * scale
  const px = new Uint8Array(size * size * 3)
  const n = samples.length / 2
  // Path bounding box in device pixels, padded by the stroke, so most pixels
  // skip the inner loop entirely.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (let i = 0; i < n; i++) {
    const x = samples[i * 2] * scale
    const y = samples[i * 2 + 1] * scale
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const pad = half + 2
  minX -= pad; maxX += pad; minY -= pad; maxY += pad

  for (let y = 0; y < size; y++) {
    const cy = y + 0.5
    for (let x = 0; x < size; x++) {
      const cx = x + 0.5
      const o = (y * size + x) * 3
      let coverage = 0
      if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
        let best = Infinity
        for (let i = 0; i < n; i++) {
          const dx = cx - samples[i * 2] * scale
          const dy = cy - samples[i * 2 + 1] * scale
          const d = dx * dx + dy * dy
          if (d < best) best = d
        }
        // Linear coverage ramp across one pixel gives clean antialiased edges.
        coverage = Math.min(1, Math.max(0, half + 0.5 - Math.sqrt(best)))
      }
      for (let c = 0; c < 3; c++) {
        px[o + c] = Math.round(BG[c] + (FG[c] - BG[c]) * coverage)
      }
    }
  }
  return px
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG(size, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour RGB
  // 10..12 = compression, filter, interlace — all 0

  // Scanlines with filter byte 0 (None); the artwork is small and mostly flat,
  // so deflate handles it well without per-line filtering.
  const stride = size * 3
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    Buffer.from(rgb.buffer, rgb.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    )
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const publicDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public',
)
const samples = samplePath()

for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]) {
  const png = encodePNG(size, renderRGB(size, samples))
  await writeFile(path.join(publicDir, name), png)
  console.log(`${name.padEnd(22)} ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`)
}

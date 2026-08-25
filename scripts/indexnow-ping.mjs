/**
 * Tells Bing (and the other IndexNow participants — Yandex, Seznam, Naver)
 * that this site's pages have changed, instead of waiting to be crawled.
 *
 * Bing does not run JavaScript reliably, indexes new sites slowly, and is
 * cautious about free hosting subdomains. IndexNow is the one lever that
 * shortcuts the queue, and it costs a single HTTP request.
 *
 * Ownership is proved by hosting a file named after the key at the site root
 * containing exactly the key — public/<key>.txt, already committed. The key is
 * self-chosen; it is not a secret and needs no account to create.
 *
 * Run after a deploy has gone live (pinging URLs that still serve the old build
 * just gets the old build indexed):
 *
 *   node scripts/indexnow-ping.mjs
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const KEY = '22cf3df9a9e4a17be9072c6cf3608565'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { siteUrl, routes } = JSON.parse(
  await readFile(path.join(root, 'src/lib/pageMeta.data.json'), 'utf8'),
)

const host = new URL(siteUrl).host
const urlList = Object.keys(routes).map((r) => siteUrl + r)

const res = await fetch('https://api.indexnow.org/IndexNow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host,
    key: KEY,
    keyLocation: `${siteUrl}/${KEY}.txt`,
    urlList,
  }),
})

// 200 = accepted, 202 = accepted but key still being validated. Both are fine.
if (res.ok) {
  console.log(`IndexNow ${res.status}: submitted ${urlList.length} URLs for ${host}`)
} else {
  console.error(`IndexNow ${res.status}: ${await res.text()}`)
  process.exitCode = 1
}

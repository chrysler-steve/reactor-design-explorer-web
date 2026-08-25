/**
 * Post-build step: turn the single SPA shell into one real HTML file per route.
 *
 * Vite emits exactly one dist/index.html, and Vercel used to rewrite every path
 * to it. That meant /batch, /cstr, /pfr and /compare were served byte-identical
 * HTML with the same <title> and a 51-byte body. usePageMeta fixes that in the
 * browser, but only for crawlers that execute JavaScript — Google does, Bing
 * largely does not, and neither do the social-card scrapers. So Bing saw five
 * indistinguishable empty pages and had nothing to rank.
 *
 * This script rewrites the head per route (title, description, canonical,
 * og:*) and injects an indexable <noscript> summary, so the served HTML says
 * what the page is before any JS runs. <noscript> rather than visible markup
 * because React clears #root on mount — visible fallback content would flash
 * and then vanish.
 *
 * Run automatically by `npm run build`.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { CONTENT, NAV } from './seo-content.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

const data = JSON.parse(await readFile(path.join(root, 'src/lib/pageMeta.data.json'), 'utf8'))
const { siteName, siteUrl, routes, notFound } = data

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Replace the content="" of a meta tag matched by attribute, across newlines. */
function setMeta(html, attr, name, value) {
  const re = new RegExp(`(<meta\\s+[^>]*${attr}="${name}"[^>]*content=")[^"]*(")`, 's')
  if (re.test(html)) return html.replace(re, `$1${escapeHtml(value)}$2`)
  // Vite reformats the multi-line tags in index.html onto one line, but don't
  // silently no-op if that ever changes.
  const reSplit = new RegExp(`(<meta\\s+${attr}="${name}"\\s+content=")[^"]*(")`, 's')
  if (reSplit.test(html)) return html.replace(reSplit, `$1${escapeHtml(value)}$2`)
  throw new Error(`prerender: could not find <meta ${attr}="${name}"> to update`)
}

/** JSON-LD identifying the app as one entity, so Bing has something to attach the brand term to. */
function structuredData() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: siteName,
        description: routes['/'].description,
      },
      {
        '@type': 'WebApplication',
        '@id': `${siteUrl}/#app`,
        url: `${siteUrl}/`,
        name: siteName,
        description: routes['/'].description,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Any (web browser)',
        browserRequirements: 'Requires JavaScript and WebGL',
        isAccessibleForFree: true,
        license: 'https://opensource.org/licenses/MIT',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: [
          'Batch reactor simulation',
          'CSTR (continuous stirred-tank reactor) simulation',
          'PFR (plug-flow reactor) simulation',
          'Side-by-side reactor comparison',
          'Custom multi-species reaction and rate law',
          'Arrhenius temperature dependence',
          'Live 3D reactor visualisation',
        ],
      },
    ],
  })
}

/**
 * Plain-HTML summary of the page for crawlers that never run the app.
 *
 * Lives inside #root rather than in a <noscript>: Bing's page analyser parses
 * the raw HTML but does not count markup inside <noscript>, so an <h1> in there
 * still reported as "H1 tag missing". React clears #root on mount, so this
 * vanishes the moment the app starts; it is hidden until then, so there is no
 * flash. With JavaScript off the app never runs, and the <noscript> stylesheet
 * in index.html unhides this as the visible page.
 */
function seoFallback(routePath) {
  const c = CONTENT[routePath]
  const paragraphs = c.body.map((p) => `        <p>${escapeHtml(p)}</p>`).join('\n')
  const links = NAV.filter((n) => n.path !== routePath)
    .map((n) => `<li><a href="${n.path}">${escapeHtml(n.label)}</a></li>`)
    .join('')
  return `<div id="seo-fallback">
      <article>
        <h1>${escapeHtml(routes[routePath].h1)}</h1>
${paragraphs}
        <p><strong>This simulator needs JavaScript and WebGL to run.</strong> Enable JavaScript to use the interactive charts and 3D reactor views.</p>
        <nav aria-label="Reactor pages"><ul>${links}</ul></nav>
      </article>
    </div>`
}

function buildPage(shell, routePath) {
  const meta = routes[routePath]
  const canonical = siteUrl + routePath
  let html = shell

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
  html = setMeta(html, 'name', 'description', meta.description)
  html = setMeta(html, 'property', 'og:title', meta.title)
  html = setMeta(html, 'property', 'og:description', meta.description)
  html = setMeta(html, 'property', 'og:url', canonical)
  html = setMeta(html, 'name', 'twitter:title', meta.title)
  html = setMeta(html, 'name', 'twitter:description', meta.description)

  // Canonical is per-route, so it cannot live in the source index.html.
  html = html.replace('</head>', `  <link rel="canonical" href="${canonical}" />\n  </head>`)

  // One entity description for the site, on the page that represents it.
  if (routePath === '/') {
    html = html.replace(
      '</head>',
      `  <script type="application/ld+json">${structuredData()}</script>\n  </head>`,
    )
  }

  html = html.replace('<div id="root"></div>', `<div id="root">${seoFallback(routePath)}</div>`)
  return html
}

/**
 * Unknown paths get a real 404 now that the catch-all rewrite is gone; Vercel
 * serves dist/404.html for them automatically. Built from the shell rather than
 * from a route so it carries no canonical and no JSON-LD — it is not a page we
 * want represented in an index.
 */
function buildNotFound(shell) {
  let html = shell
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(notFound.title)}</title>`)
  html = setMeta(html, 'name', 'description', notFound.description)
  html = html.replace('<head>', '<head>\n    <meta name="robots" content="noindex" />')
  const links = NAV.map((n) => `<li><a href="${n.path}">${escapeHtml(n.label)}</a></li>`).join('')
  const block = `<div id="seo-fallback">
      <h1>Page not found</h1>
      <p>That page does not exist. Try one of these:</p>
      <nav aria-label="Reactor pages"><ul>${links}</ul></nav>
    </div>`
  return html.replace('<div id="root"></div>', `<div id="root">${block}</div>`)
}

const shell = await readFile(path.join(dist, 'index.html'), 'utf8')
const written = []

for (const routePath of Object.keys(routes)) {
  const html = buildPage(shell, routePath)
  const outFile =
    routePath === '/'
      ? path.join(dist, 'index.html')
      : path.join(dist, routePath.slice(1), 'index.html')
  await mkdir(path.dirname(outFile), { recursive: true })
  await writeFile(outFile, html, 'utf8')
  written.push(path.relative(dist, outFile).replace(/\\/g, '/'))
}

await writeFile(path.join(dist, '404.html'), buildNotFound(shell), 'utf8')
written.push('404.html')

console.log(`prerendered ${written.length} pages: ${written.join(', ')}`)

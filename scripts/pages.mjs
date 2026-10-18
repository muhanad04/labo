import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

// Build in isolation first. Only generator-owned files under docs/ are replaced.
for (const args of [
  ['scripts/notices.mjs'],
  ['node_modules/typescript/bin/tsc', '-b'],
  ['node_modules/vite/bin/vite.js', 'build'],
]) {
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: { ...process.env, LABO_PAGES: '1' },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
const output = path.resolve('dist-pages/labo'),
  html = readFileSync(path.join(output, 'index.html'), 'utf8')
if (html.includes('/src/') || !html.includes('/labo/assets/'))
  throw new Error('Pages build has incorrect source/asset paths.')
for (const match of html.matchAll(/(?:src|href)="(\/labo\/[^"?#]+)"/g)) {
  if (!existsSync(path.join(output, match[1].slice('/labo/'.length))))
    throw new Error(`Missing built asset: ${match[1]}`)
}
mkdirSync('docs', { recursive: true })
rmSync('docs/assets', { recursive: true, force: true })
for (const entry of readdirSync(output))
  cpSync(path.join(output, entry), path.join('docs', entry), { recursive: true })
writeFileSync('docs/.nojekyll', '')
console.log('Pages ready: main branch → /docs. Source documentation preserved.')

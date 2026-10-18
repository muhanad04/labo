import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// Preserve the installed packages' actual license text, not just SPDX labels.
const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'))
const sections = [
  'labo third-party notices\nGenerated from the installed lockfile by scripts/notices.mjs.\nThese licenses cover third-party materials, not the original labo application.\n',
]
for (const [path, pkg] of Object.entries(lock.packages)) {
  if (!path || pkg.dev) continue
  const name = path.split('node_modules/').at(-1)
  let license
  for (const filename of ['LICENSE', 'LICENSE.txt', 'LICENSE.md', 'license', 'license.md']) {
    try {
      license = await readFile(join(path, filename), 'utf8')
      break
    } catch (e) {
      if (e.code !== 'ENOENT') throw e
    }
  }
  if (!license) throw new Error(`No license text found for ${name}; review before distribution.`)
  sections.push(
    `\n${'='.repeat(72)}\n${name} ${pkg.version} (${pkg.license ?? 'see text'})\n${'='.repeat(72)}\n\n${license}\n`,
  )
}
await mkdir('public', { recursive: true })
await writeFile('public/THIRD_PARTY_NOTICES.txt', sections.join('\n'))
console.log(`Wrote license notices for ${sections.length - 1} production/peer packages.`)

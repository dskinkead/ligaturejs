import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ligature-consumer-'))
try {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', temp], { cwd: root, encoding: 'utf8' }))[0]
  const packageFile = path.join(temp, packed.filename)
  fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ type: 'module', dependencies: { ligaturejs: packageFile } }))
  execFileSync('npm', ['install', '--ignore-scripts', '--no-package-lock', '--no-audit', '--no-fund'], { cwd: temp, stdio: 'ignore' })
  const probe = "import { defineComponent, createComponentRegistry } from 'ligaturejs'; const c=defineComponent({name:'consumer',render:()=>'<p>ok</p>'}); if(!createComponentRegistry().register(c).render('consumer').includes('<p>ok</p>')) throw new Error('consumer render failed')"
  execFileSync(process.execPath, ['--input-type=module', '-e', probe], { cwd: temp, stdio: 'pipe' })
  console.log(`Package consumer check passed: ${packed.filename}`)
} finally { fs.rmSync(temp, { recursive: true, force: true }) }

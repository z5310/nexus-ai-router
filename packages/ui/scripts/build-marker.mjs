import { mkdirSync, writeFileSync } from 'node:fs'

mkdirSync(new URL('../dist/', import.meta.url), { recursive: true })
writeFileSync(new URL('../dist/.build', import.meta.url), '')

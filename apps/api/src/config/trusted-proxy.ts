import { isIP } from 'node:net'

export function parseTrustedProxyCidrs(value: string | undefined): false | string[] {
  const entries = value?.split(',').map((entry) => entry.trim()).filter(Boolean) ?? []
  if (!entries.length) return false
  for (const entry of entries) {
    const [address, prefix, ...rest] = entry.split('/')
    const family = isIP(address)
    const maxPrefix = family === 4 ? 32 : family === 6 ? 128 : 0
    const parsedPrefix = prefix === undefined ? maxPrefix : Number(prefix)
    if (rest.length || !family || !Number.isInteger(parsedPrefix) || parsedPrefix < 0 || parsedPrefix > maxPrefix) {
      throw new Error(`Invalid trusted proxy CIDR: ${entry}`)
    }
  }
  return entries
}

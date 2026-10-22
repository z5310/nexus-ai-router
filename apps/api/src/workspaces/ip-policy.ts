import { BlockList, isIP } from 'node:net'

export function parseNetwork(value: string) {
  const [address, mask, ...extra] = value.split('/')
  const version = isIP(address)
  if (!version || extra.length || (mask !== undefined && !/^\d+$/.test(mask))) throw new Error('Invalid IP network')
  const prefix = mask === undefined ? (version === 4 ? 32 : 128) : Number(mask)
  if (prefix < 0 || prefix > (version === 4 ? 32 : 128)) throw new Error('Invalid IP prefix')
  return { address, prefix, type: version === 4 ? 'ipv4' as const : 'ipv6' as const }
}

export function allowsIp(networks: string[], address: string): boolean {
  const version = isIP(address)
  if (!version) return false
  const list = new BlockList()
  for (const network of networks) {
    const parsed = parseNetwork(network)
    list.addSubnet(parsed.address, parsed.prefix, parsed.type)
  }
  return list.check(address, version === 4 ? 'ipv4' : 'ipv6')
}

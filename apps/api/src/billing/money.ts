import { BadRequestException } from '@nestjs/common'

// Values cross the interface as decimal strings; never round a money input silently.
export function toMicros(value: string): bigint {
  if (typeof value !== 'string' || !/^\d{1,12}(\.\d{1,6})?$/.test(value)) throw new BadRequestException('金额必须为非负 CNY 字符串，最多六位小数')
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'))
}

export function fromMicros(value: bigint | string): string {
  const number = BigInt(value)
  const absolute = number < 0n ? -number : number
  return `${number < 0n ? '-' : ''}${absolute / 1_000_000n}.${String(absolute % 1_000_000n).padStart(6, '0')}`
}

import type { RequestPriceSnapshot } from '@gateway/contracts'

/** Round once to the log's six-decimal CNY precision, using integer arithmetic. */
export function chatSnapshotCost(inputTokens: number, outputTokens: number, snapshot: RequestPriceSnapshot): number {
  return Number(chatSnapshotMicros(inputTokens, outputTokens, snapshot)) / 1_000_000
}

export function chatSnapshotMicros(inputTokens: number, outputTokens: number, snapshot: RequestPriceSnapshot): bigint {
  if (snapshot.priceUnit !== 'million_tokens') throw new Error('Chat 模型必须使用 Token 计价')
  const units = (value: string) => {
    if (!/^\d+(\.\d{1,4})?$/.test(value)) throw new Error('价格精度无效')
    const [whole, fraction = ''] = value.split('.')
    return BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, '0'))
  }
  if (![inputTokens, outputTokens].every((value) => Number.isSafeInteger(value) && value >= 0)) throw new Error('Token 用量无效')
  const total = BigInt(inputTokens) * units(snapshot.inputPrice) + BigInt(outputTokens) * units(snapshot.outputPrice ?? '0')
  return (total + 5_000n) / 10_000n
}

import { Injectable } from '@nestjs/common'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex')
    const value = await scrypt(password, salt, 64) as Buffer
    return `scrypt$${salt}$${value.toString('hex')}`
  }

  async verify(password: string, encoded: string): Promise<boolean> {
    const [algorithm, salt, stored] = encoded.split('$')
    if (algorithm !== 'scrypt' || !salt || !stored) return false
    const value = await scrypt(password, salt, 64) as Buffer
    const expected = Buffer.from(stored, 'hex')
    return expected.length === value.length && timingSafeEqual(expected, value)
  }
}

import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

export interface EncryptedCredential {
  encryptedSecret: string
  iv: string
  authTag: string
  keyVersion: string
}

@Injectable()
export class CredentialCipherService {
  constructor(private readonly config: ConfigService) {}

  encrypt(secret: string, context: { id: string; provider: string; environment: string }): EncryptedCredential {
    const keyVersion = this.config.get<string>('ENCRYPTION_KEY_VERSION', 'local-v1')
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv)
    cipher.setAAD(Buffer.from(this.aad(context, keyVersion)))
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
    return {
      encryptedSecret: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      keyVersion,
    }
  }

  decrypt(record: EncryptedCredential, context: { id: string; provider: string; environment: string }): string {
    const activeVersion = this.config.get<string>('ENCRYPTION_KEY_VERSION', 'local-v1')
    if (record.keyVersion !== activeVersion) throw new ServiceUnavailableException('供应商凭证密钥版本不可用')
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(record.iv, 'base64'))
      decipher.setAAD(Buffer.from(this.aad(context, record.keyVersion)))
      decipher.setAuthTag(Buffer.from(record.authTag, 'base64'))
      return Buffer.concat([
        decipher.update(Buffer.from(record.encryptedSecret, 'base64')),
        decipher.final(),
      ]).toString('utf8')
    } catch {
      throw new ServiceUnavailableException('供应商凭证无法解密')
    }
  }

  private key(): Buffer {
    const configured = this.config.getOrThrow<string>('ENCRYPTION_KEY')
    const decoded = Buffer.from(configured, 'base64')
    if (decoded.length === 32 && decoded.toString('base64').replace(/=+$/, '') === configured.replace(/=+$/, '')) return decoded
    return createHash('sha256').update(configured).digest()
  }

  private aad(context: { id: string; provider: string; environment: string }, keyVersion: string): string {
    return `${context.id}:${context.provider}:${context.environment}:${keyVersion}`
  }
}

// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { I18nService } from '@ss-node/ss-i18n';

interface MfaState {
  secret: string;
  enabled: boolean;
  recoveryCodes: RecoveryCodeEntry[];
}

interface RecoveryCodeEntry {
  code: string;
  used: boolean;
}

@Injectable()
export class MfaService {
  private mfaStore: Map<string, MfaState> = new Map();
  private readonly RECOVERY_CODE_COUNT = 8;
  private readonly RECOVERY_CODE_LENGTH = 8;
  private readonly TOKEN_WINDOW = 1; // Allow 1 step before/after
  private readonly TOKEN_STEP = 30; // 30 seconds per step

  constructor(
    @Inject(I18nService)
    private i18nService: I18nService,
  ) {}

  /**
   * Generate a new TOTP secret
   */
  generateSecret(): string {
    const bytes = crypto.randomBytes(20);
    return this.base32Encode(bytes);
  }

  /**
   * Generate QR code URI for authenticator app
   */
  generateQrCodeUri(secret: string, username: string): string {
    const issuer = 'SmartData';
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedUsername = encodeURIComponent(username);
    return `otpauth://totp/${encodedIssuer}:${encodedUsername}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Verify a TOTP token against a secret
   */
  verifyToken(secret: string, token: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    const counter = Math.floor(now / this.TOKEN_STEP);

    for (let i = -this.TOKEN_WINDOW; i <= this.TOKEN_WINDOW; i++) {
      const expectedToken = this.generateHotp(secret, counter + i);
      if (expectedToken === token) {
        return true;
      }
    }

    return false;
  }

  /**
   * Enable MFA for a user
   */
  enableMfa(userId: string, secret: string): { recoveryCodes: string[] } {
    const recoveryCodes = this.generateRecoveryCodes(this.RECOVERY_CODE_COUNT);

    const recoveryCodeEntries: RecoveryCodeEntry[] = recoveryCodes.map((code) => ({
      code,
      used: false,
    }));

    this.mfaStore.set(userId, {
      secret,
      enabled: true,
      recoveryCodes: recoveryCodeEntries,
    });

    return { recoveryCodes };
  }

  /**
   * Disable MFA for a user
   */
  disableMfa(userId: string): boolean {
    if (!this.mfaStore.has(userId)) {
      return false;
    }
    this.mfaStore.delete(userId);
    return true;
  }

  /**
   * Check if MFA is enabled for a user
   */
  isMfaEnabled(userId: string): boolean {
    const state = this.mfaStore.get(userId);
    return state ? state.enabled : false;
  }

  /**
   * Get the MFA secret for a user (for verification)
   */
  getSecret(userId: string): string | undefined {
    const state = this.mfaStore.get(userId);
    return state ? state.secret : undefined;
  }

  /**
   * Verify a TOTP token for a user (MFA enabled)
   */
  verifyMfaToken(userId: string, token: string): boolean {
    const state = this.mfaStore.get(userId);
    if (!state || !state.enabled) {
      return false;
    }
    return this.verifyToken(state.secret, token);
  }

  /**
   * Generate recovery codes
   */
  generateRecoveryCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(this.generateRecoveryCode());
    }
    return codes;
  }

  /**
   * Use a recovery code to bypass MFA
   */
  useRecoveryCode(userId: string, code: string): boolean {
    const state = this.mfaStore.get(userId);
    if (!state || !state.enabled) {
      return false;
    }

    const entry = state.recoveryCodes.find((e) => e.code === code && !e.used);
    if (!entry) {
      return false;
    }

    entry.used = true;
    return true;
  }

  /**
   * Get remaining unused recovery codes count
   */
  getRemainingRecoveryCodes(userId: string): number {
    const state = this.mfaStore.get(userId);
    if (!state) return 0;
    return state.recoveryCodes.filter((e) => !e.used).length;
  }

  /**
   * Get MFA status for a user
   */
  getMfaStatus(userId: string): { enabled: boolean; remainingRecoveryCodes: number } {
    const state = this.mfaStore.get(userId);
    if (!state || !state.enabled) {
      return { enabled: false, remainingRecoveryCodes: 0 };
    }
    return {
      enabled: true,
      remainingRecoveryCodes: this.getRemainingRecoveryCodes(userId),
    };
  }

  /**
   * Generate a single recovery code
   */
  private generateRecoveryCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    const bytes = crypto.randomBytes(this.RECOVERY_CODE_LENGTH);
    for (let i = 0; i < this.RECOVERY_CODE_LENGTH; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  /**
   * Generate HOTP value (used internally for TOTP)
   */
  private generateHotp(secret: string, counter: number): string {
    const key = this.base32Decode(secret);
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, '0');
  }

  /**
   * Base32 encode a buffer
   */
  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
  }

  /**
   * Base32 decode a string
   */
  private base32Decode(input: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    input = input.toUpperCase().replace(/[^A-Z2-7]/g, '');

    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < input.length; i++) {
      value = (value << 5) | alphabet.indexOf(input[i]);
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }
}

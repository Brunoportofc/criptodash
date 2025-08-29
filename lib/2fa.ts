import speakeasy from "speakeasy"
import QRCode from "qrcode"

export function generate2FASecret(email: string) {
  const secret = speakeasy.generateSecret({
    name: `AGD Trading (${email})`,
    issuer: "AGD Trading System",
    length: 32,
  })

  return {
    secret: secret.base32,
    qrCode: secret.otpauth_url,
  }
}

export async function generateQRCode(otpauth_url: string): Promise<string> {
  return QRCode.toDataURL(otpauth_url)
}

export function verify2FAToken(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    token,
    window: 1,
  })
}

export function generateBackupCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    codes.push(code)
  }
  return codes
}

import crypto from "crypto"

const algorithm = "aes-256-cbc"
const secretKey = process.env.ENCRYPTION_SECRET || "your-secret-key-here-must-be-32-chars"

// Ensure secret key is exactly 32 bytes
const key = crypto.scryptSync(secretKey, "salt", 32)

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  return iv.toString("hex") + ":" + encrypted
}

export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(":")
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted text format")
    }

    const [ivHex, encrypted] = parts
    const iv = Buffer.from(ivHex, "hex")
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv)

    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  } catch (error) {
    console.error("Decryption error:", error)
    throw new Error("Failed to decrypt data")
  }
}

import crypto from "crypto";
// Use environment variable for encryption key, fallback to a default for development
// In production, this should be a strong, random key stored securely
const ENCRYPTION_KEY = (process.env.EMAIL_ENCRYPTION_KEY || "default-dev-key-change-in-production")
    .slice(0, 32)
    .padEnd(32, "0");
const ALGORITHM = "aes-256-cbc";
/**
 * Encrypt sensitive data (passwords, API keys)
 */
export function encryptData(data) {
    if (!data)
        return "";
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(data, "utf-8", "hex");
        encrypted += cipher.final("hex");
        // Return IV + encrypted data (IV must be known for decryption)
        return iv.toString("hex") + ":" + encrypted;
    }
    catch (error) {
        console.error("Encryption error:", error);
        throw new Error("Failed to encrypt data");
    }
}
/**
 * Decrypt sensitive data (passwords, API keys)
 */
export function decryptData(encryptedData) {
    if (!encryptedData)
        return "";
    try {
        const [ivHex, encrypted] = encryptedData.split(":");
        if (!ivHex || !encrypted) {
            console.error("Decryption error: Invalid encrypted data format (missing IV or encrypted part)");
            return "";
        }
        const iv = Buffer.from(ivHex, "hex");
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encrypted, "hex", "utf-8");
        decrypted += decipher.final("utf-8");
        return decrypted;
    }
    catch (error) {
        console.error("Decryption error - this likely means the encryption key changed:", error.message);
        console.error("Encrypted data starts with:", encryptedData.substring(0, 20) + "...");
        console.error("Current encryption key length:", ENCRYPTION_KEY.length);
        console.error("If credentials were encrypted with a different key, they cannot be decrypted.");
        console.error("Solution: Re-save your email configuration in the admin panel.");
        return "";
    }
}
//# sourceMappingURL=encryption.js.map
/**
 * Represents the structured JSON payload stored inside a .crypt file.
 */
export interface CryptFileFormat {
    /** Format version for backwards compatibility */
    version: number;
    /** Cryptographic salt used for key derivation (Base64) */
    salt: string;
    /** Initialization Vector used for AES-GCM (Base64) */
    iv: string;
    /** Whether the inner payload was gzipped before encryption */
    compressed: boolean;
    /** Encrypted user signature/name (Base64) */
    signature: string;
    /** Encrypted file payload (Base64) */
    payload: string;
    /** Original MIME type of the file */
    originalType: string;
    /** Original file name */
    originalName: string;
  }
  
  export interface EncryptOptions {
    /** The file to be encrypted */
    file: File;
    /** Passkey used to derive the encryption key */
    passkey: string;
    /** A name or signature to embed securely within the file */
    signatureName: string;
    /** * Force gzip compression on or off. 
     * If undefined, the library auto-detects based on MIME type.
     */
    compress?: boolean;
  }
  
  export interface DecryptResult {
    /** The reconstructed, decrypted original file */
    file: File;
    /** The embedded signature name extracted from the file */
    signatureName: string;
  }
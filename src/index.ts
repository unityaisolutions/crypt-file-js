import { CryptFileFormat, EncryptOptions, DecryptResult } from './types.ts';
import { arrayBufferToBase64, base64ToArrayBuffer, compressData, decompressData, shouldCompress } from './utils.ts';
import { deriveKey, generateSalt, generateIV, encryptPayload, decryptPayload } from './crypto.ts';

export * from './types.ts';

/**
 * Encrypts a File into a .crypt JSON blob.
 * * @param options EncryptOptions configuration object
 * @returns A JSON string representing the encrypted file structure
 */
export async function encrypt(options: EncryptOptions): Promise<string> {
  const { file, passkey, signatureName } = options;
  
  // 1. Read file to ArrayBuffer
  let fileBuffer = await file.arrayBuffer();

  // 2. Decide and apply compression
  const compress = options.compress ?? shouldCompress(file.type);
  if (compress) {
    fileBuffer = await compressData(fileBuffer);
  }

  // 3. Setup cryptographic parameters
  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKey(passkey, salt);

  // 4. Encrypt main file payload
  const encryptedPayload = await encryptPayload(key, iv, fileBuffer);

  // 5. Encrypt signature
  const enc = new TextEncoder();
  const signatureBuffer = enc.encode(signatureName);
  const encryptedSignature = await encryptPayload(key, iv, signatureBuffer.buffer);

  // 6. Build the final JSON structure using Base64 translation
  const cryptFile: CryptFileFormat = {
    version: 1,
    salt: await arrayBufferToBase64(salt.buffer as ArrayBuffer),
    iv: await arrayBufferToBase64(iv.buffer as ArrayBuffer),
    compressed: compress,
    signature: await arrayBufferToBase64(encryptedSignature),
    payload: await arrayBufferToBase64(encryptedPayload),
    originalType: file.type || 'application/octet-stream',
    originalName: file.name
  };

  return JSON.stringify(cryptFile);
}

/**
 * Decrypts a .crypt JSON string back into the original File and signature.
 * * @param cryptJson The JSON string contents of the .crypt file
 * @param passkey The passkey used to originally encrypt the file
 * @returns An object containing the original File and the parsed Signature Name
 */
export async function decrypt(cryptJson: string, passkey: string): Promise<DecryptResult> {
  // 1. Parse JSON
  let cryptFile: CryptFileFormat;
  try {
    cryptFile = JSON.parse(cryptJson);
  } catch (err) {
    throw new Error("Invalid .crypt file format: Not valid JSON.");
  }

  if (cryptFile.version !== 1) {
    throw new Error(`Unsupported version: ${cryptFile.version}`);
  }

  // 2. Base64 Decode metadata & payloads
  const salt = new Uint8Array(await base64ToArrayBuffer(cryptFile.salt));
  const iv = new Uint8Array(await base64ToArrayBuffer(cryptFile.iv));
  const encryptedPayload = await base64ToArrayBuffer(cryptFile.payload);
  const encryptedSignature = await base64ToArrayBuffer(cryptFile.signature);

  // 3. Derive key
  const key = await deriveKey(passkey, salt);

  // 4. Decrypt and Process Payload
  let decryptedPayload: ArrayBuffer;
  try {
    decryptedPayload = await decryptPayload(key, iv, encryptedPayload);
  } catch (err) {
    throw new Error("Decryption failed. Incorrect passkey or corrupted file.");
  }

  if (cryptFile.compressed) {
    try {
      decryptedPayload = await decompressData(decryptedPayload);
    } catch (err) {
      throw new Error("Failed to decompress the decrypted payload.");
    }
  }

  // 5. Decrypt and Process Signature
  let decryptedSignatureBuffer: ArrayBuffer;
  try {
    decryptedSignatureBuffer = await decryptPayload(key, iv, encryptedSignature);
  } catch (err) {
     throw new Error("Decryption failed on signature. Corrupted file.");
  }
  const dec = new TextDecoder();
  const signatureName = dec.decode(decryptedSignatureBuffer);

  // 6. Reconstruct the original file
  const file = new File([decryptedPayload], cryptFile.originalName, {
    type: cryptFile.originalType
  });

  return { file, signatureName };
}

/**
 * Utility to download the resulting string as a `.crypt` file in the browser.
 */
export function downloadCryptFile(jsonString: string, originalFilename: string) {
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${originalFilename}.crypt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
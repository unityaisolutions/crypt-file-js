/**
 * Converts an ArrayBuffer to a Base64 string efficiently using the browser's native
 * FileReader API. This avoids call stack size limits that `String.fromCharCode` hits on large files.
 */
export async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
    const blob = new Blob([buffer]);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Extract just the base64 part from "data:application/octet-stream;base64,..."
        resolve(dataUrl.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  /**
   * Converts a Base64 string back to an ArrayBuffer efficiently using the native fetch API.
   */
  export async function base64ToArrayBuffer(base64: string): Promise<ArrayBuffer> {
    const res = await fetch(`data:application/octet-stream;base64,${base64}`);
    return await res.arrayBuffer();
  }
  
  /**
   * Compresses an ArrayBuffer using standard gzip Web APIs.
   */
  export async function compressData(data: ArrayBuffer): Promise<ArrayBuffer> {
    const stream = new Response(data).body!.pipeThrough(new CompressionStream('gzip'));
    return await new Response(stream).arrayBuffer();
  }
  
  /**
   * Decompresses an ArrayBuffer using standard gzip Web APIs.
   */
  export async function decompressData(data: ArrayBuffer): Promise<ArrayBuffer> {
    const stream = new Response(data).body!.pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).arrayBuffer();
  }
  
  /**
   * Auto-detects if a MIME type typically benefits from gzip compression.
   * Formats already heavily compressed (video, audio, modern images, archives) should be skipped
   * to save processing time and prevent file size increases.
   */
  export function shouldCompress(mimeType: string): boolean {
    const compressibleTypes = [
      'text/', 'application/json', 'application/javascript',
      'application/xml', 'image/svg+xml', 'application/csv'
    ];
    return compressibleTypes.some(type => mimeType.startsWith(type));
  }
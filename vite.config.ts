import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CryptFile',
      fileName: 'crypt-file',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      // Ensure we don't externalize standard browser APIs
      external: []
    }
  },
  plugins: [
    dts({ rollupTypes: true }) // Generates a single .d.ts file
  ]
});
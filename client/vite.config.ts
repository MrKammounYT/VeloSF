import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Le CSS de référence est importé directement depuis ../design (source unique du style)
    fs: { allow: ['..'] },
    proxy: { '/api': 'http://localhost:3001' },
  },
});

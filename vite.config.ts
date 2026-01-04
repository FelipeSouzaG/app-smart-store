import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // Mantido para acessibilidade
    port: 3002,
    strictPort: true,
    // --- CORREÇÃO AQUI ---
    allowedHosts: [
      'smart-store.local.fluxoclean.com.br',
      'host.docker.internal',
    ],
    // ---------------------
  },
});

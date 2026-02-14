
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  return {
    // Use relative asset paths in production builds so the site can be served from
    // subpaths like IPFS gateways (/ipfs/<cid>/) without a centralized backend.
    base: command === 'build' ? './' : '/',
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/ethers') || id.includes('node_modules/bs58')) {
              return 'chain-vendor';
            }
            return undefined;
          }
        }
      }
    },
    server: {
      port: 3000
    }
  };
});

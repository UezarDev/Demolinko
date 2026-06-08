// vite.config.ts - Configuration file for the Vite build tool and development server.
/*
Exports:
- default: UserConfig (Vite configuration object)
*/

import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'es2022'
  }
});

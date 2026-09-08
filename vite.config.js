import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'portal/web',
  base: './',
  build: {
    outDir: '../../outputs/portal',
    emptyOutDir: true,
    rollupOptions: { input: { portal: resolve('portal/web/index.html'), login: resolve('portal/web/login.html') } }
  }
});

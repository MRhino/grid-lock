import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import pkg from './package.json' with { type: 'json' };

// Shown on the start screen so you can tell which build you're running.
const commit = (process.env.VERCEL_GIT_COMMIT_SHA || (() => {
  try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'dev'; }
})()).slice(0, 7);

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __COMMIT__: JSON.stringify(commit),
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-180.png'],
      manifest: {
        name: 'Grid Lock',
        short_name: 'Grid Lock',
        description: 'Slide the traffic aside and get the gold getaway car out of the jam.',
        display: 'fullscreen',
        orientation: 'portrait',
        background_color: '#080a1f',
        theme_color: '#080a1f',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
});

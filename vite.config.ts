import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages: set base to repo name so asset paths resolve under https://<user>.github.io/game-2026_1/
  base: '/game-2026_1/',
  build: {
    outDir: 'dist'
  }
});

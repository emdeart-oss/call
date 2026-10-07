import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Le build produit un unique fichier dist/index.html autonome,
// ouvrable directement par double-clic (sans serveur).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
})

import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isWidget = mode === 'widget'

  if (isWidget) {
    // Widget build configuration
    return {
      plugins: [react()],
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src"),
        },
      },
      build: {
        outDir: 'dist/widget',
        emptyOutDir: true,
        rollupOptions: {
          input: {
            widget: path.resolve(__dirname, 'widget.html'),
          },
          output: {
            entryFileNames: 'widget.js',
            chunkFileNames: 'widget-[name].js',
            assetFileNames: (assetInfo) => {
              if (assetInfo.name === 'widget.html') {
                return 'widget.html'
              }
              if (assetInfo.name?.endsWith('.css')) {
                return 'widget.css'
              }
              return 'assets/[name].[ext]'
            },
            manualChunks: undefined,
          },
        },
        cssCodeSplit: false,
        minify: 'terser',
      },
    }
  }

  // Main app build configuration
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  }
})

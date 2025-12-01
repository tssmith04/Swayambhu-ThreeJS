import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
    plugins: [tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                about: path.resolve(__dirname, 'about.html'),
                model: path.resolve(__dirname, 'model.html')
            }
        },
        outDir: 'dist',
        assetsDir: 'assets',
        // Ensure proper asset handling
        assetsInlineLimit: 0
    },
    publicDir: 'public',
    // Fix for deployment
    base: './'
})

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
// import basicSsl from "@vitejs/plugin-basic-ssl";
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "vue-i18n": "vue-i18n/dist/vue-i18n.cjs.js",
    },
  },
  base: "./",
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,gif}"],
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "handwash",
        short_name: "handwash",
        description: "My Awesome App description",
        start_url: "/",
        scope: "/",
        display: "fullscreen",
        orientation: "portrait",
        theme_color: "#121212",
        categories: ["test"],
        icons: [
          {
            src: "/public/OIP.png",
            sizes: "256x256",
            type: "image/png",
          },
        ],
      },
    }),
    // basicSsl(),
  ],
  server: {
    host: "0.0.0.0",
    // https: true,
    proxy: {
      // API请求代理 - 指向本地SQLite服务器
      '/api/backend': {
        target: 'http://localhost:3001',  // 指向本地SQLite服务器
        changeOrigin: true,
        secure: false,  // 本地服务器使用HTTP
        rewrite: (path) => path.replace(/^\/api\/backend/, '')  // 移除 /api/backend 前缀
      },
      // Socket.io连接代理 - 如果需要可以保留远程或也改为本地
      '/socket.io': {
        target: 'https://trainingtest.polyuhandhygiene.com',
        changeOrigin: true,
        secure: true, // 对于HTTPS必需
        ws: true, // 支持WebSocket
      }
    },
  },
  optimizeDeps: {
    include: ['dayjs'],
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    assetsDir: 'assets'
  },
});

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
  publicPath: "./",
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
      // Flask API代理 - 代理到本地Flask服务器
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      // 用户服务代理
      '/services': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      // 健康检查代理
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      // 备用：如果需要连接到远程服务器，可以切换注释
      // '/api': {
      //   target: 'https://trainingtest.polyuhandhygiene.com',
      //   changeOrigin: true,
      //   secure: true
      // }
    },
  },
  optimizeDeps: {
    disabled: false,
  },
  build: {
    commonjsOptions: {
      include: [],
    },
  },
});

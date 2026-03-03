import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

/**
 * Vite配置文件
 * 用于配置Vite构建工具的行为
 */
export default defineConfig({
  plugins: [vue()], // 使用Vue插件
  base: './',  // 使用相对路径，解决打包后白屏问题
  build: {
    outDir: 'dist', // 构建输出目录
    assetsDir: 'assets', // 静态资源目录
    emptyOutDir: true, // 构建前清空输出目录
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html') // 主入口文件
      }
    }
  },
  server: {
    port: 5173 // 开发服务器端口
  }
})
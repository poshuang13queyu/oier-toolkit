import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src/webview',                  // 新增：设置根目录
  plugins: [react()],
  build: {
    outDir: '../../dist/webview',       // 输出到项目根目录的 dist/webview
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html',              // 现在直接写文件名即可
    },
  },
});
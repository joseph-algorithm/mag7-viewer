import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `/api` is proxied to the FastAPI dev server so the browser sees a single origin
// and CORS never enters the picture during development.
export default defineConfig({
	plugins: [react()],
	server: {
		port: 5173,
		proxy: {
			'/api': {
				target: process.env.BACKEND_URL ?? 'http://127.0.0.1:8000',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ''),
			},
		},
	},
})

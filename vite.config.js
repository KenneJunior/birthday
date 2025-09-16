import { defineConfig } from 'vite'
import { qrcode } from 'vite-plugin-qrcode'

export default defineConfig({
    server: {
        host: '0.0.0.0',
        allowedHosts: ['cf51d173fb50.ngrok-free.app','5c210a6d7b1f.ngrok-free.app', 'localhost'],
        port: 5173

    },
    plugins: [
        qrcode()
    ]
})

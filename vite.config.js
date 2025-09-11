import { defineConfig } from 'vite'
import { qrcode } from 'vite-plugin-qrcode'

export default defineConfig({
    server: {
        host: '0.0.0.0',
        allowedHosts: ['99ba1f423466.ngrok-free.app','5c210a6d7b1f.ngrok-free.app', 'localhost'],
        port: 5173

    },
    plugins: [
        qrcode(),
        qrcode('www.99ba1f423466.ngrok-free.app')
    ]
})

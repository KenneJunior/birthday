import { defineConfig } from 'vite'
import { qrcode } from 'vite-plugin-qrcode'

export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 5173

    },
    plugins: [
        qrcode()
    ]
})

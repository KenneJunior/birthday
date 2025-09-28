import { defineConfig } from 'vite'
import { qrcode } from 'vite-plugin-qrcode'
import { resolve } from 'path';

export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 5173

    },
    plugins: [
        qrcode()
    ],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                fhavur: resolve(__dirname, 'fhavur.html'),
                logout: resolve(__dirname, 'logOut.html'),
                login: resolve(__dirname, 'login.html'),
                confession: resolve(__dirname, 'fhavur/confession.html'),
                missuse: resolve(__dirname, 'fhavur/missus/fhav.html'),
                filename: 'index.html'
            },
        },
    }
})

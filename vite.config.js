import { defineConfig } from 'vite'
import {resolve} from 'path'
import { qrcode } from 'vite-plugin-qrcode'

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
            input:{
                main:resolve(__dirname, 'index.html'),
                fhavur:resolve(__dirname, 'fhavur.html'),
                confession:resolve(__dirname, 'fhavur/confession.html'),
                fhav:resolve(__dirname, 'fhavur/missus/fhav.html'),
                login:resolve(__dirname, 'login.html'),
                logout:resolve(__dirname, 'logOut.html')
            },
        }
    }
})

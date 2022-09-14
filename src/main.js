import { createApp } from 'vue'
import App from './App.vue'
import { io } from 'socket.io-client'

const app = createApp(App)

const endpoint = location.hostname === 'localhost' ? 'http://localhost:2755' : 'https://mmmapapila.sagna.dev'
app.config.globalProperties.$endpoint = endpoint

const socket = io(endpoint)

app.config.globalProperties.$io = socket

app.mount('#app')
import { createRouter, createWebHashHistory } from 'vue-router'

import App from '../pages/App.vue'
import VideoCanvas from '../pages/VideoCanvas.vue'

const routes = [
  {
    path: '/',
    component: App
  },
  {
    path: '/test',
    component: VideoCanvas
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
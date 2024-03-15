<script setup>
  import {ref} from "vue"
  const left = ref(370)
  const top = ref(350)
  const width = ref(300)
  const height = ref(300)
  const canvas = ref(null)
  const current = ref(0)
  const isPlaying = ref(false)
  const imgPath = '../../texture/normal/'
  const imgExt = '.png'
  const frameNum = 1000
  const imgPromises = []
  let canvasCtx = null
  let images = []
  let rafID = 0

  for (let index = 0; index < frameNum; ++index) {
    imgPromises.push(new Promise((resolve, reject) => {
      const img = new Image()
      const path = imgPath + index + imgExt
      img.src = imgPath + index + imgExt
      img.onload = () => {
        resolve(img)
      }
      img.onerror = () => {
        reject(new Error('could not load image at:' + path))
      }
    }))
  }

  async function getImages() {
    images = await Promise.all(imgPromises)
    canvasCtx = canvas.value.getContext('2d')
    drawFrame()
  }
  getImages()

  const animate = () => {
    rafID = requestAnimationFrame(animate)
    drawFrame()
    current.value = (current.value + 1) % frameNum
  }

  const playVideo = () => {
    if (isPlaying.value) {
      cancelAnimationFrame(rafID)
    } else {
      animate()
    }
    isPlaying.value = !isPlaying.value
  }

  const drawFrame = () => {
    canvasCtx.drawImage(images[current.value], 0, 0, width.value, height.value)
  }

  const movement = {
    isMoving: false,
    isDragging: false,
    startX: 0,
    startY: 0
  }
  
  const EPSILON = 2
  
  const onMouseDown = (e) => {
    e.preventDefault()
    if (Math.abs(e.offsetX - width.value) <= EPSILON || Math.abs(e.offsetY - height.value) <= EPSILON) {
      movement.isDragging = true
    } else {
      movement.isMoving = true
    }
    movement.startX = e.clientX
    movement.startY = e.clientY
  }

  document.addEventListener("mousemove", (e) => {
    const currentX = e.clientX
    const currentY = e.clientY
    const diffX = currentX - movement.startX
    const diffY = currentY - movement.startY
    if (movement.isMoving) {
      left.value += diffX
      top.value += diffY
    } 
    if (movement.isDragging) {
      width.value += diffX
      height.value += diffY
    }
    movement.startX = currentX
    movement.startY = currentY
  })

  document.addEventListener("mouseup", (e) => {
    movement.isDragging = false
    movement.isMoving = false
    drawFrame()
  })
  
</script>

<template>
  <div class="bgCanvas">
    <div
      class="cursor" 
      :style="{position: 'absolute', left: left + 'px', top: top + 'px'}"
      >
      <canvas ref="canvas"
              :width="width" 
              :height="height" 
              :style="{width: width + 'px', height: height + 'px', backgroundColor: '#ffffff', opacity: 0.5}"
              @mousedown="onMouseDown"
              >
      </canvas>
      <el-row>
        <el-col :span="3">
          <el-icon @click="playVideo" :size="24" class="pointer">
            <VideoPlay v-if="!isPlaying" />
            <VideoPause v-else />
          </el-icon>
        </el-col>
        <el-col :span="21">
          <el-slider v-model="current" :min="1" :max="frameNum" :step="1" size="small" :show-tooltip="false" class="flex-one"></el-slider>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped>  
  .bgCanvas {
    background-image: url('../assets/images/brain-bg.png');
    position: relative;
    width: 1024px;
    height: 1024px;
    margin: 0 auto;
  }

  .cursor {
    cursor: move; 
  }

  .pointer {
    cursor: pointer;
    color: #409eff;
  }

</style>
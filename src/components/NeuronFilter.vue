<script setup>
  import {ref, onMounted, computed} from "vue"
  import areas from "../../json/areas.json"
  const props = defineProps(['neuronFilter', 'doiOptions', 'regionOptions', 'regionId'])
  const emit = defineEmits(['submit', 'selectSimulationData'])
  const renderedNum = ref(0)
  const onSubmit = () => {
    emit('submit')
    renderedNum.value = props.neuronFilter.dois.length
  }
  const play = () => {
    props.neuronFilter.playing = !props.neuronFilter.playing
  }
  const simulationDataOption = [
    {
      label: 'MeshColumn_layer4_data',
      value: 4
    },
    {
      label: 'MeshColumn_layer6_data',
      value: 6
    }
  ]
  const simulationData = ref('')
  const canvas = ref(null)
  const canvasWidth = 220
  const canvasHeight = 220
  const selectSimulationData = (value) => {
    console.log(value)
    emit('selectSimulationData', value)
  }
  onMounted(() => {
    const canvasElement = canvas.value
    const ctx = canvasElement.getContext('2d')
    ctx.globalAlpha = 0.4
    const drawImage = () => {
      requestAnimationFrame(drawImage)
      if (props.neuronFilter.images[props.neuronFilter.frame]) {
        ctx.clearRect(0, 0, canvasWidth, canvasWidth)
        ctx.drawImage(props.neuronFilter.images[props.neuronFilter.frame], 0, 0, canvasWidth, canvasHeight)
      }
    }
    drawImage()
  })

  const regionNames = areas.map(area => area[0])
  const canvasBackgroundStyle = computed(() => {
    return regionNames.includes(props.regionId) 
          ? {backgroundImage: `url('src/assets/images/texturemap/${props.regionId}.png')`, backgroundSize: 'contain'} 
          : {}
  })
</script>
<template>
  <el-form :model="neuronFilter" label-width="100px" class="white">
    <el-form-item label="Surface:">
      <el-switch 
        v-model="neuronFilter.visibility.surface">
      </el-switch>
    </el-form-item>
    <el-form-item label="Opacity:">
      <el-slider
        v-model="neuronFilter.opacity.surface"
        :min="0.1"
        :max="1.0"
        :step="0.01"
        show-input
      ></el-slider>
    </el-form-item>
    <el-form-item label="Region:">
      <el-switch 
        v-model="neuronFilter.visibility.region">
      </el-switch>
    </el-form-item>
    <el-form-item label="Opacity:">
      <el-slider
        v-model="neuronFilter.opacity.region"
        :min="0.1"
        :max="1.0"
        :step="0.01"
        show-input
      ></el-slider>
    </el-form-item>
    <el-form-item label="Simulation:">
      <el-switch 
        v-model="neuronFilter.voltage">
      </el-switch>
    </el-form-item>
    <el-form-item label="Source:">
      <el-select v-model="simulationData"
                 @change="selectSimulationData"
                 placeholder="select simulationData">
        <el-option
          v-for="(item, index) in simulationDataOption"
          :value="item.value"
          :label="item.label"
          :key="index"
        ></el-option>
      </el-select>
    </el-form-item>
    <el-form-item label="Mapping:">
      <canvas :width="canvasWidth" :height="canvasHeight" ref="canvas" :style="canvasBackgroundStyle"></canvas>
    </el-form-item>

    <el-form-item label="Frames:">
      <div class="flex-container">
        <el-icon @click = "play" :size="24" class="pointer">
          <VideoPlay v-if="!neuronFilter.playing" />
          <VideoPause v-else />
        </el-icon>
        <el-slider
          v-model="neuronFilter.frame"
          :min="0"
          :max="neuronFilter.maxFrame - 1"
          :step="1"
          :show-tooltip="false"
        ></el-slider>
      </div>
    </el-form-item>

    <el-form-item label="Neuron ID:">
      <el-select
        v-model="neuronFilter.dois"
        filterable
        multiple
        collapse-tags
        collapse-tags-tooltip
        placeholder="select neuron"
      >
        <el-option
          v-for="item in doiOptions"
          :key="item.index"
          :label="item.label"
          :value="item.value">
        </el-option>
      </el-select>
    </el-form-item>

    <el-form-item label="From:">
      <el-select
        v-model="neuronFilter.startRegion"
        filterable
        placeholder="From Region"
      >
        <el-option
          v-for="item in regionOptions"
          :key="item.index"
          :label="item.label"
          :value="item.value">
        </el-option>
      </el-select>
    </el-form-item>
    <el-form-item label="To:">
      <el-select
        v-model="neuronFilter.endRegion"
        filterable
        placeholder="To Region"
      >
        <el-option
          v-for="item in regionOptions"
          :key="item.index"
          :label="item.label"
          :value="item.value">
        </el-option>
      </el-select>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="onSubmit">Query</el-button>
    </el-form-item>
    <el-form-item>
      <span>{{renderedNum}} neurons rendered</span>
    </el-form-item>
  </el-form>
</template>
<style scoped>
.pointer {
  cursor: pointer;
  color: #409eff;
  margin-right: 10px;
}

.flex-container {
  width: 100%;
  display: flex;
  align-items: center;
}
</style>
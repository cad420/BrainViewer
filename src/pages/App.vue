<script setup>
  import * as THREE from "three"
  import NeuronFilter from "../components/NeuronFilter.vue"
  import RegionInfo from "../components/RegionInfo.vue"
  import labels from "../../json/label.json"
  import neurons from '../../json/lines.json'
  import CONSTANTS from '../constants/index.js'
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
  import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
  import { ref, watch, onMounted, computed } from 'vue'
  import { loadMesh, loadAllRegions, loadSimulationRegions } from '../utils/dataset.js'
  import { sample } from '../utils/util.js'

  // region id to color, abbr, fullname
  const colorMap = new Map()
  const abbrMap = new Map()
  const fullnameMap = new Map()

  // el-select source
  const regionOptions = ref([])
  const doiOptions = ref([])

  const neuronFilter = ref({
    dois: [],
    startRegion: '',
    endRegion: '',
    visibility: {
      surface: true,
      region: false
    },
    opacity: {
      surface: CONSTANTS.DEFAULT_SURFACE_OPACITY,
      region: CONSTANTS.DEFAULT_REGION_OPACITY
    },
    pickByClick: true,
    voltage: false,
    frame: 0,
    maxFrame: CONSTANTS.MAX_FRAME_NUM,
    images: [],
    playing: false,
  })

  function initRegionMapping() {
    for (const label of labels) {
      const index = label[0]
      const color = new THREE.Color(`#${label[1]}`)
      const abbr = label[2]
      const fullname = label[3]
      colorMap.set(index, color)
      abbrMap.set(index, abbr)
      fullnameMap.set(index, fullname)
      regionOptions.value.push({
        value: index,
        label: `${abbr} : ${fullname}`
      })
    }
  }
  initRegionMapping()

  //chosen region id
  const chosenId = ref('')
  const regionAbbr = computed(() => {
    return abbrMap.get(chosenId.value)
  })
  const regionFullname = computed(() => {
    return fullnameMap.get(chosenId.value)
  })
  

  // default canvas size
  let canvasWidth = window.innerWidth
  let canvasHeight = window.innerHeight

  // mouse position in ndc
  const pickPosition = { x: 0, y: 0 }

  /* picker */
  class Picker {
    constructor() {
      this.raycaster = new THREE.Raycaster()
      this.pickedObject = null
      this.pickedGroup = null
      this.pickedObjectSavedColor = 0
      this.highlightColor = 0xff0000
      this.voltageBackgroundColor = 0xffffff
    }

    pick(normalizedPosition, camera) {
      if (!neuronFilter.value.pickByClick) {
        return
      }
      this.raycaster.setFromCamera(normalizedPosition, camera)
      const intersectingGroup = regionGroup
      const visibleRegions = intersectingGroup.children.filter(child => child.visible)
      const intersectedObjects = this.raycaster.intersectObjects(visibleRegions)
      if (intersectedObjects.length > 0) {
        if (chosenId.value === intersectedObjects[0].object.userData.id || intersectedObjects[0].object.parent === this.pickedGroup) {
          // handle unselect
          chosenId.value = ''
          return
        }
        chosenId.value = intersectedObjects[0].object.userData.id
      }
    }
  }

  const picker = new Picker()

  /* watch */
  // region opacity
  watch(() => neuronFilter.value.opacity.region, opacity => {
    regionGroup.traverse(obj => {
      if (obj.isMesh) {
        obj.material.opacity = opacity
      }
    })
  })

  // surface opacity
  watch(() => neuronFilter.value.opacity.surface, opacity => {
    surfaceGroup.traverse(obj => {
      if (obj.isMesh) {
        obj.material.opacity = opacity
      }
    })
  })

  let loaded = {
    defaultRegions: false,
    simulationRegions: false
  }

  watch(() => neuronFilter.value.visibility.region, visibility => {
    if (visibility && !loaded.defaultRegions) {
      loaded.defaultRegions = true
      loadAllRegions(regionGroup, colorMap)
    }
  })

  watch(() => neuronFilter.value.voltage, voltage => {
    if (voltage && !loaded.simulationRegions) {
      loaded.simulationRegions = true
      loadSimulationRegions(regionGroup)
    }
  })

  // picked region
  watch(chosenId, (id) => {
    const clearPickedGroup = function(pickedGroup) {
      if (!pickedGroup) return
      pickedGroup.children.forEach(child => {
        child.material.color = child.userData.color
        child.material.opacity = neuronFilter.value.opacity.region
        child.material.map = null
      })
    }
    
    const clearPickedObject = function(pickedObject) {
      if (!pickedObject) return
      pickedObject.material.emissive.setHex(picker.pickedObjectSavedColor)
      pickedObject.material.opacity = neuronFilter.value.opacity.region
      pickedObject.material.map = null
    }

    if (id === '') {
      // unselect
      if (neuronFilter.value.voltage) {
        clearPickedGroup(picker.pickedGroup)
        picker.pickedGroup = undefined
        neuronFilter.value.playing = false
      } else {
        clearPickedObject(picker.pickedObject)
        picker.pickedObject = undefined
      }
      return
    }
    regionGroup.traverse((obj) => {
      // traverse the scene to find the corresponding region
      if (obj.isMesh && obj.userData.id === id) {
        if (neuronFilter.value.voltage) {
          clearPickedGroup(picker.pickedGroup)
          picker.pickedGroup = obj.parent
          neuronFilter.value.playing = true
          neuronFilter.value.frame = 0
          if (obj.material.opacity > CONSTANTS.HIGHLIGHT_OPACITY_THRESHOLD) {
            picker.pickedGroup.children.forEach(child => {
              child.material.color = new THREE.Color(picker.voltageBackgroundColor)
            })
          } else { 
            picker.pickedGroup.children.forEach(child => {
              child.material.opacity = 1.0
            })
          }
        } else {
          clearPickedObject(picker.pickedObject)
          picker.pickedObject = obj
          picker.pickedObjectSavedColor = obj.material.emissive.getHex()
          if (picker.pickedObject.material.opacity > CONSTANTS.HIGHLIGHT_OPACITY_THRESHOLD) {
            // highlight
            picker.pickedObject.material.emissive.setHex(picker.highlightColor)
          } else {
            // opacity
            picker.pickedObject.material.opacity = 1.0
          }
        }
      }
    })
  })

  /* scene */
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff)

  /* camera */
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(0, 0, 20)

  /* renderer */
  const renderer = new THREE.WebGLRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight)
  const canvas = ref(null)

  /* light */
  const ambientLight = new THREE.AmbientLight(0x404040, 1)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
  const pointLight = new THREE.PointLight( 0xffffff, 1, 100 );
  pointLight.position.set(-50, -50, -50);

  scene.add(ambientLight, directionalLight, pointLight)

  /* neurons */
  const baseMat = new THREE.MeshPhongMaterial()
  baseMat.transparent = true
  baseMat.opacity = CONSTANTS.DEFAULT_SURFACE_OPACITY
  baseMat.side = THREE.DoubleSide
  baseMat.color = new THREE.Color(0xffffff)
  // baseMat.depthWrite = false
  // baseMat.depthTest = true

  /* surface */
  const surfaceGroup = new THREE.Group()
  const surfacePosition = new THREE.Vector3(-5.7, 5.7, -4.5)
  const surfaceScale = 1
  surfaceGroup.scale.setScalar(surfaceScale)
  surfaceGroup.position.copy(surfacePosition)
  surfaceGroup.rotation.x = 1.67

  const neuronGroup = surfaceGroup.clone()
  neuronGroup.scale.setScalar(0.001)

  let surfaceMat = baseMat.clone()
  surfaceMat.depthWrite = true
  surfaceMat.depthTest = true
  surfaceMat.transparent = true
  loadMesh('./model/square.obj', surfaceMat, surfaceGroup)
  scene.add(surfaceGroup)


  const loadTexture = true
  let textures = []

  const imagesMap = new Map()
  const texturesMap = new Map()

  const onSelectSimulationData = async (value) => {
    if (imagesMap.get(value)) {
      neuronFilter.value.images = imagesMap.get(value)
      textures = texturesMap.get(value)
      return
    }
    const prefix = `texture/${value}/`
    const extension = '.jpg'
    const promises = []
    for (let i = 0; i < CONSTANTS.MAX_FRAME_NUM; ++i) {
      const path = prefix + i + extension
      const image = new Image()
      image.src = path
      promises.push(new Promise((resolve, reject)=> {
        image.onload = () => {
          resolve(image)
        }
        image.onerror = () => {
          reject(`cannot load image at ${path}`)
        }
      }))
    }
    let loadedImages = await Promise.all(promises)
    const loadedTextures = loadedImages.map(image => {
      const texture = new THREE.Texture(image, THREE.UVMapping)
      texture.needsUpdate = true
      return texture
    })
    textures = loadedTextures
    neuronFilter.value.images = loadedImages
    imagesMap.set(value, loadedImages)
    texturesMap.set(value, loadedTextures)
  } 
  
  /* neuron 
    classified by regions(allenId)
  */
  neuronGroup.visible = false
  scene.add(neuronGroup)

  /* doi 
    classified by doi(json files)
  */
  const doiGroup = neuronGroup.clone()
  doiGroup.visible = true
  scene.add(doiGroup)

  /* regions */
  const regionGroup = new THREE.Group()
  const regionRotation = new THREE.Euler(0.1, CONSTANTS.PI, 0)
  regionGroup.rotation.copy(regionRotation)
  const regionScale = 1.05
  regionGroup.scale.setScalar(regionScale)
  scene.add(regionGroup)

  /* flicker */
  const flickerGroup = new THREE.Group()
  flickerGroup.rotation.copy(regionRotation)
  flickerGroup.scale.setScalar(regionScale)
  scene.add(flickerGroup)

  /* process neuron json file */
  // allen to geometry
  const allenMap = new Map()
  // allen to color
  const neuronColorMap = new Map()
  // region id to allen id
  const graphOrder2AllenId = new Map()
  // allen id to region id
  const allenId2GraphOrder = new Map()
  // doi to passed regions
  const neuronName2Regions = new Map()
  // doi to json file name
  const doi2Json = new Map()
  // dois already read
  const searchedDois = new Map()

  function fetchPromise(path) {
    return fetch(path)
          .then(res => res.json())
          .then((res) => {
            processNeuron(res, path)
          })
  }

  // read neurons
  async function readNeurons(num) {
    const prefix = './json/json25/'
    // max request num at the same time
    for (let i = 0; i < num / CONSTANTS.MAX_REQUEST_NUM; i++) {
      const promises = []
      for (let j = i * CONSTANTS.MAX_REQUEST_NUM; j < (i + 1) * CONSTANTS.MAX_REQUEST_NUM && j < num; j++) {
        const name = neurons[j]
        const path = prefix + name
        promises.push(fetchPromise(path))
      }
      await Promise.all(promises)
    }
    // region select options
    regionOptions.value = regionOptions.value.filter(region => {
      const { value } = region
      const allenId = graphOrder2AllenId.get(value)
      if (!allenId) return false
      if (allenMap.get(allenId)) {
        return true
      }
      return false
    })
    regionOptions.value.unshift({
      value: '',
      label: 'none'
    })

    // dois select options
    doiOptions.value.sort((a, b) => a.value < b.value)
    doiOptions.value.forEach((item, i) => {item.index = i})

    //TODO: DELETE pre read all the dois 
    // for (let item of doiOptions.value) {
    //   const group = await getNeuronGroupByDOI(item.value)
    //   searchedDois.set(item.value, true)
    //   doiGroup.add(group)
    // }
    
    // region geometry
    for (const i of allenMap.keys()) {
      const geometry = mergeBufferGeometries(allenMap.get(i))
      geometry.userData = {}
      allenMap.set(i, geometry)
    }
    for (const i of allenMap.keys()) {
      const allenLine = new THREE.LineSegments(
        allenMap.get(i), 
        new THREE.LineBasicMaterial({color: neuronColorMap.get(i)})
      )
      // allen id
      allenLine.userData.id = i
      neuronGroup.add(allenLine)
    }
    // free memory
    allenMap.clear()

    /* used to export scene as gltf extension */
    /*

      const link = document.createElement( 'a' )
      link.style.display = 'none'
      document.body.appendChild(link)
      exportGLTF(link, scene);
    */
  }
  readNeurons(CONSTANTS.READ_NEURON_NUMS)

  function processNeuron(neuron, path) {
    const {allenInformation, DOI, axon, dendrite} = neuron.neuron
    neuronName2Regions.set(DOI, new Set())
    doi2Json.set(DOI, path)
    doiOptions.value.push({label: DOI, value: DOI})
    allenInformation.forEach(allen => {
      neuronColorMap.set(allen.allenId, new THREE.Color(`#${allen.colorHex}`)) 
      graphOrder2AllenId.set(allen.graphOrder, allen.allenId)
      allenId2GraphOrder.set(allen.allenId, allen.graphOrder)
      neuronName2Regions.get(DOI).add(allen.allenId)
    })
    processSegments(axon, allenMap)
    processSegments(dendrite, allenMap)
  }

  function processSegments(data, map) {
    const len = data.length;
    // index starts from 1
    const tree = new Array(len + 1)
    // initialize tree
    for (let i = 0; i < tree.length; i++) {
      tree[i] = {
        id: -1,
        x: 0,
        y: 0,
        z: 0,
        radius: 0,
        allenId: -1,
        children: []
      }
    }

    // fill tree
    for (const cur of data) {
      const { sampleNumber: id, parentNumber: parentId, radius, x, y, z, allenId } = cur
      tree[id].id = id
      tree[id].x = x
      tree[id].y = y
      tree[id].z = z
      tree[id].radius = radius
      tree[id].allenId = allenId
      if (parentId !== -1) 
        tree[parentId].children.push(id)
    }

    // traverse tree
    for (const cur of tree) {
      for (const childIndex of cur.children) {
        const next = tree[childIndex]
        let points = [new THREE.Vector3(cur.x, cur.y, cur.z), new THREE.Vector3(next.x, next.y, next.z)]
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
        if (!map.get(cur.allenId)) {
          map.set(cur.allenId, [lineGeometry])
        } else {
          map.get(cur.allenId).push(lineGeometry)
        }
      }
    }
  }

  let rafID = null

  // query neurons
  const onSubmit = async () => {
    flickerGroup.clear()
    if (rafID) cancelAnimationFrame(rafID)
    const regions = []
    if (neuronFilter.value.startRegion) {
      regions.push(graphOrder2AllenId.get(neuronFilter.value.startRegion))
    }
    if (neuronFilter.value.endRegion) {
      regions.push(graphOrder2AllenId.get(neuronFilter.value.endRegion))
    }
    // if the requested neurons are not read, just read it
    for (const doi of neuronFilter.value.dois) {
      if (!searchedDois.get(doi)) {
        searchedDois.set(doi, true)
        const group =  await getNeuronGroupByDOI(doi)
        doiGroup.add(group)
      }
    }
    const visibleDois = []
    doiGroup.children.forEach(g => {
      const { doi } = g.userData
      if (regions.length > 0) {
        // query by region
        let ok = true
        for (const id of regions) {
          const set = neuronName2Regions.get(doi)
          if (!set.has(id)) {
            ok = false
            break
          }
        }
        if (ok) {
          g.visible = true
          visibleDois.push(doi)
        } else {
          g.visible = false
        }
        neuronFilter.value.dois = visibleDois
      } else {
        // query by doi
        if (neuronFilter.value.dois.includes(doi)) {
          g.visible = true
          visibleDois.push(doi)
        } else {
          g.visible = false
        }
      }
      if (g.visible) {
        // resume color
        g.traverse((line) => {
          if (line.isLineSegments) {
            line.material.color = line.userData.color
          }
        })
      }
    })
    // if more than 1 neurons are visible, each neuron is assigned an unique color
    let cnt = 1
    if (visibleDois.length > 1) {
      doiGroup.children.forEach(g => {
        const { doi } = g.userData
        if (visibleDois.includes(doi)) {
          const color = new THREE.Color(`#${labels[cnt++][1]}`)
          g.traverse((line) => {
            if (line.isLineSegments) {
              line.material.color = color
            }
          })
        }
      })
    }

    // show start region and end region
    const regionSet = new Set()
    for (const region of regions) {
      regionSet.add(allenId2GraphOrder.get(region))
    }
    // show passed regions 
    // for (let doi of visibleDois) {
    //   const set = neuronName2Regions.get(doi)
    //   for (const allenId of set) {
    //     if (allenId2GraphOrder.get(allenId)) {
    //       regionSet.add(allenId2GraphOrder.get(allenId))
    //     }
    //   }
    // }
    for (const region of regionGroup.children) {
      if (regionSet.has(region.userData.id)) {
        region.visible = true
        /* ficker */
        const mesh = sample(region)
        const flicker = () => {
          const opacity = (Date.now() % 1000) / 1000
          mesh.material.opacity = Math.max(opacity, 0.2)
          requestAnimationFrame(flicker)
        }
        rafID = requestAnimationFrame(flicker)
        flickerGroup.add(mesh)
      } else {
        region.visible = false
      }
    }
  }

  async function getNeuronGroupByDOI(doi) {
    const path = doi2Json.get(doi)
    const neuron = await fetch(path).then(res => res.json())
    const neuronAllenMap = new Map()
    const {axon, dendrite} = neuron.neuron
    processSegments(axon, neuronAllenMap)
    processSegments(dendrite, neuronAllenMap)
    const group = new THREE.Group()
    for (const k of neuronAllenMap.keys()) {
      const geometry = mergeBufferGeometries(neuronAllenMap.get(k))
      const material = new THREE.LineBasicMaterial({color: neuronColorMap.get(k), linewidth: 10})
      const lineSegment = new THREE.LineSegments(geometry, material)
      lineSegment.userData.color = neuronColorMap.get(k) || new THREE.Color(0xffffff)
      group.add(lineSegment)
    }
    group.userData.doi = doi
    group.visible = false
    return group
  }

  /* events */
  let mouseDownTime = 0

  const onMouseDown = (e) => {
    mouseDownTime = performance.now()
  }

  const onMouseUp = (e) => {
    const mouseUpTime = performance.now()
    if (mouseUpTime - mouseDownTime > CONSTANTS.EPSILON) {
      // moving around
      return
    }
    let x = e.offsetX / canvasWidth 
    let y = e.offsetY / canvasHeight
    x = 2 * x - 1
    y = -2 * y + 1
    pickPosition.x = x
    pickPosition.y = y
    picker.pick(pickPosition, camera)
  }

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }, false );

  /* hooks */
  onMounted(() => {
    canvasWidth = document.querySelector('.container').clientWidth
    canvasHeight = document.querySelector('.container').clientHeight
    canvas.value.appendChild(renderer.domElement)
    new OrbitControls( camera, renderer.domElement )
  })

  function render() {
    requestAnimationFrame(render)
    surfaceGroup.visible = neuronFilter.value.visibility.surface
    for (const group of regionGroup.children) {
      group.visible = group.name === 'DEFAULT' ? neuronFilter.value.visibility.region : neuronFilter.value.voltage
    }
    if (neuronFilter.value.playing) {
      neuronFilter.value.frame++
      if (neuronFilter.value.frame >= CONSTANTS.MAX_FRAME_NUM) neuronFilter.value.frame = 0
    }

    if (loadTexture && picker.pickedGroup && textures.length) {
      const texture = textures[(neuronFilter.value.frame)%CONSTANTS.MAX_FRAME_NUM]
      for (const child of picker.pickedGroup.children) {
        child.material.map = texture
      }
    }

    // if (loadTexture && textures.length) {
    //   const texture = textures[(neuronFilter.value.frame)%CONSTANTS.MAX_FRAME_NUM]
    //   for (const child of surfaceGroup.children) {
    //     child.material.map = texture
    //   }
    // }
    renderer.render(scene, camera)
  }

  render()
</script>

<template>
  <div class="container" ref="canvas" @mousedown="onMouseDown" @mouseup="onMouseUp">
    <aside class="sidebar">
      <NeuronFilter
        :neuronFilter="neuronFilter"
        :doiOptions="doiOptions"
        :regionOptions="regionOptions"
        :regionId="chosenId"
        @submit="onSubmit"
        @selectSimulationData="onSelectSimulationData"
      />
    </aside>
    <section>
      <RegionInfo
        :regionId="chosenId"
        :regionAbbr="regionAbbr"
        :regionFullname="regionFullname"
      />
    </section>
  </div>
</template>

<style scoped>

</style>

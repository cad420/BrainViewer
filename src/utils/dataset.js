import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import * as THREE from "three"
import validIndexes from "../../json/valid.json"
import areas from "../../json/areas.json"
import CONSTANTS from '../constants/index.js'
const loader = new OBJLoader()
const onError = function(error, id = 1) {
  console.log(`model ${id} load error: ${error}`)
}
const onProgress = function() {}

const modelPath = './model/regions/'
const extension = '.obj'

function loadMesh(path, mat, group) {
  loader.load(
    path, 
    (mesh) => {
      mesh.children[0].material = mat
      group.add(mesh.children[0])
    }, 
    onProgress, 
    (error) => {onError(error)}
  )
}

function loadSimulationRegions(regionGroup) {
  const baseMat = new THREE.MeshPhongMaterial()
  baseMat.transparent = true
  baseMat.opacity = CONSTANTS.DEFAULT_REGION_OPACITY
  baseMat.side = THREE.DoubleSide
  const groups = areas.map(area => {
    const group = new THREE.Group()
    group.name = area[0]
    return group
  })

  for (const area of areas) {
    const name = area[0]
    const path = modelPath + 'ProjectionMapping/' + name + extension
    const mat = baseMat.clone()
    loader.load(
      path, 
      (mesh) => {
        const i = areas.findIndex(area => {
          return area[0] === name
        })
        // i is never -1
        const color = new THREE.Color(areas[i][1])
        mat.color = color
        mesh.traverse((child) => {
          if (child.isMesh) {
            child.material = mat
            child.userData.id = name
            child.userData.color = mat.color
          }
        })
        groups[i].add(mesh.children[0])
      }, 
      onProgress, 
      (error) => {onError(error)}
    )
  }
  for (const g of groups) {
    regionGroup.add(g)
  }
  return
  
}

function loadAllRegions(regionGroup, colorMap) {
  const baseMat = new THREE.MeshPhongMaterial()
  baseMat.transparent = true
  baseMat.opacity = CONSTANTS.DEFAULT_REGION_OPACITY
  baseMat.side = THREE.DoubleSide
  const group = new THREE.Group()
  group.name = 'DEFAULT'

  for (const index of validIndexes) {
    const path = modelPath + index  + extension
    const mat = baseMat.clone()
    loader.load(
      path, 
      (mesh) => {
        mat.color = colorMap.get(index)
        mesh.traverse((child) => {
          if (child.isMesh) {
            child.material = mat
            child.userData.id = index
            child.userData.color = mat.color
          }
        })
        group.add(mesh.children[0])
      }, 
      onProgress, 
      (error) => {onError(error, index)}
    )
  }
  regionGroup.add(group)
}

export {loadMesh, loadSimulationRegions, loadAllRegions}
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'
import * as THREE from "three"
function sample(sampleMesh, sampleNum = 3000, radius = 0.003, color = 0xffffff) {
	const sampler = new MeshSurfaceSampler(sampleMesh).setWeightAttribute('color').build()
	const geometry = new THREE.SphereGeometry(radius)
	const material = new THREE.PointsMaterial({color})
	material.transparent = true
	const mesh = new THREE.InstancedMesh(geometry, material, sampleNum)
	const position = new THREE.Vector3()
	const matrix = new THREE.Matrix4()
	for (let i = 0; i < sampleNum; ++i) {
			sampler.sample(position)
			matrix.makeTranslation(position.x, position.y, position.z)
			mesh.setMatrixAt(i, matrix)
	}
	mesh.instanceMatrix.needsUpdate = true
	return mesh
}
export {sample}

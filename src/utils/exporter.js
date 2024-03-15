import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js"

function exportGLTF(link, input) {
	const gltfExporter = new GLTFExporter()
    gltfExporter.parse(
			input,
			function (result) {
				if (result instanceof ArrayBuffer) {
					saveArrayBuffer(link, result, 'scene.glb')
				} else {
					const output = JSON.stringify(result, null, 2)
					saveString(link, output, 'scene.gltf')
				}
			},
			function ( error ) {
					console.log( 'An error happened during parsing', error)
			},
    )
}

function save(link, blob, filename) {
	link.href = URL.createObjectURL(blob)
	link.download = filename
	link.click()
}

function saveString(link, text, filename ) {
  save(link, new Blob( [ text ], { type: 'text/plain' } ), filename)
}


function saveArrayBuffer(link, buffer, filename ) {
  save(link, new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename )
}

export { exportGLTF }
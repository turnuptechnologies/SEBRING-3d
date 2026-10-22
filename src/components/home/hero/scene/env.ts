import * as THREE from "three"

/**
 * Night-circuit reflection environment, rendered once into a PMREM: a dark
 * sky, a cool haze line on the horizon, two rows of warm floodlights receding
 * down the straight and a faint lit-asphalt floor. This is what draws the
 * horizon line and the lamp highlights across the paintwork.
 */
export function createNightEnvironment(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const scene = new THREE.Scene()
  const disposables: Array<{ dispose(): void }> = []
  const add = (geo: THREE.BufferGeometry, color: THREE.Color, position: THREE.Vector3, lookAt?: THREE.Vector3) => {
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: false, toneMapped: false })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(position)
    if (lookAt) mesh.lookAt(lookAt)
    scene.add(mesh)
    disposables.push(geo, mat)
    return mesh
  }

  // Sky dome with a horizon haze band.
  const skyGeo = new THREE.SphereGeometry(50, 48, 24)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: "varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vec3 d = normalize( vDir );
        float h = d.y;
        vec3 zenith = vec3( 0.004, 0.005, 0.009 );
        vec3 haze = vec3( 0.05, 0.058, 0.08 );
        vec3 ground = vec3( 0.012, 0.011, 0.01 );
        vec3 col = h > 0.0 ? mix( haze, zenith, smoothstep( 0.0, 0.35, h ) ) : mix( haze * 0.6, ground, smoothstep( 0.0, 0.25, -h ) );
        col += vec3( 0.16, 0.17, 0.2 ) * exp( -abs( h ) * 60.0 );
        // Warm glow down the straight.
        col += vec3( 0.12, 0.06, 0.025 ) * pow( max( -d.z, 0.0 ), 10.0 ) * exp( -abs( h ) * 9.0 );
        gl_FragColor = vec4( col, 1.0 );
      }`,
  })
  scene.add(new THREE.Mesh(skyGeo, skyMat))
  disposables.push(skyGeo, skyMat)

  const centre = new THREE.Vector3(0, 0, 0)
  const lamp = new THREE.Color(1, 0.64, 0.34).multiplyScalar(9)
  // Two rows of floodlights converging toward −Z on both sides, plus the ones beside / behind us.
  for (const side of [-1, 1]) {
    for (let k = -2; k < 9; k++) {
      const z = -3 - k * 4.6
      const pos = new THREE.Vector3(side * 2.6, 1.4, z)
      const dist = pos.length()
      const s = Math.max(0.6, 2.8 / Math.max(dist, 1)) * 0.5
      add(new THREE.PlaneGeometry(0.5 * s * 2, 0.22 * s * 2), lamp.clone().multiplyScalar(Math.min(1, 6 / dist)), pos.multiplyScalar(Math.min(1, 18 / dist)), centre)
    }
  }
  // Long soft strip overhead (moonlit cloud deck) and a cool key behind-left.
  add(new THREE.PlaneGeometry(26, 6), new THREE.Color(0.06, 0.07, 0.1), new THREE.Vector3(0, 14, -2), centre)
  add(new THREE.PlaneGeometry(10, 3), new THREE.Color(0.22, 0.26, 0.36), new THREE.Vector3(-9, 6, -12), centre)
  // Thin bright horizon strips left and right — the classic reflection line along the flanks.
  add(new THREE.PlaneGeometry(30, 0.35), new THREE.Color(0.3, 0.32, 0.38), new THREE.Vector3(-16, 1.2, 0), centre)
  add(new THREE.PlaneGeometry(30, 0.35), new THREE.Color(0.3, 0.32, 0.38), new THREE.Vector3(16, 1.2, 0), centre)
  // Warm floor bounce from the lit asphalt ahead.
  add(new THREE.PlaneGeometry(8, 18), new THREE.Color(0.05, 0.035, 0.022), new THREE.Vector3(0, -3, -6), centre)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const target = pmrem.fromScene(scene, 0.02, 0.1, 100, { size: 256 })
  pmrem.dispose()
  for (const d of disposables) d.dispose()
  return target
}

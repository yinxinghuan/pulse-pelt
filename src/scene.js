import * as THREE from 'three'

const MAX_WAVES = 8
const MAX_NODES = 6
const SPHERE_RADIUS = 1.32
const HIT_RADIUS = 1.48
const NODE_COLORS = ['#67f4ff', '#8ca9ff', '#a68cff', '#ff6ec7', '#ff9ea8', '#ffd27a']

const vertexShader = `
  precision highp float;
  attribute vec3 aDirection;
  attribute float aSpin;
  attribute float aSeed;
  uniform float uTime;
  uniform float uGlobal;
  uniform int uWaveCount;
  uniform int uNodeCount;
  uniform vec3 uWaveDirs[${MAX_WAVES}];
  uniform vec4 uWaveData[${MAX_WAVES}];
  uniform vec3 uNodeDirs[${MAX_NODES}];
  uniform vec3 uNodeColors[${MAX_NODES}];
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying float vTip;
  varying float vEnergy;
  varying vec3 vPulseColor;

  vec3 safeTangent(vec3 n) {
    vec3 axis = abs(n.y) < 0.92 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    return normalize(cross(axis, n));
  }

  void main() {
    vec3 dir = normalize(aDirection);
    vec3 tangent = safeTangent(dir);
    vec3 bitangent = normalize(cross(dir, tangent));
    float cs = cos(aSpin);
    float sn = sin(aSpin);
    vec3 t = tangent * cs + bitangent * sn;
    vec3 b = -tangent * sn + bitangent * cs;

    float energy = 0.0;
    vec3 pulseColor = vec3(0.0);
    for (int i = 0; i < ${MAX_WAVES}; i++) {
      if (i >= uWaveCount) break;
      float age = uWaveData[i].x;
      float strength = uWaveData[i].y;
      float hueIndex = uWaveData[i].z;
      float angular = 1.0 - clamp(dot(dir, uWaveDirs[i]), -1.0, 1.0);
      float center = age * 0.32;
      float ring = exp(-pow(angular - center, 2.0) * 520.0);
      float core = exp(-angular * 52.0) * exp(-age * 2.4);
      energy += strength * (ring * exp(-age * 1.25) + core * 0.65);
    }

    for (int i = 0; i < ${MAX_NODES}; i++) {
      if (i >= uNodeCount) break;
      float closeness = exp(-(1.0 - clamp(dot(dir, uNodeDirs[i]), -1.0, 1.0)) * 34.0);
      energy += closeness * 0.52;
      pulseColor += uNodeColors[i] * closeness;
    }

    float living = sin(uTime * 1.35 + aSeed * 6.2831) * 0.018;
    float harmony = uGlobal * (0.11 + 0.07 * sin(uTime * 2.0 + aSeed * 4.0));
    float lift = clamp(energy * 0.25 + harmony + living, -0.04, 0.42);
    float bend = clamp(energy, 0.0, 1.0) * 0.09;
    vec3 bentDir = normalize(dir + t * bend * sin(aSeed * 12.0 + uTime * 2.2));

    float halfHeight = 0.15;
    float along = position.y + halfHeight;
    vec3 local = t * position.x + b * position.z + bentDir * along;
    vec3 base = dir * (${SPHERE_RADIUS.toFixed(2)} + lift);
    vec3 world = base + local;

    vec3 transformedNormal = normalize(t * normal.x + bentDir * normal.y + b * normal.z);
    vec4 worldPosition = modelMatrix * vec4(world, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * transformedNormal);
    vWorldPosition = worldPosition.xyz;
    vTip = smoothstep(0.04, 0.25, along);
    vEnergy = clamp(energy + uGlobal * 0.38, 0.0, 1.4);
    vPulseColor = pulseColor;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const fragmentShader = `
  precision highp float;
  uniform float uTime;
  uniform float uGlobal;
  uniform vec3 uCameraPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying float vTip;
  varying float vEnergy;
  varying vec3 vPulseColor;

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(uCameraPosition - vWorldPosition);
    vec3 L = normalize(vec3(-0.5, 0.85, 0.65));
    float diffuse = 0.24 + 0.76 * max(dot(N, L), 0.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.2);
    float iridescence = 0.5 + 0.5 * sin((dot(N, V) * 4.2 + vWorldPosition.y * 0.7 + uTime * 0.12) * 3.14159);
    vec3 base = mix(vec3(0.07, 0.12, 0.26), vec3(0.24, 0.21, 0.62), iridescence);
    vec3 spectral = mix(vec3(0.40, 0.96, 1.0), vec3(1.0, 0.38, 0.74), iridescence);
    vec3 nodeColor = length(vPulseColor) > 0.01 ? normalize(vPulseColor) * 0.9 : spectral;
    vec3 color = base * diffuse;
    color += spectral * rim * (0.28 + 0.28 * uGlobal);
    color += nodeColor * vEnergy * (0.34 + vTip * 0.7);
    color += vec3(1.0, 0.84, 0.58) * pow(vTip, 5.0) * (0.08 + vEnergy * 0.24);
    gl_FragColor = vec4(color, 1.0);
  }
`

function fibonacciDirections(count) {
  const values = new Float32Array(count * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let index = 0; index < count; index += 1) {
    const y = 1 - (index / Math.max(1, count - 1)) * 2
    const radius = Math.sqrt(Math.max(0, 1 - y * y))
    const angle = golden * index
    values[index * 3] = Math.cos(angle) * radius
    values[index * 3 + 1] = y
    values[index * 3 + 2] = Math.sin(angle) * radius
  }
  return values
}

function buildFiberGeometry(count) {
  const source = new THREE.ConeGeometry(0.04, 0.3, 3, 1, false)
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.setIndex(source.index)
  Object.entries(source.attributes).forEach(([name, attribute]) => geometry.setAttribute(name, attribute))
  geometry.setAttribute('aDirection', new THREE.InstancedBufferAttribute(fibonacciDirections(count), 3))
  const spins = new Float32Array(count)
  const seeds = new Float32Array(count)
  for (let index = 0; index < count; index += 1) {
    spins[index] = (index * 2.3999632297) % (Math.PI * 2)
    seeds[index] = ((index * 16807) % 2147483647) / 2147483647
  }
  geometry.setAttribute('aSpin', new THREE.InstancedBufferAttribute(spins, 1))
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))
  geometry.instanceCount = count
  source.dispose()
  return geometry
}

export function createPulsePeltScene({ canvas, onFirstFrame, onProgress, onComplete, onRipple }) {
  if (!window.WebGLRenderingContext) throw new Error('WebGL unavailable')

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const lowTier = innerWidth <= 340 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
  const fiberCount = lowTier ? 1080 : 1680
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !lowTier,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowTier ? 1.25 : 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40)
  let azimuth = 0.22
  let elevation = -0.08
  let baseDistance = 10
  let zoomFactor = 1
  let distance = baseDistance

  const uniforms = {
    uTime: { value: 0 },
    uGlobal: { value: 0 },
    uWaveCount: { value: 0 },
    uNodeCount: { value: 0 },
    uWaveDirs: { value: Array.from({ length: MAX_WAVES }, () => new THREE.Vector3()) },
    uWaveData: { value: Array.from({ length: MAX_WAVES }, () => new THREE.Vector4()) },
    uNodeDirs: { value: Array.from({ length: MAX_NODES }, () => new THREE.Vector3()) },
    uNodeColors: { value: NODE_COLORS.map((color) => new THREE.Color(color)) },
    uCameraPosition: { value: camera.position },
  }

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  })
  const fibers = new THREE.Mesh(buildFiberGeometry(fiberCount), material)
  fibers.frustumCulled = false
  scene.add(fibers)

  const coreMaterial = new THREE.MeshBasicMaterial({
    color: '#18265c',
    transparent: true,
    opacity: 0.92,
  })
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.29, lowTier ? 3 : 5), coreMaterial)
  scene.add(core)

  const haloMaterial = new THREE.MeshBasicMaterial({
    color: '#765fff',
    transparent: true,
    opacity: 0.13,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  })
  const halo = new THREE.Mesh(new THREE.IcosahedronGeometry(1.54, 3), haloMaterial)
  scene.add(halo)

  const starCount = lowTier ? 140 : 220
  const starPositions = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i += 1) {
    const radius = 5 + Math.random() * 8
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    starPositions[i * 3 + 1] = radius * Math.cos(phi)
    starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
  }
  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: '#9fb9ff',
      size: lowTier ? 0.022 : 0.026,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  )
  scene.add(stars)

  const nodeMeshes = NODE_COLORS.map((color) => {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.07, 1),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 }),
    )
    mesh.visible = false
    scene.add(mesh)
    return mesh
  })

  const hitSphere = new THREE.Mesh(
    new THREE.SphereGeometry(HIT_RADIUS, 20, 16),
    new THREE.MeshBasicMaterial({ visible: false }),
  )
  scene.add(hitSphere)
  const raycaster = new THREE.Raycaster()
  const pointerNdc = new THREE.Vector2()
  const waves = []
  const nodes = []
  const pointers = new Map()
  let lastTrailAt = 0
  let lastTrailX = 0
  let lastTrailY = 0
  let twoFingerBase = null
  let harmonyStart = -1
  let resetStart = -1
  let paused = false
  let disposed = false
  let firstFrameSent = false
  let raf = 0
  let previous = performance.now()

  function updateCamera() {
    const cosElevation = Math.cos(elevation)
    camera.position.set(
      distance * Math.sin(azimuth) * cosElevation,
      distance * Math.sin(elevation),
      distance * Math.cos(azimuth) * cosElevation,
    )
    camera.lookAt(0, 0, 0)
    uniforms.uCameraPosition.value.copy(camera.position)
  }

  function resize() {
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    baseDistance = THREE.MathUtils.clamp(5.34 / camera.aspect, 8.8, 11.8)
    distance = baseDistance * zoomFactor
    camera.updateProjectionMatrix()
    updateCamera()
  }

  function hitDirection(clientX, clientY) {
    const rect = canvas.getBoundingClientRect()
    pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointerNdc, camera)
    const hit = raycaster.intersectObject(hitSphere, false)[0]
    return hit ? hit.point.normalize() : null
  }

  function addWave(direction, strength = 1) {
    waves.push({ direction: direction.clone(), born: performance.now(), strength })
    while (waves.length > MAX_WAVES) waves.shift()
    onRipple?.(false, nodes.length)
  }

  function tryLockNode(direction) {
    if (nodes.length >= MAX_NODES) return false
    const minDot = Math.cos(THREE.MathUtils.degToRad(24))
    if (nodes.some((node) => node.direction.dot(direction) > minDot)) return false
    const index = nodes.length
    nodes.push({ direction: direction.clone(), born: performance.now() })
    const mesh = nodeMeshes[index]
    mesh.visible = true
    mesh.position.copy(direction).multiplyScalar(1.61)
    mesh.lookAt(mesh.position.clone().multiplyScalar(2))
    mesh.material.opacity = 1
    mesh.scale.setScalar(0.01)
    onProgress?.(nodes.length)
    onRipple?.(true, index)
    if (nodes.length === MAX_NODES) {
      harmonyStart = performance.now()
      onComplete?.()
    }
    return true
  }

  function seedAt(direction, lock = true, strength = 1) {
    if (!direction) return false
    addWave(direction, strength)
    if (lock) tryLockNode(direction)
    return true
  }

  function pointerDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  function twoFingerSnapshot() {
    const values = [...pointers.values()]
    if (values.length < 2) return null
    return {
      midpointX: (values[0].x + values[1].x) / 2,
      midpointY: (values[0].y + values[1].y) / 2,
      spread: pointerDistance(values[0], values[1]),
      azimuth,
      elevation,
      distance,
    }
  }

  function onPointerDown(event) {
    canvas.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, mode: 'pending' })
    if (pointers.size === 1) {
      const state = pointers.get(event.pointerId)
      const direction = hitDirection(event.clientX, event.clientY)
      state.mode = direction ? 'sculpt' : 'orbit'
      state.startX = event.clientX
      state.startY = event.clientY
      if (direction) seedAt(direction, true, 1)
      lastTrailAt = performance.now()
      lastTrailX = event.clientX
      lastTrailY = event.clientY
    } else if (pointers.size === 2) {
      twoFingerBase = twoFingerSnapshot()
    }
  }

  function onPointerMove(event) {
    const state = pointers.get(event.pointerId)
    if (!state) return
    state.x = event.clientX
    state.y = event.clientY
    if (pointers.size >= 2) {
      const now = twoFingerSnapshot()
      if (!twoFingerBase || !now) return
      azimuth = twoFingerBase.azimuth - (now.midpointX - twoFingerBase.midpointX) * 0.008
      elevation = THREE.MathUtils.clamp(
        twoFingerBase.elevation + (now.midpointY - twoFingerBase.midpointY) * 0.006,
        -1.05,
        1.05,
      )
      const pinchDistance = twoFingerBase.distance * (twoFingerBase.spread / Math.max(20, now.spread))
      zoomFactor = THREE.MathUtils.clamp(pinchDistance / baseDistance, 0.82, 1.25)
      distance = baseDistance * zoomFactor
      updateCamera()
      return
    }
    if (state.mode === 'sculpt') {
      const now = performance.now()
      if (now - lastTrailAt >= 70 && Math.hypot(event.clientX - lastTrailX, event.clientY - lastTrailY) >= 22) {
        const direction = hitDirection(event.clientX, event.clientY)
        if (direction) {
          seedAt(direction, false, 0.72)
          lastTrailAt = now
          lastTrailX = event.clientX
          lastTrailY = event.clientY
        }
      }
    } else if (state.mode === 'orbit') {
      azimuth -= (event.movementX || event.clientX - state.startX) * 0.006
      elevation = THREE.MathUtils.clamp(
        elevation + (event.movementY || event.clientY - state.startY) * 0.005,
        -1.05,
        1.05,
      )
      state.startX = event.clientX
      state.startY = event.clientY
      updateCamera()
    }
  }

  function onPointerUp(event) {
    pointers.delete(event.pointerId)
    if (pointers.size < 2) twoFingerBase = null
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)

  function refreshUniforms(now) {
    uniforms.uWaveCount.value = waves.length
    waves.forEach((wave, index) => {
      uniforms.uWaveDirs.value[index].copy(wave.direction)
      uniforms.uWaveData.value[index].set(
        Math.min(2.4, (now - wave.born) / 1000),
        wave.strength,
        index % MAX_NODES,
        0,
      )
    })
    uniforms.uNodeCount.value = nodes.length
    nodes.forEach((node, index) => {
      uniforms.uNodeDirs.value[index].copy(node.direction)
      const reveal = THREE.MathUtils.smoothstep((now - node.born) / 360, 0, 1)
      nodeMeshes[index].scale.setScalar(THREE.MathUtils.lerp(0.01, 1, reveal))
      nodeMeshes[index].rotation.y += 0.015
    })
    if (harmonyStart >= 0) {
      const harmony = Math.min(1, (now - harmonyStart) / 1400)
      uniforms.uGlobal.value = harmony * harmony * (3 - 2 * harmony)
    }
    if (resetStart >= 0) {
      const progress = Math.min(1, (now - resetStart) / 650)
      uniforms.uGlobal.value *= 1 - progress
      nodeMeshes.forEach((mesh, index) => {
        if (index < nodes.length) mesh.scale.setScalar(Math.max(0.001, 1 - progress))
      })
      if (progress >= 1) {
        nodes.splice(0)
        waves.splice(0)
        nodeMeshes.forEach((mesh) => {
          mesh.visible = false
          mesh.material.opacity = 0
        })
        harmonyStart = -1
        resetStart = -1
        uniforms.uNodeCount.value = 0
        uniforms.uWaveCount.value = 0
        onProgress?.(0)
      }
    }
    coreMaterial.color.setRGB(
      0.08 + uniforms.uGlobal.value * 0.08,
      0.12 + uniforms.uGlobal.value * 0.08,
      0.31 + uniforms.uGlobal.value * 0.24,
    )
    haloMaterial.opacity = 0.1 + uniforms.uGlobal.value * 0.16
  }

  function frame(now) {
    if (disposed || paused) return
    raf = requestAnimationFrame(frame)
    const delta = Math.min(50, now - previous)
    previous = now
    uniforms.uTime.value = now / 1000
    refreshUniforms(now)
    if (!reducedMotion) {
      fibers.rotation.y += delta * 0.000025
      stars.rotation.y -= delta * 0.000008
      halo.rotation.y += delta * 0.000015
    }
    renderer.render(scene, camera)
    if (!firstFrameSent) {
      firstFrameSent = true
      onFirstFrame?.()
    }
  }

  function setPaused(nextPaused) {
    if (paused === nextPaused || disposed) return
    paused = nextPaused
    cancelAnimationFrame(raf)
    if (!paused) {
      previous = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }

  function reset() {
    if (resetStart >= 0) return
    resetStart = performance.now()
  }

  function injectDemoWave(index = 0) {
    const demos = [
      new THREE.Vector3(-0.35, 0.28, 0.89),
      new THREE.Vector3(0.42, -0.06, 0.91),
      new THREE.Vector3(0.08, 0.58, 0.81),
    ]
    seedAt(demos[index % demos.length].normalize(), false, 0.88)
  }

  function dispose() {
    disposed = true
    cancelAnimationFrame(raf)
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
    fibers.geometry.dispose()
    material.dispose()
    core.geometry.dispose()
    coreMaterial.dispose()
    halo.geometry.dispose()
    haloMaterial.dispose()
    starGeometry.dispose()
    stars.material.dispose()
    nodeMeshes.forEach((mesh) => {
      mesh.geometry.dispose()
      mesh.material.dispose()
    })
    hitSphere.geometry.dispose()
    hitSphere.material.dispose()
    renderer.dispose()
  }

  updateCamera()
  resize()
  addEventListener('resize', resize)
  raf = requestAnimationFrame(frame)

  return {
    setPaused,
    reset,
    injectDemoWave,
    dispose() {
      removeEventListener('resize', resize)
      dispose()
    },
  }
}

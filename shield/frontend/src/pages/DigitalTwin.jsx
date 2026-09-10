import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useSelector } from 'react-redux'
import { BELT } from '../lib/constants'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'
import {
  buildTrussGeometry,
  buildIdlers,
  buildDriveStation,
  buildTailStation,
  buildSensorGantries,
  buildBeltMesh,
  buildBeltTexture,
  buildOreStream,
} from '../components/digital-twin/scene/buildConveyorScene'
import {
  Activity,
  Thermometer,
  Zap,
  Cpu,
  Gauge,
  Wifi,
  ImagePlus,
  Upload,
  X,
  ScanSearch,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock3,
} from 'lucide-react'

const PRESETS = {
  'Orbit View': { pos: [0, 20, 40], target: [0, 1, 0] },
  'Head Discharge': { pos: [45, 10, 20], target: [35, 1, 0] },
  'Tail Hopper': { pos: [-45, 10, 20], target: [-35, 1, 0] },
  'Top-Down Plan': { pos: [0, 50, 0.1], target: [0, 0, 0] },
}

const STALE_AFTER_MS = 60 * 1000
const LAST_READING_KEY = 'cb001_last_known_telemetry'

function disposeMaterial(mat) {
  if (!mat) return

  const arr = Array.isArray(mat) ? mat : [mat]

  arr.forEach(m => {
    Object.keys(m).forEach(k => {
      if (m[k]?.isTexture) m[k].dispose()
    })

    m.dispose()
  })
}

function getTimestampMs(value) {
  if (value === null || value === undefined) {
    return null
  }

  if (value instanceof Date) {
    const timestamp = value.getTime()

    return Number.isFinite(timestamp)
      ? timestamp
      : null
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null
    }

    return value < 100000000000
      ? value * 1000
      : value
  }

  if (typeof value === 'string') {
    const timestamp = Date.parse(value)

    return Number.isFinite(timestamp)
      ? timestamp
      : null
  }

  if (
    typeof value === 'object' &&
    typeof value.toMillis === 'function'
  ) {
    try {
      const timestamp = value.toMillis()

      return Number.isFinite(timestamp)
        ? timestamp
        : null
    } catch {
      return null
    }
  }

  if (
    typeof value === 'object' &&
    typeof value.seconds === 'number'
  ) {
    return (
      value.seconds * 1000
    ) + (
        (value.nanoseconds || 0) / 1000000
      )
  }

  if (
    typeof value === 'object' &&
    typeof value._seconds === 'number'
  ) {
    return (
      value._seconds * 1000
    ) + (
        (value._nanoseconds || 0) / 1000000
      )
  }

  return null
}

const HEALTH_VISUAL = {
  HEALTHY: {
    color: 0x22c55e,
    label: 'HEALTHY',
  },
  WARNING: {
    color: 0xf59e0b,
    label: 'WARNING',
  },
  CRITICAL: {
    color: 0xef4444,
    label: 'CRITICAL',
  },
}

const HEALTH_TINT = {
  HEALTHY: new THREE.Color(0x22c55e),
  WARNING: new THREE.Color(0xf59e0b),
  CRITICAL: new THREE.Color(0xef4444),
}

/*
 * Health bands used by BOTH the telemetry card and the 3D belt.
 * edge_health is a normalized value in the existing telemetry model:
 *   1.00 = 100%
 *   0.80 = 80%
 *   0.60 = 60%
 *
 * This is a visualization classification, not an engineering limit.
 */
function normalizeHealth(value) {
  const raw = Number(value)

  if (!Number.isFinite(raw)) {
    return null
  }

  // Support the existing normalized 0..1 telemetry model and also
  // percentage values 0..100 without changing the stored schema.
  const health = raw > 1 && raw <= 100
    ? raw / 100
    : raw

  if (health < 0 || health > 1) {
    return null
  }

  return health
}

function getHealthVisualState(value) {
  const health = normalizeHealth(value)

  if (health === null) {
    return null
  }

  if (health >= 0.80) {
    return HEALTH_VISUAL.HEALTHY
  }

  if (health >= 0.60) {
    return HEALTH_VISUAL.WARNING
  }

  return HEALTH_VISUAL.CRITICAL
}

const LOGICAL_BELT_LENGTH_M = 300
const HEALTH_MAX_SEGMENTS = 12

function modDistance(value, length) {
  if (!Number.isFinite(value) || !Number.isFinite(length) || length <= 0) {
    return 0
  }

  return ((value % length) + length) % length
}

/*
 * Install a health-color attribute on the REAL conveyor belt geometry.
 *
 * No second belt, no plane, no card, no floating mesh and no custom path
 * geometry is created. The existing belt mesh itself is recoloured.
 *
 * The path coordinate comes directly from the belt's existing UV U value:
 * buildBeltMesh assigns U = t * 18, where t is the exact closed-path fraction.
 */
function prepareHealthVertexColors(beltMesh) {
  const geometry = beltMesh.geometry

  const position = geometry.getAttribute('position')
  if (!position) return null

  const colorArray = new Float32Array(
    position.count * 3
  )

  /* White = no health tint. */
  for (let i = 0; i < position.count; i++) {
    colorArray[i * 3] = 1
    colorArray[i * 3 + 1] = 1
    colorArray[i * 3 + 2] = 1
  }

  const colorAttribute =
    new THREE.BufferAttribute(
      colorArray,
      3
    )

  geometry.setAttribute(
    'color',
    colorAttribute
  )

  const material = beltMesh.material
  material.vertexColors = true
  material.needsUpdate = true

  return colorAttribute
}

function setHealthVertexColor(
  colorAttribute,
  vertexIndex,
  color,
  strength = 0.92
) {
  const c =
    color?.isColor
      ? color
      : new THREE.Color(color)

  /*
   * MeshStandardMaterial multiplies the original belt texture by vertex
   * colour. The belt is dark, therefore a normal 0..1 health colour would
   * disappear into the rubber texture. Use a controlled HDR-like multiplier
   * to keep the tread visible while making the health state obvious.
   */
  const targetR = 0.30 + c.r * 2.20
  const targetG = 0.30 + c.g * 2.20
  const targetB = 0.30 + c.b * 2.20

  colorAttribute.setXYZ(
    vertexIndex,
    THREE.MathUtils.lerp(1, targetR, strength),
    THREE.MathUtils.lerp(1, targetG, strength),
    THREE.MathUtils.lerp(1, targetB, strength)
  )
}

function pointIsInsideHealthInterval(
  point,
  tailBoundary,
  length,
  pathLength
) {
  if (length <= 0 || pathLength <= 0) {
    return false
  }

  const local = modDistance(
    point - tailBoundary,
    pathLength
  )

  return local <= length
}

/*
 * Paint health history directly on the existing conveyor belt geometry.
 *
 * This is the core logic agreed for the Digital Twin:
 *
 *   HEAD -> TAIL -> RETURN -> HEAD
 *
 * Every new health state is born at HEAD. While that state remains active,
 * its coloured section grows from HEAD towards TAIL by:
 *
 *   distance = belt speed × elapsed time
 *
 * When the state changes, the previous section freezes at its current
 * physical length and then moves around the closed loop with the belt.
 *
 * Therefore:
 *
 *   92 -> 91 -> 90       = ONE continuous GREEN section
 *   90 -> 74             = GREEN closes, AMBER starts at HEAD
 *   74 -> 73 -> 72       = ONE continuous AMBER section
 *   72 -> 91             = AMBER closes, GREEN starts at HEAD
 *
 * There are no cards, planes, cloned meshes or floating health objects.
 */
function updateHealthVertexColors(
  colorAttribute,
  geometry,
  segments,
  currentTravel,
  pathLength,
  headDistance
) {
  if (
    !colorAttribute ||
    !geometry ||
    !Number.isFinite(pathLength) ||
    pathLength <= 0
  ) {
    return
  }

  const uv = geometry.getAttribute('uv')
  if (!uv) {
    return
  }

  const vertexCount = uv.count

  /* --------------------------------------------------------------- */
  /* Reset to the original belt appearance.                          */
  /* --------------------------------------------------------------- */

  for (let i = 0; i < vertexCount; i++) {
    colorAttribute.setXYZ(
      i,
      1,
      1,
      1
    )
  }

  /* --------------------------------------------------------------- */
  /* Keep only history that can still be on one complete belt loop.   */
  /* --------------------------------------------------------------- */

  const visibleSegments = segments.filter(segment => {
    const endTravel =
      segment.endTravel === null ||
        segment.endTravel === undefined
        ? currentTravel
        : segment.endTravel

    return endTravel >=
      currentTravel - pathLength
  })

  if (visibleSegments.length === 0) {
    colorAttribute.needsUpdate = true
    return
  }

  /*
   * IMPORTANT:
   *
   * Newer states have priority. If two old/new sections touch or overlap
   * because of the loop wrap, the latest health state must be visible.
   */
  for (let i = 0; i < vertexCount; i++) {
    /*
     * buildBeltMesh uses:
     *     U = t * 18
     * where t = distance / totalPathLength.
     */
    const pathCoordinate =
      modDistance(
        (uv.getX(i) / 18) * pathLength,
        pathLength
      )

    for (
      let s = visibleSegments.length - 1;
      s >= 0;
      s--
    ) {
      const segment =
        visibleSegments[s]

      const endTravel =
        segment.endTravel === null ||
          segment.endTravel === undefined
          ? currentTravel
          : segment.endTravel

      const length = Math.min(
        Math.max(
          0,
          endTravel -
          segment.startTravel
        ),
        pathLength
      )

      if (length <= 0.001) {
        continue
      }

      /*
       * HEAD is the fixed leading reference point for the currently
       * observed health state.
       *
       * Once a state closes, its whole section moves toward TAIL by the
       * amount the belt has travelled since that state closed.
       */
      const headBoundary =
        modDistance(
          headDistance -
          (currentTravel - endTravel),
          pathLength
        )

      /* The coloured section extends backwards from headBoundary. */
      const tailBoundary =
        modDistance(
          headBoundary - length,
          pathLength
        )

      if (
        pointIsInsideHealthInterval(
          pathCoordinate,
          tailBoundary,
          length,
          pathLength
        )
      ) {
        setHealthVertexColor(
          colorAttribute,
          i,
          HEALTH_TINT[segment.state] ??
          HEALTH_TINT.HEALTHY,
          0.92
        )

        break
      }
    }
  }

  colorAttribute.needsUpdate = true
}

export default function DigitalTwin() {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const controlsRef = useRef(null)
  const beltRef = useRef(null)
  const beltSpeedRef = useRef(2.4)
  const healthSegmentsRef = useRef([])
  const beltTravelRef = useRef(0)
  const lastHealthTimestampRef = useRef(null)
  const lastHealthStateRef = useRef(null)
  const rafRef = useRef(null)

  // Image analysis refs
  const fileInputRef = useRef(null)

  const [activePreset, setActivePreset] = useState('Orbit View')
  const [mode, setMode] = useState('LIVE')

  // Image analysis state
  const [showImageAnalysis, setShowImageAnalysis] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isDraggingImage, setIsDraggingImage] = useState(false)

  // Last-known telemetry state
  const [lastKnownReading, setLastKnownReading] = useState(() => {
    try {
      const stored = localStorage.getItem(LAST_READING_KEY)

      if (!stored) {
        return null
      }

      const parsed = JSON.parse(stored)

      if (!parsed?.features) {
        return null
      }

      return parsed
    } catch {
      return null
    }
  })

  const [currentTime, setCurrentTime] = useState(Date.now())

  const { conveyorStatus, beltSpeed } = useSelector(s => s.twin)
  const { liveReading, connectionStatus } = useSelector(s => s.sensor)

  // Keep belt speed ref in sync with Redux without rebuilding scene
  useEffect(() => {
    beltSpeedRef.current = Number(beltSpeed) || 0
  }, [beltSpeed])

  // Refresh the displayed telemetry age periodically.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Build the Three.js scene once on mount
  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const W = Math.max(el.clientWidth, 1)
    const H = Math.max(el.clientHeight, 1)

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#071019')
    scene.fog = new THREE.FogExp2('#071019', 0.0045)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 500)
    camera.position.set(0, 20, 40)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    rendererRef.current = renderer
    el.appendChild(renderer.domElement)

    // Lights
    const ambient = new THREE.HemisphereLight(0xb9d5e5, 0x101820, 1.35)
    scene.add(ambient)

    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(15, 45, 18)
    key.castShadow = true
    key.shadow.mapSize.width = 2048
    key.shadow.mapSize.height = 2048
    key.shadow.camera.left = -70
    key.shadow.camera.right = 70
    key.shadow.camera.top = 45
    key.shadow.camera.bottom = -45
    key.shadow.bias = -0.00015
    scene.add(key)

    const fill = new THREE.DirectionalLight(0x4dc9e8, 0.55)
    fill.position.set(-35, 18, -25)
    scene.add(fill)

    const rim = new THREE.DirectionalLight(0xffd6a0, 0.28)
    rim.position.set(35, 15, -35)
    scene.add(rim)

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 90),
      new THREE.MeshStandardMaterial({
        color: 0x101820,
        roughness: 0.92,
        metalness: 0.04,
      })
    )

    ground.rotation.x = -Math.PI / 2
    ground.position.y = -5.2
    ground.receiveShadow = true
    scene.add(ground)

    const grid = new THREE.GridHelper(
      220,
      55,
      0x263641,
      0x18252e
    )

    grid.position.set(0, -5.18, 0)
    scene.add(grid)

    // Conveyor geometry
    const L = BELT.LENGTH / 2
    const R = BELT.PULLEY_R

    buildTrussGeometry(scene, L)
    buildIdlers(scene, L)
    buildDriveStation(scene, L)
    buildTailStation(scene, L)
    buildSensorGantries(scene, L)
    buildOreStream(scene, L, R)

    // Belt
    const beltTex = buildBeltTexture()

    if (beltTex) {
      beltTex.colorSpace = THREE.SRGBColorSpace
      beltTex.wrapS = beltTex.wrapT = THREE.RepeatWrapping
      beltTex.needsUpdate = true
    }

    const belt = buildBeltMesh(scene, L, R, beltTex)
    beltRef.current = belt

    /*
     * HEALTH HISTORY
     *
     * Health is painted directly onto the EXISTING conveyor belt mesh using
     * vertex colours. There is deliberately no cloned belt, plane, card,
     * marker or floating health object.
     */
    const pathLength = belt.totalLength || 1
    const healthColorAttribute =
      prepareHealthVertexColors(belt.mesh)



    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)

    controls.enableDamping = true
    controls.dampingFactor = 0.055
    controls.minDistance = 8
    controls.maxDistance = 145
    controls.maxPolarAngle = Math.PI * 0.49
    controls.target.set(0, 1, 0)
    controls.update()

    controlsRef.current = controls

    // Animate. Use performance.now() instead of deprecated THREE.Clock.
    let previousFrameTime = performance.now()

    function animate() {
      rafRef.current = requestAnimationFrame(animate)

      const now = performance.now()
      const delta = Math.min(Math.max((now - previousFrameTime) / 1000, 0), 0.05)
      previousFrameTime = now
      const speed = Math.max(0, beltSpeedRef.current)
      const R_ref = BELT.PULLEY_R
      const currentBelt = beltRef.current
      const pathLength = currentBelt?.totalLength || 1

      /*
       * Logical 300 m conveyor mapped onto the closed Three.js belt path.
       * speed is m/s; modelDistance is in Three.js scene units.
       */
      const modelSpeed =
        speed * (pathLength / LOGICAL_BELT_LENGTH_M)

      const modelDistance =
        modelSpeed * delta

      beltTravelRef.current += modelDistance

      // Belt texture scroll. Delta time keeps the animation stable across FPS changes.
      const beltMap = currentBelt?.mesh?.material?.map

      if (beltMap && modelDistance > 0) {
        beltMap.offset.x +=
          modelDistance / pathLength

        if (beltMap.offset.x > 1000) {
          beltMap.offset.x -= 1000
        }
      }

      /*
       * Recolour the ACTUAL belt vertices. The belt geometry itself never
       * moves; its texture and health material coordinate move logically.
       */
      updateHealthVertexColors(
        healthColorAttribute,
        currentBelt?.mesh?.geometry,
        healthSegmentsRef.current,
        beltTravelRef.current,
        pathLength,
        currentBelt?.straightLength ??
        Math.min(
          pathLength,
          (BELT.LENGTH_3D || BELT.LENGTH || 60) * 2
        )
      )

      // Roller rotation
      const angSpeed =
        (modelSpeed / Math.max(R_ref, 0.1)) * delta

      scene.traverse(obj => {
        if (obj.userData?.isConveyorRoller) {
          obj.rotation.x += angSpeed
        }

        if (
          obj.userData?.isDrivePulley ||
          obj.userData?.isTailPulley
        ) {
          obj.rotation.z += angSpeed
        }
      })

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    function onResize() {
      if (!el) return

      const w = Math.max(el.clientWidth, 1)
      const h = Math.max(el.clientHeight, 1)

      camera.aspect = w / h
      camera.updateProjectionMatrix()

      renderer.setSize(w, h)
    }

    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)

      controls.dispose()

      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()

        if (obj.material) {
          disposeMaterial(obj.material)
        }
      })

      renderer.dispose()

      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement)
      }

      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
      controlsRef.current = null
      beltRef.current = null
      healthSegmentsRef.current = []
      beltTravelRef.current = 0
      lastHealthTimestampRef.current = null
      lastHealthStateRef.current = null
    }
  }, [])

  const applyPreset = useCallback((name) => {
    const preset = PRESETS[name]

    if (
      !preset ||
      !cameraRef.current ||
      !controlsRef.current
    ) {
      return
    }

    cameraRef.current.position.set(...preset.pos)
    controlsRef.current.target.set(...preset.target)
    controlsRef.current.update()

    setActivePreset(name)
  }, [])

  // ============================================================
  // TELEMETRY STATE
  // ============================================================

  const liveTimestamp =
    getTimestampMs(liveReading?.timestamp)

  const liveAge =
    liveTimestamp !== null
      ? Math.max(0, currentTime - liveTimestamp)
      : null

  const hasLiveFeatures =
    Boolean(
      liveReading?.features &&
      typeof liveReading.features === 'object' &&
      Object.keys(liveReading.features).length > 0
    )

  const hasFreshReading =
    hasLiveFeatures &&
    liveTimestamp !== null &&
    liveAge !== null &&
    liveAge <= STALE_AFTER_MS

  // Persist only real timestamped readings.
  useEffect(() => {
    if (!liveReading) {
      return
    }

    const timestamp =
      getTimestampMs(liveReading.timestamp)

    if (
      !liveReading.features ||
      timestamp === null
    ) {
      return
    }

    const snapshot = {
      ...liveReading,
      _lastKnownAt: timestamp,
    }

    try {
      localStorage.setItem(
        LAST_READING_KEY,
        JSON.stringify(snapshot)
      )

      setLastKnownReading(snapshot)
    } catch (error) {
      console.warn(
        '[DigitalTwin] Unable to persist telemetry:',
        error
      )
    }
  }, [liveReading])

  const cloudOffline =
    connectionStatus === 'OFFLINE' ||
    connectionStatus === 'DISCONNECTED' ||
    connectionStatus === 'ERROR'

  let telemetryState = 'NO_DATA'

  if (hasFreshReading) {
    telemetryState = 'LIVE'
  } else if (cloudOffline && lastKnownReading) {
    telemetryState = 'CLOUD_OFFLINE'
  } else if (lastKnownReading) {
    telemetryState = 'STALE'
  }

  const displayReading =
    hasFreshReading
      ? liveReading
      : lastKnownReading

  // ============================================================
  // LIVE SENSOR READINGS
  // ============================================================

  const f = displayReading?.features || {}

  const tempBelt = f.temp_belt ?? null
  const tempMotor = f.temp_motor ?? null
  const vibRms = f.vib_rms ?? null
  const currRms = f.current_rms ?? null
  const edgeHealth = displayReading?.edge_health ?? null

  /* ============================================================
     BELT HEALTH HISTORY

     A new belt section is created only when the visual health state changes.
     Numeric changes inside the same state remain one continuous section.
  ============================================================ */
  useEffect(() => {
    if (!hasFreshReading) {
      return
    }

    if (liveTimestamp === null) {
      return
    }

    if (lastHealthTimestampRef.current === liveTimestamp) {
      return
    }

    const health = normalizeHealth(edgeHealth)
    const state = getHealthVisualState(health)
    const belt = beltRef.current

    if (!state || !belt || !Number.isFinite(belt.totalLength)) {
      return
    }

    lastHealthTimestampRef.current = liveTimestamp

    const currentTravel =
      beltTravelRef.current

    const pathLength =
      belt.totalLength

    /*
     * The head sensor is the reference point.
     *
     * The health-history direction intentionally follows the diagram:
     * HEAD -> TAIL -> RETURN -> HEAD.
     */
    const headDistance =
      belt.straightLength ??
      Math.min(
        pathLength,
        (BELT.LENGTH_3D || BELT.LENGTH || 60) * 2
      )

    const startMaterialDistance =
      modDistance(
        headDistance - currentTravel,
        pathLength
      )

    const previousState =
      lastHealthStateRef.current

    const segments =
      healthSegmentsRef.current

    /*
     * Same visual state: extend the current continuous section.
     */
    if (
      previousState === state.label &&
      segments.length > 0
    ) {
      const currentSegment =
        segments[segments.length - 1]

      currentSegment.health = health
      return
    }

    /*
     * State changed. Close the previous section at the exact belt distance
     * travelled, then start a new section.
     */
    if (segments.length > 0) {
      segments[segments.length - 1].endTravel =
        currentTravel
    }

    segments.push({
      state: state.label,
      health,
      startTravel: currentTravel,
      endTravel: null,
      startMaterialDistance,
    })

    lastHealthStateRef.current =
      state.label

    /*
     * Keep enough history for the visual sequence, but never allow an
     * unbounded array. The shader only renders the latest complete loop.
     */
    if (segments.length > HEALTH_MAX_SEGMENTS) {
      segments.splice(
        0,
        segments.length - HEALTH_MAX_SEGMENTS
      )
    }
  }, [
    hasFreshReading,
    liveTimestamp,
    edgeHealth,
  ])

  const fmt = (v, dec = 1, unit = '') =>
    v !== null && v !== undefined
      ? `${Number(v).toFixed(dec)}${unit}`
      : '—'

  const normalizedEdgeHealth =
    normalizeHealth(edgeHealth)

  const sensorChannels = [
    {
      id: 'TT-101',
      label: 'Belt Temp',
      value: fmt(tempBelt, 1, ' °C'),
      icon: Thermometer,
      color:
        tempBelt === null
          ? 'var(--color-text-muted)'
          : tempBelt > 65
            ? 'var(--color-critical)'
            : tempBelt > 48
              ? 'var(--color-warning)'
              : 'var(--color-healthy)',
    },
    {
      id: 'TT-201',
      label: 'Motor Temp',
      value: fmt(tempMotor, 1, ' °C'),
      icon: Cpu,
      color:
        tempMotor === null
          ? 'var(--color-text-muted)'
          : tempMotor > 80
            ? 'var(--color-critical)'
            : tempMotor > 65
              ? 'var(--color-warning)'
              : 'var(--color-healthy)',
    },
    {
      id: 'VT-301',
      label: 'Vibration RMS',
      value: fmt(vibRms, 2, ' mm/s'),
      icon: Activity,
      color:
        vibRms === null
          ? 'var(--color-text-muted)'
          : vibRms > 7.1
            ? 'var(--color-critical)'
            : vibRms > 4.5
              ? 'var(--color-warning)'
              : 'var(--color-healthy)',
    },
    {
      id: 'CT-401',
      label: 'Motor Current',
      value: fmt(currRms, 3, ' A'),
      icon: Zap,
      color:
        currRms === null
          ? 'var(--color-text-muted)'
          : currRms > 3.5
            ? 'var(--color-critical)'
            : currRms > 2.5
              ? 'var(--color-warning)'
              : 'var(--color-healthy)',
    },
    {
      id: 'EH-501',
      label: 'Edge Health',
      value:
        normalizedEdgeHealth !== null
          ? `${(normalizedEdgeHealth * 100).toFixed(0)}%`
          : '—',
      icon: Gauge,
      color:
        normalizedEdgeHealth === null
          ? 'var(--color-text-muted)'
          : normalizedEdgeHealth < 0.6
            ? 'var(--color-critical)'
            : normalizedEdgeHealth < 0.8
              ? 'var(--color-warning)'
              : 'var(--color-healthy)',
    },
  ]

  const isOnline = telemetryState === 'LIVE'

  // ============================================================
  // BELT IMAGE ANALYSIS
  // ============================================================

  const handleImageSelect = (file) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10 MB.')
      return
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }

    const previewUrl = URL.createObjectURL(file)

    setSelectedImage(file)
    setImagePreview(previewUrl)
  }

  const handleFileInput = (event) => {
    const file = event.target.files?.[0]

    if (file) {
      handleImageSelect(file)
    }

    event.target.value = ''
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDraggingImage(false)

    const file = event.dataTransfer.files?.[0]

    if (file) {
      handleImageSelect(file)
    }
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    setIsDraggingImage(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    setIsDraggingImage(false)
  }

  const removeSelectedImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }

    setSelectedImage(null)
    setImagePreview('')
  }

  const handleAnalyzeImage = () => {
    if (!selectedImage) return

    /*
      AI ANALYSIS ENDPOINT IS NOT CONNECTED YET.

      When your Roboflow / YOLO / FastAPI endpoint is ready:

      const formData = new FormData()
      formData.append('image', selectedImage)

      const response = await fetch(YOUR_API_URL, {
        method: 'POST',
        body: formData,
      })

      Keep the returned detection data in React state and
      render the actual model output here. Do not fabricate
      detection results.
    */

    alert(
      'Image selected successfully. Connect the Roboflow/YOLO analysis endpoint to enable AI results.'
    )
  }

  // Cleanup image URL when component unmounts.
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const telemetryStatus = {
    LIVE: {
      label: 'LIVE TELEMETRY',
      color: 'var(--color-healthy)',
      border: 'rgba(52,211,153,0.16)',
      background: 'rgba(52,211,153,0.045)',
      message:
        'Firestore telemetry is updating normally.',
      icon: CheckCircle2,
    },

    STALE: {
      label: 'TELEMETRY STALE',
      color: 'var(--color-warning)',
      border: 'rgba(245,158,11,0.20)',
      background: 'rgba(245,158,11,0.055)',
      message:
        'No new reading received recently. Showing the last known sensor values.',
      icon: Clock3,
    },

    CLOUD_OFFLINE: {
      label: 'CLOUD TELEMETRY OFFLINE',
      color: 'var(--color-critical)',
      border: 'rgba(244,63,94,0.22)',
      background: 'rgba(244,63,94,0.055)',
      message:
        'Cloud telemetry is unavailable. Showing the last known sensor values.',
      icon: AlertTriangle,
    },

    NO_DATA: {
      label: 'NO TELEMETRY DATA',
      color: 'var(--color-text-muted)',
      border: 'var(--color-border)',
      background: 'rgba(255,255,255,0.02)',
      message:
        'Waiting for the first valid telemetry reading from CB_001.',
      icon: Clock3,
    },
  }

  const currentTelemetryStatus =
    telemetryStatus[telemetryState]

  const TelemetryIcon =
    currentTelemetryStatus.icon

  return (
    <div className="space-y-6 pb-10 max-w-7xl mx-auto">

      {/* ======================================================
          PAGE HEADER
      ======================================================= */}

      <PageHeader
        title="3D Digital Twin"
        subtitle="Procedural conveyor visualization with real-time kinematic simulation — belt CB-001 · 300 m logical length · health history mapped directly onto the belt surface"
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() =>
                setMode(m =>
                  m === 'LIVE'
                    ? 'HISTORICAL'
                    : 'LIVE'
                )
              }
              className="text-xs px-3.5 py-1.5 rounded-xl border font-mono font-medium transition-all cursor-pointer"
              style={{
                borderColor:
                  'var(--color-accent)',
                color:
                  'var(--color-accent)',
                background:
                  'rgba(56, 189, 248, 0.1)',
              }}
            >
              Mode: {mode}
            </button>

            <StatusBadge status={conveyorStatus} />
          </div>
        }
      />

      {/* ======================================================
          3D CANVAS
      ======================================================= */}

      <div
        className="relative rounded-2xl overflow-hidden border shadow-2xl"
        style={{
          borderColor: 'var(--color-border)',
          height: '520px',
          background: '#071019',
        }}
      >
        {/* Three.js mount */}
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Camera Preset Bar */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
          {Object.keys(PRESETS).map(name => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              className="text-xs font-mono px-3.5 py-1.5 rounded-xl border backdrop-blur-md font-medium transition-all cursor-pointer"
              style={{
                background:
                  activePreset === name
                    ? 'rgba(56, 189, 248, 0.2)'
                    : 'rgba(7, 16, 25, 0.85)',
                borderColor:
                  activePreset === name
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                color:
                  activePreset === name
                    ? 'var(--color-accent)'
                    : 'var(--color-text-muted)',
              }}
            >
              {name}
            </button>
          ))}

          {/* Image Analysis Button */}
          <button
            onClick={() =>
              setShowImageAnalysis(value => !value)
            }
            className="text-xs font-mono px-3.5 py-1.5 rounded-xl border backdrop-blur-md font-medium transition-all cursor-pointer flex items-center gap-1.5"
            style={{
              background:
                showImageAnalysis
                  ? 'rgba(56, 189, 248, 0.16)'
                  : 'rgba(7, 16, 25, 0.9)',
              borderColor:
                showImageAnalysis
                  ? 'var(--color-accent)'
                  : 'var(--color-border)',
              color:
                showImageAnalysis
                  ? 'var(--color-accent)'
                  : 'var(--color-text-main)',
            }}
          >
            <ImagePlus size={14} />
            Belt Image Analysis
          </button>
        </div>

        {/* HUD — bottom left */}
        <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2 z-10">
          {[
            {
              label: 'Status',
              value: conveyorStatus,
              color:
                conveyorStatus === 'RUNNING'
                  ? 'var(--color-healthy)'
                  : 'var(--color-critical)',
            },
            {
              label: 'Velocity',
              value: `${beltSpeed} m/s`,
              color: 'var(--color-accent)',
            },
            {
              label: 'Sensors',
              value:
                telemetryState === 'LIVE'
                  ? `${sensorChannels.length} Active`
                  : telemetryState === 'STALE'
                    ? `${sensorChannels.length} Last Known`
                    : '0 Active',
              color:
                telemetryState === 'LIVE'
                  ? 'var(--color-healthy)'
                  : 'var(--color-text-muted)',
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="px-3 py-1 rounded-xl text-xs backdrop-blur-md border font-mono"
              style={{
                background:
                  'rgba(7, 16, 25, 0.85)',
                borderColor:
                  'var(--color-border-subtle)',
              }}
            >
              <span className="text-muted">
                {label}:{' '}
              </span>

              <span
                className="font-semibold"
                style={{ color }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Data feed status — bottom right */}
        <div
          className="absolute bottom-4 right-4 text-xs z-10 px-3 py-1.5 rounded-xl backdrop-blur-md border font-mono flex items-center gap-1.5"
          style={{
            background:
              'rgba(7, 16, 25, 0.9)',
            borderColor:
              currentTelemetryStatus.border,
            color:
              currentTelemetryStatus.color,
          }}
        >
          <Wifi size={11} />

          {telemetryState === 'LIVE'
            ? 'Live Telemetry'
            : telemetryState === 'STALE'
              ? 'Telemetry Stale'
              : telemetryState === 'CLOUD_OFFLINE'
                ? 'Cloud Offline'
                : connectionStatus === 'LOADING'
                  ? 'Connecting…'
                  : 'No Data'}
        </div>
      </div>

      {/* ======================================================
          TELEMETRY STATE BANNER
      ======================================================= */}

      <div
        className="rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        style={{
          background:
            currentTelemetryStatus.background,
          borderColor:
            currentTelemetryStatus.border,
        }}
      >
        <div className="flex items-center gap-2.5">
          <TelemetryIcon
            size={15}
            style={{
              color:
                currentTelemetryStatus.color,
            }}
          />

          <div>
            <div
              className="text-[10px] font-tech font-semibold"
              style={{
                color:
                  currentTelemetryStatus.color,
              }}
            >
              {currentTelemetryStatus.label}
            </div>

            <div className="text-[9px] text-muted font-tech mt-0.5">
              {currentTelemetryStatus.message}
            </div>
          </div>
        </div>

        {lastKnownReading &&
          telemetryState !== 'LIVE' && (
            <div className="text-[9px] font-mono text-muted">
              LAST KNOWN:{' '}
              <span className="text-main">
                {lastKnownReading._lastKnownAt
                  ? new Date(
                    lastKnownReading._lastKnownAt
                  ).toLocaleTimeString(
                    'en-IN',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    }
                  )
                  : 'Previously received'}
              </span>
            </div>
          )}
      </div>

      {/* ======================================================
          BELT IMAGE ANALYSIS PANEL
      ======================================================= */}

      {showImageAnalysis && (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background:
              'var(--color-surface)',
            borderColor:
              'var(--color-border)',
          }}
        >
          {/* Panel Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{
              borderColor:
                'var(--color-border)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background:
                    'rgba(56, 189, 248, 0.1)',
                  color:
                    'var(--color-accent)',
                }}
              >
                <ScanSearch size={18} />
              </div>

              <div>
                <div className="text-sm font-semibold text-main">
                  Belt Image Analysis
                </div>

                <div className="text-[11px] text-muted font-mono">
                  Upload a belt photo for visual inspection
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                setShowImageAnalysis(false)
              }
              className="p-2 rounded-lg transition-all cursor-pointer"
              style={{
                color:
                  'var(--color-text-muted)',
              }}
              title="Close"
            >
              <X size={17} />
            </button>
          </div>

          {/* Panel Content */}
          <div className="p-5">
            {!selectedImage ? (
              <div
                onClick={() =>
                  fileInputRef.current?.click()
                }
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className="relative rounded-xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all"
                style={{
                  borderColor:
                    isDraggingImage
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                  background:
                    isDraggingImage
                      ? 'rgba(56, 189, 248, 0.08)'
                      : 'rgba(255,255,255,0.01)',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileInput}
                  className="hidden"
                />

                <div className="flex flex-col items-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{
                      background:
                        'rgba(56, 189, 248, 0.1)',
                      color:
                        'var(--color-accent)',
                    }}
                  >
                    <Upload size={24} />
                  </div>

                  <div className="text-sm font-semibold text-main mb-1">
                    Upload belt image
                  </div>

                  <div className="text-xs text-muted mb-4">
                    Drag & drop your conveyor belt photo here
                  </div>

                  <div
                    className="px-4 py-2 rounded-lg border text-xs font-mono"
                    style={{
                      borderColor:
                        'var(--color-border)',
                      color:
                        'var(--color-accent)',
                      background:
                        'rgba(56, 189, 248, 0.06)',
                    }}
                  >
                    Browse Image
                  </div>

                  <div className="text-[10px] text-muted mt-4">
                    JPG, JPEG, PNG, WEBP · Maximum 10 MB
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
                {/* Image Preview */}
                <div
                  className="relative rounded-xl overflow-hidden border min-h-[280px] flex items-center justify-center"
                  style={{
                    background: '#071019',
                    borderColor:
                      'var(--color-border)',
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Selected conveyor belt"
                    className="max-w-full max-h-[420px] object-contain"
                  />

                  <button
                    onClick={removeSelectedImage}
                    className="absolute top-3 right-3 p-2 rounded-lg border backdrop-blur-md cursor-pointer transition-all"
                    style={{
                      background:
                        'rgba(7,16,25,0.9)',
                      borderColor:
                        'var(--color-border)',
                      color:
                        'var(--color-critical)',
                    }}
                    title="Remove image"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Image Information / Actions */}
                <div
                  className="rounded-xl border p-4 flex flex-col"
                  style={{
                    borderColor:
                      'var(--color-border)',
                    background:
                      'rgba(255,255,255,0.015)',
                  }}
                >
                  <div className="text-[10px] font-mono text-muted mb-2">
                    SELECTED IMAGE
                  </div>

                  <div className="text-sm font-medium text-main break-all mb-4">
                    {selectedImage.name}
                  </div>

                  <div className="space-y-2 text-xs font-mono mb-5">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted">
                        Type
                      </span>

                      <span className="text-main text-right">
                        {selectedImage.type ||
                          'Image'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted">
                        Size
                      </span>

                      <span className="text-main">
                        {(
                          selectedImage.size /
                          (1024 * 1024)
                        ).toFixed(2)}{' '}
                        MB
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto space-y-2">
                    <button
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="w-full px-4 py-2.5 rounded-lg border text-xs font-mono font-medium cursor-pointer transition-all flex items-center justify-center gap-2"
                      style={{
                        borderColor:
                          'var(--color-border)',
                        color:
                          'var(--color-text-main)',
                        background:
                          'rgba(255,255,255,0.025)',
                      }}
                    >
                      <ImagePlus size={14} />
                      Replace Image
                    </button>

                    <button
                      onClick={handleAnalyzeImage}
                      className="w-full px-4 py-2.5 rounded-lg text-xs font-mono font-semibold cursor-pointer transition-all flex items-center justify-center gap-2"
                      style={{
                        background:
                          'var(--color-accent)',
                        color: '#041019',
                      }}
                    >
                      <ScanSearch size={14} />
                      Analyze Image
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================
          LIVE SENSOR TELEMETRY
      ======================================================= */}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold font-display text-main">
            Live Sensor Telemetry — Conveyor CB-001
          </span>

          <span className="text-xs font-mono text-muted">
            {telemetryState === 'LIVE'
              ? 'Real-time · Firestore CB_001'
              : telemetryState === 'STALE'
                ? 'Showing last known telemetry'
                : telemetryState === 'CLOUD_OFFLINE'
                  ? 'Cloud unavailable · last known telemetry'
                  : 'Awaiting telemetry data'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {sensorChannels.map(
            ({ id, label, value, icon: Icon, color }) => (
              <div
                key={id}
                className="p-4 rounded-xl border"
                style={{
                  background:
                    'var(--color-surface)',
                  borderColor:
                    'var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-muted">
                    {id}
                  </span>

                  <Icon
                    size={13}
                    style={{ color }}
                  />
                </div>

                <div className="text-[10px] text-muted mb-0.5">
                  {label}
                </div>

                <div
                  className="text-lg font-mono font-bold"
                  style={{ color }}
                >
                  {value}
                </div>
              </div>
            )
          )}
        </div>

        {/* Physical system info strip */}
        <div
          className="flex flex-wrap gap-x-6 gap-y-1.5 px-4 py-3 rounded-xl border text-[11px] font-mono text-muted"
          style={{
            background:
              'rgba(255,255,255,0.015)',
            borderColor:
              'var(--color-border-subtle)',
          }}
        >
          <span>
            Device ID:{' '}
            <span className="text-main">
              CB_001
            </span>
          </span>

          <span>
            Track:{' '}
            <span className="text-main">
              300 m logical conveyor length
            </span>
          </span>

          <span>
            Sensor Gantries:{' '}
            <span className="text-main">
              3 (optical + ultrasonic + vibration)
            </span>
          </span>

          <span>
            Drive:{' '}
            <span className="text-main">
              Head pulley — tail hopper return
            </span>
          </span>

          <span className="text-muted italic">
            ⓘ Joint/splice analysis planned (PRD §6) —
            not yet instrumented
          </span>
        </div>
      </div>
    </div>
  )
}

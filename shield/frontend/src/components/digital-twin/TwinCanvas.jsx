import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useSelector } from 'react-redux'

import { BELT } from '../../lib/constants'

import {
  buildTrussGeometry,
  buildIdlers,
  buildDriveStation,
  buildTailStation,
  buildSensorGantries,
  buildBeltMesh,
  buildBeltTexture,
  buildOreStream,
} from './scene/buildConveyorScene'


/* ==========================================================================
   CAMERA PRESETS
   ========================================================================== */

const CAMERA_PRESETS = {
  Orbit: {
    pos: [0, 18, 38],
    target: [0, 1, 0],
  },

  'Head Discharge': {
    pos: [43, 9, 17],
    target: [32, 1, 0],
  },

  'Tail Hopper': {
    pos: [-43, 9, 17],
    target: [-32, 1, 0],
  },

  'Top-Down Synoptic': {
    pos: [0, 48, 0.1],
    target: [0, 0, 0],
  },
}


/* ==========================================================================
   HELPERS
   ========================================================================== */

function disposeMaterial(material) {
  if (!material) return

  const materials = Array.isArray(material)
    ? material
    : [material]

  materials.forEach((mat) => {
    Object.keys(mat).forEach((key) => {
      const value = mat[key]

      if (value && value.isTexture) {
        value.dispose()
      }
    })

    mat.dispose()
  })
}


function disposeScene(scene) {
  scene.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose()
    }

    if (object.material) {
      disposeMaterial(object.material)
    }
  })
}


/* ==========================================================================
   ANIMATION TARGET COLLECTION
   ========================================================================== */

function collectAnimationTargets(scene) {
  const targets = {
    rollers: [],
    pulleys: [],
    ore: [],
    laserSheets: [],
    ultrasonicRings: [],
    vibrationSensors: [],
    warningBeacons: [],
    driveMotors: [],
  }

  scene.traverse((object) => {
    const data = object.userData

    if (!data) return

    if (data.isConveyorRoller) {
      targets.rollers.push(object)
    }

    if (
      data.isDrivePulley ||
      data.isTailPulley
    ) {
      targets.pulleys.push(object)
    }

    if (data.isOreLump) {
      targets.ore.push(object)
    }

    if (data.isLaserSheet) {
      targets.laserSheets.push(object)
    }

    if (data.isUltrasonicRing) {
      targets.ultrasonicRings.push(object)
    }

    if (data.isVibrationSensor) {
      targets.vibrationSensors.push(object)
    }

    if (data.isWarningBeacon) {
      targets.warningBeacons.push(object)
    }

    if (data.isDriveMotor) {
      targets.driveMotors.push(object)
    }
  })

  return targets
}


/* ==========================================================================
   ORE ANIMATION SETUP
   ========================================================================== */

function initializeOreAnimation(oreObjects, belt) {
  if (!belt || !oreObjects?.length) {
    return
  }

  oreObjects.forEach((ore, index) => {
    /*
     * Prefer an existing beltT supplied by buildOreStream().
     * Otherwise distribute the ore along the carrying strand.
     */
    const existingT =
      Number.isFinite(ore.userData?.beltT)
        ? ore.userData.beltT
        : (
          0.03 +
          ((index * 0.071) % 0.9)
        )

    ore.userData.beltT =
      existingT

    /*
     * Each rock gets a small speed variation.
     * This prevents perfectly synchronized movement.
     */
    ore.userData.speedMultiplier =
      0.92 +
      ((index * 0.037) % 0.16)

    /*
     * Small lateral offset keeps the ore naturally distributed
     * inside the belt trough.
     */
    ore.userData.beltOffset =
      Number.isFinite(ore.position.z)
        ? ore.position.z
        : (
          (Math.random() - 0.5) *
          0.9
        )
  })
}


/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export default function TwinCanvas() {
  const mountRef = useRef(null)

  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const controlsRef = useRef(null)

  const rafRef = useRef(null)
  const clockRef = useRef(new THREE.Clock())

  const beltRef = useRef(null)

  /*
   * Keep Redux values in refs so the Three.js scene does not need
   * to be recreated whenever telemetry changes.
   */
  const beltSpeedRef = useRef(2.4)

  /*
   * Smooth camera transition state.
   */
  const cameraGoalRef = useRef({
    position: new THREE.Vector3(
      0,
      18,
      38
    ),

    target: new THREE.Vector3(
      0,
      1,
      0
    ),
  })


  const animationTargetsRef = useRef({
    rollers: [],
    pulleys: [],
    ore: [],
    laserSheets: [],
    ultrasonicRings: [],
    vibrationSensors: [],
    warningBeacons: [],
    driveMotors: [],
  })


  const { beltSpeed } = useSelector(
    (state) => state.twin
  )


  /* ==========================================================================
     KEEP BELT SPEED IN SYNC
     ========================================================================== */

  useEffect(() => {
    beltSpeedRef.current =
      Number(beltSpeed) || 0
  }, [beltSpeed])


  /* ==========================================================================
     SCENE CREATION
     ========================================================================== */

  useEffect(() => {
    if (!mountRef.current) return

    const el = mountRef.current

    const width =
      Math.max(
        el.clientWidth,
        1
      )

    const height =
      Math.max(
        el.clientHeight,
        1
      )


    /* ------------------------------------------------------------------------
       RENDERER
       ------------------------------------------------------------------------ */

    const renderer =
      new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })


    renderer.setSize(
      width,
      height
    )

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        2
      )
    )


    renderer.outputColorSpace =
      THREE.SRGBColorSpace


    renderer.toneMapping =
      THREE.ACESFilmicToneMapping


    /*
     * Slightly lower exposure than an overly bright game-like scene.
     * This keeps the industrial atmosphere while preserving detail.
     */
    renderer.toneMappingExposure =
      1.0


    renderer.shadowMap.enabled =
      true

    renderer.shadowMap.type =
      THREE.PCFSoftShadowMap


    renderer.setClearColor(
      0x071019,
      1
    )


    rendererRef.current =
      renderer

    el.appendChild(
      renderer.domElement
    )


    /* ------------------------------------------------------------------------
       SCENE
       ------------------------------------------------------------------------ */

    const scene =
      new THREE.Scene()


    scene.background =
      new THREE.Color(
        0x071019
      )


    /*
     * Very subtle atmospheric depth.
     */
    scene.fog =
      new THREE.FogExp2(
        0x071019,
        0.0038
      )


    sceneRef.current =
      scene


    /* ------------------------------------------------------------------------
       CAMERA
       ------------------------------------------------------------------------ */

    const camera =
      new THREE.PerspectiveCamera(
        42,
        width / height,
        0.1,
        1000
      )


    camera.position.set(
      0,
      18,
      38
    )


    cameraRef.current =
      camera


    /* ------------------------------------------------------------------------
       LIGHTING
       ------------------------------------------------------------------------ */

    /*
     * Broad industrial ambient illumination.
     */
    const ambient =
      new THREE.HemisphereLight(
        0xc5d9e4,
        0x111920,
        1.45
      )

    scene.add(
      ambient
    )


    /*
     * Main overhead light.
     */
    const keyLight =
      new THREE.DirectionalLight(
        0xffffff,
        2.35
      )


    keyLight.position.set(
      18,
      48,
      22
    )


    keyLight.castShadow =
      true


    keyLight.shadow.mapSize.width =
      2048

    keyLight.shadow.mapSize.height =
      2048


    keyLight.shadow.camera.near =
      1

    keyLight.shadow.camera.far =
      190


    keyLight.shadow.camera.left =
      -80

    keyLight.shadow.camera.right =
      80

    keyLight.shadow.camera.top =
      55

    keyLight.shadow.camera.bottom =
      -55


    keyLight.shadow.bias =
      -0.00012


    keyLight.shadow.normalBias =
      0.018


    scene.add(
      keyLight
    )


    /*
     * Cool fill from the opposite side.
     */
    const fillLight =
      new THREE.DirectionalLight(
        0x65c9e3,
        0.42
      )


    fillLight.position.set(
      -35,
      20,
      -28
    )


    scene.add(
      fillLight
    )


    /*
     * Warm industrial rim.
     */
    const rimLight =
      new THREE.DirectionalLight(
        0xffd7aa,
        0.32
      )


    rimLight.position.set(
      38,
      18,
      -35
    )


    scene.add(
      rimLight
    )


    /* ------------------------------------------------------------------------
       STATION LIGHTS
       ------------------------------------------------------------------------ */

    /*
     * These do not cast shadows.
     *
     * They provide subtle local illumination around the two major
     * machinery areas, making the motor/hopper easier to read.
     */

    const headLight =
      new THREE.PointLight(
        0xffd4a3,
        2.0,
        30,
        2
      )


    headLight.position.set(
      31,
      7,
      0
    )


    scene.add(
      headLight
    )


    const tailLight =
      new THREE.PointLight(
        0xd6eaff,
        1.4,
        25,
        2
      )


    tailLight.position.set(
      -31,
      6,
      0
    )


    scene.add(
      tailLight
    )


    /* ------------------------------------------------------------------------
       GROUND
       ------------------------------------------------------------------------ */

    const ground =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          240,
          90
        ),

        new THREE.MeshStandardMaterial({
          color: 0x0d151c,
          roughness: 0.94,
          metalness: 0.03,
        })
      )


    ground.rotation.x =
      -Math.PI / 2


    ground.position.y =
      -5.2


    ground.receiveShadow =
      true


    scene.add(
      ground
    )


    /* ------------------------------------------------------------------------
       ENGINEERING GRID
       ------------------------------------------------------------------------ */

    const grid =
      new THREE.GridHelper(
        220,
        55,
        0x263641,
        0x17242d
      )


    /*
     * Important:
     * mutate position instead of replacing the Vector3.
     */
    grid.position.set(
      0,
      -5.18,
      0
    )


    /*
     * Grid is deliberately subtle.
     */
    if (grid.material) {
      grid.material.transparent =
        true

      grid.material.opacity =
        0.52
    }


    scene.add(
      grid
    )


    /* ------------------------------------------------------------------------
       CONVEYOR DIMENSIONS
       ------------------------------------------------------------------------ */

    const halfLength =
      BELT.LENGTH / 2


    const pulleyRadius =
      BELT.PULLEY_R


    /* ------------------------------------------------------------------------
       CONVEYOR GEOMETRY
       ------------------------------------------------------------------------ */

    buildTrussGeometry(
      scene,
      halfLength
    )


    buildIdlers(
      scene,
      halfLength
    )


    buildDriveStation(
      scene,
      halfLength
    )


    buildTailStation(
      scene,
      halfLength
    )


    buildSensorGantries(
      scene,
      halfLength
    )


    /* ------------------------------------------------------------------------
       BELT TEXTURE
       ------------------------------------------------------------------------ */

    const beltTexture =
      buildBeltTexture()


    if (beltTexture) {
      beltTexture.colorSpace =
        THREE.SRGBColorSpace


      beltTexture.wrapS =
        THREE.RepeatWrapping


      beltTexture.wrapT =
        THREE.RepeatWrapping


      /*
       * Higher anisotropy makes the belt tread remain clearer
       * when viewed at an angle.
       */
      beltTexture.anisotropy =
        renderer.capabilities.getMaxAnisotropy()


      beltTexture.needsUpdate =
        true
    }


    /* ------------------------------------------------------------------------
       BELT
       ------------------------------------------------------------------------ */

    const belt =
      buildBeltMesh(
        scene,
        halfLength,
        pulleyRadius,
        beltTexture
      )


    beltRef.current =
      belt


    if (belt?.mesh?.material) {
      const material =
        belt.mesh.material


      if ('roughness' in material) {
        material.roughness =
          0.78
      }


      if ('metalness' in material) {
        material.metalness =
          0.015
      }


      material.needsUpdate =
        true
    }


    /* ------------------------------------------------------------------------
       ORE
       ------------------------------------------------------------------------ */

    const oreGroup =
      buildOreStream(
        scene,
        halfLength,
        pulleyRadius
      )


    /* ------------------------------------------------------------------------
       COLLECT ANIMATION OBJECTS
       ------------------------------------------------------------------------ */

    animationTargetsRef.current =
      collectAnimationTargets(
        scene
      )


    /*
     * Initialize ore movement only after the belt path exists.
     */
    initializeOreAnimation(
      animationTargetsRef.current.ore,
      belt
    )


    /* ------------------------------------------------------------------------
       ORBIT CONTROLS
       ------------------------------------------------------------------------ */

    const controls =
      new OrbitControls(
        camera,
        renderer.domElement
      )


    controls.enableDamping =
      true


    controls.dampingFactor =
      0.055


    controls.enablePan =
      true


    controls.screenSpacePanning =
      true


    controls.minDistance =
      7


    controls.maxDistance =
      145


    /*
     * Prevent the user from going underneath the ground
     * while still allowing a useful inspection angle.
     */
    controls.minPolarAngle =
      0.12


    controls.maxPolarAngle =
      Math.PI * 0.485


    controls.target.set(
      0,
      1,
      0
    )


    controls.update()


    controlsRef.current =
      controls


    /* ------------------------------------------------------------------------
       ANIMATION
       ------------------------------------------------------------------------ */

    clockRef.current.start()


    function animate() {
      rafRef.current =
        requestAnimationFrame(
          animate
        )


      const delta =
        Math.min(
          clockRef.current.getDelta(),
          0.05
        )


      const elapsed =
        clockRef.current.elapsedTime


      const speed =
        Math.max(
          0,
          Number(
            beltSpeedRef.current
          ) || 0
        )


      /* --------------------------------------------------------------------
         BELT TEXTURE
         -------------------------------------------------------------------- */

      const beltMap =
        beltRef.current
          ?.mesh
          ?.material
          ?.map


      if (
        beltMap &&
        speed > 0
      ) {
        /*
         * Keep texture motion tied to physical belt velocity.
         */
        const uvSpeed =
          speed /
          Math.max(
            BELT.LENGTH,
            1
          )


        beltMap.offset.x +=
          uvSpeed *
          delta


        if (
          beltMap.offset.x >
          1000
        ) {
          beltMap.offset.x -=
            1000
        }
      }


      /* --------------------------------------------------------------------
         ROLLERS
         -------------------------------------------------------------------- */

      const rollerAngularSpeed =
        speed /
        Math.max(
          pulleyRadius,
          0.1
        )


      /*
       * IMPORTANT:
       *
       * Rollers are cylinders whose local Y axis is their physical
       * rotation axis after their initial orientation.
       *
       * rotateY() therefore rotates around each roller's LOCAL axis.
       *
       * This works correctly for:
       * - center rollers
       * - wing rollers
       * - return rollers
       * - impact rollers
       */
      if (speed > 0) {
        animationTargetsRef.current
          .rollers
          .forEach((roller) => {
            roller.rotateY(
              rollerAngularSpeed *
              delta
            )
          })


        /* ------------------------------------------------------------------
           PULLEYS
           ------------------------------------------------------------------ */

        animationTargetsRef.current
          .pulleys
          .forEach((pulley) => {
            /*
             * Pulley cylinder axis is also its local Y axis.
             */
            pulley.rotateY(
              rollerAngularSpeed *
              delta
            )
          })
      }


      /* --------------------------------------------------------------------
         ORE MOVEMENT
         -------------------------------------------------------------------- */

      const oreObjects =
        animationTargetsRef.current
          .ore


      if (
        oreObjects.length &&
        beltRef.current
      ) {
        oreObjects.forEach(
          (ore) => {
            const multiplier =
              ore.userData
                ?.speedMultiplier ||
              1


            /*
             * Convert physical belt speed to normalized
             * closed-loop path progress.
             */
            const normalizedAdvance =
              (
                speed *
                multiplier *
                delta
              ) /
              Math.max(
                beltRef.current.totalLength ||
                BELT.LENGTH,
                1
              )


            let t =
              Number(
                ore.userData.beltT
              ) || 0


            t +=
              normalizedAdvance


            /*
             * Closed loop.
             */
            t =
              t % 1


            ore.userData.beltT =
              t


            const position =
              beltRef.current.positionFn(
                t
              )


            if (position) {
              ore.position.copy(
                position
              )


              /*
               * Keep the rock slightly above the carrying surface.
               *
               * The random factor makes the pile look less uniform.
               */
              ore.position.y +=
                0.16 +
                (
                  ore.userData
                    ?.randomOffset ||
                  0
                ) *
                0.04


              /*
               * Preserve its lateral distribution.
               */
              if (
                Number.isFinite(
                  ore.userData.beltOffset
                )
              ) {
                ore.position.z +=
                  ore.userData.beltOffset
              }


              /*
               * Slowly tumble the ore.
               */
              if (speed > 0) {
                ore.rotation.x +=
                  delta *
                  speed *
                  0.45 *
                  multiplier

                ore.rotation.y +=
                  delta *
                  speed *
                  0.32 *
                  multiplier

                ore.rotation.z +=
                  delta *
                  speed *
                  0.25 *
                  multiplier
              }
            }
          }
        )
      }


      /* --------------------------------------------------------------------
         OPTICAL SENSOR / LASER
         -------------------------------------------------------------------- */

      animationTargetsRef.current
        .laserSheets
        .forEach((laser, index) => {
          /*
           * Very subtle pulse.
           *
           * This is deliberately restrained so it looks like
           * an industrial scanner rather than a hologram.
           */
          const baseOpacity =
            laser.userData
              .baseOpacity ??
            0.12


          laser.userData.baseOpacity =
            baseOpacity


          laser.material.opacity =
            baseOpacity +
            Math.sin(
              elapsed * 2.2 +
              index
            ) *
            0.025
        })


      /* --------------------------------------------------------------------
         ULTRASONIC SENSOR
         -------------------------------------------------------------------- */

      animationTargetsRef.current
        .ultrasonicRings
        .forEach((ring, index) => {
          const pulse =
            1 +
            Math.sin(
              elapsed * 2.8 +
              index
            ) *
            0.08


          ring.scale.set(
            pulse,
            pulse,
            pulse
          )


          if (ring.material) {
            ring.material.opacity =
              0.26 +
              Math.sin(
                elapsed * 2.8 +
                index
              ) *
              0.07
          }
        })


      /* --------------------------------------------------------------------
         VIBRATION SENSORS
         -------------------------------------------------------------------- */

      animationTargetsRef.current
        .vibrationSensors
        .forEach(
          (sensor, index) => {
            /*
             * Tiny physical-looking vibration.
             * Only a few millimetres in scene scale.
             */
            const vibration =
              Math.sin(
                elapsed * 18 +
                index * 1.7
              ) *
              0.006


            sensor.position.y +=
              vibration
          }
        )


      /* --------------------------------------------------------------------
         WARNING BEACONS
         -------------------------------------------------------------------- */

      animationTargetsRef.current
        .warningBeacons
        .forEach(
          (beacon) => {
            const pulse =
              0.75 +
              Math.abs(
                Math.sin(
                  elapsed * 3
                )
              ) *
              0.25


            if (
              beacon.material
            ) {
              beacon.material.emissiveIntensity =
                pulse
            }
          }
        )


      /* --------------------------------------------------------------------
         CAMERA SMOOTHING
         -------------------------------------------------------------------- */

      const cameraGoal =
        cameraGoalRef.current


      camera.position.lerp(
        cameraGoal.position,
        0.065
      )


      controls.target.lerp(
        cameraGoal.target,
        0.075
      )


      controls.update()


      renderer.render(
        scene,
        camera
      )
    }


    animate()


    /* ------------------------------------------------------------------------
       RESIZE
       ------------------------------------------------------------------------ */

    function onResize() {
      if (!mountRef.current) {
        return
      }


      const w =
        Math.max(
          mountRef.current
            .clientWidth,
          1
        )


      const h =
        Math.max(
          mountRef.current
            .clientHeight,
          1
        )


      camera.aspect =
        w / h


      camera.updateProjectionMatrix()


      renderer.setSize(
        w,
        h
      )
    }


    window.addEventListener(
      'resize',
      onResize
    )


    /* ------------------------------------------------------------------------
       CLEANUP
       ------------------------------------------------------------------------ */

    return () => {
      cancelAnimationFrame(
        rafRef.current
      )


      window.removeEventListener(
        'resize',
        onResize
      )


      controls.dispose()


      disposeScene(
        scene
      )


      renderer.dispose()


      if (
        el.contains(
          renderer.domElement
        )
      ) {
        el.removeChild(
          renderer.domElement
        )
      }


      rendererRef.current =
        null

      sceneRef.current =
        null

      cameraRef.current =
        null

      controlsRef.current =
        null

      beltRef.current =
        null

      animationTargetsRef.current = {
        rollers: [],
        pulleys: [],
        ore: [],
        laserSheets: [],
        ultrasonicRings: [],
        vibrationSensors: [],
        warningBeacons: [],
        driveMotors: [],
      }
    }
  }, [])


  /* ==========================================================================
     CAMERA PRESET HANDLER
     ========================================================================== */

  const setPreset =
    useCallback(
      (name) => {
        const preset =
          CAMERA_PRESETS[name]


        if (!preset) {
          return
        }


        const [
          px,
          py,
          pz,
        ] = preset.pos


        const [
          tx,
          ty,
          tz,
        ] = preset.target


        /*
         * Smoothly transition rather than teleporting.
         */
        cameraGoalRef.current
          .position
          .set(
            px,
            py,
            pz
          )


        cameraGoalRef.current
          .target
          .set(
            tx,
            ty,
            tz
          )
      },
      []
    )


  /* ==========================================================================
     PUBLIC API
     ========================================================================== */

  return {
    mountRef,
    setPreset,
  }
}
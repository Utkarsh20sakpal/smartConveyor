import * as THREE from 'three'
import { BELT } from '../../../lib/constants'


/* ==========================================================================
   MATERIAL HELPERS
   ========================================================================== */

function steelMaterial(
  color = 0x46545e,
  roughness = 0.62,
  metalness = 0.72
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  })
}


function darkSteelMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x202a31,
    roughness: 0.42,
    metalness: 0.86,
  })
}


function rubberMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x171a1c,
    roughness: 0.88,
    metalness: 0.02,
  })
}


function yellowSafetyMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xd6a800,
    roughness: 0.48,
    metalness: 0.35,
  })
}


function cyanSensorMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0b6675,
    emissiveIntensity: 0.55,
    roughness: 0.28,
    metalness: 0.42,
  })
}


function orangeWarningMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xff9f1c,
    emissive: 0x6b3000,
    emissiveIntensity: 0.35,
    roughness: 0.42,
    metalness: 0.35,
  })
}


/* ==========================================================================
   BASIC GEOMETRY HELPERS
   ========================================================================== */

function addBox(
  scene,
  {
    size = [1, 1, 1],
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    material,
    castShadow = true,
    receiveShadow = true,
    userData = {},
  } = {}
) {
  const geometry = new THREE.BoxGeometry(
    size[0],
    size[1],
    size[2]
  )

  const mesh = new THREE.Mesh(
    geometry,
    material
  )

  mesh.position.set(
    position[0],
    position[1],
    position[2]
  )

  mesh.rotation.set(
    rotation[0],
    rotation[1],
    rotation[2]
  )

  mesh.castShadow = castShadow
  mesh.receiveShadow = receiveShadow

  mesh.userData = {
    ...userData,
  }

  scene.add(mesh)

  return mesh
}


function addCylinder(
  scene,
  {
    radius = 1,
    height = 1,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    material,
    radialSegments = 16,
    castShadow = true,
    receiveShadow = true,
    userData = {},
  } = {}
) {
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    radialSegments
  )

  const mesh = new THREE.Mesh(
    geometry,
    material
  )

  mesh.position.set(
    position[0],
    position[1],
    position[2]
  )

  mesh.rotation.set(
    rotation[0],
    rotation[1],
    rotation[2]
  )

  mesh.castShadow = castShadow
  mesh.receiveShadow = receiveShadow

  mesh.userData = {
    ...userData,
  }

  scene.add(mesh)

  return mesh
}


/* ==========================================================================
   BELT TEXTURE
   ========================================================================== */

/**
 * Procedural rubber conveyor texture.
 *
 * Includes:
 * - dark vulcanized rubber
 * - longitudinal steel-cord ribs
 * - chevron tread
 * - subtle noise
 * - cyan alignment reference
 */

function buildBeltTexture() {
  const canvas = document.createElement('canvas')

  canvas.width = 1024
  canvas.height = 512

  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return new THREE.CanvasTexture(canvas)
  }


  /* ---------------------------------------------------------------------- */
  /* Rubber base                                                            */
  /* ---------------------------------------------------------------------- */

  ctx.fillStyle = '#17191b'
  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  )


  /* ---------------------------------------------------------------------- */
  /* Rubber grain                                                           */
  /* ---------------------------------------------------------------------- */

  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height

    const brightness =
      18 +
      Math.floor(Math.random() * 18)

    ctx.fillStyle =
      `rgb(${brightness},${brightness},${brightness})`

    ctx.fillRect(
      x,
      y,
      1,
      1
    )
  }


  /* ---------------------------------------------------------------------- */
  /* Longitudinal steel cords                                               */
  /* ---------------------------------------------------------------------- */

  ctx.strokeStyle = '#3c4144'
  ctx.lineWidth = 1

  for (
    let x = 12;
    x < canvas.width;
    x += 44
  ) {
    ctx.beginPath()

    ctx.moveTo(
      x,
      0
    )

    ctx.lineTo(
      x,
      canvas.height
    )

    ctx.stroke()
  }


  /* ---------------------------------------------------------------------- */
  /* Secondary fine ribs                                                    */
  /* ---------------------------------------------------------------------- */

  ctx.strokeStyle = '#292d30'
  ctx.lineWidth = 1

  for (
    let x = 0;
    x < canvas.width;
    x += 11
  ) {
    ctx.beginPath()

    ctx.moveTo(
      x,
      0
    )

    ctx.lineTo(
      x,
      canvas.height
    )

    ctx.stroke()
  }


  /* ---------------------------------------------------------------------- */
  /* Chevron tread                                                          */
  /* ---------------------------------------------------------------------- */

  ctx.strokeStyle = '#34383a'
  ctx.lineWidth = 7
  ctx.lineJoin = 'round'

  const spacing = 72

  for (
    let y = -spacing;
    y < canvas.height + spacing;
    y += spacing
  ) {
    ctx.beginPath()

    ctx.moveTo(
      0,
      y + 30
    )

    ctx.lineTo(
      canvas.width * 0.25,
      y
    )

    ctx.lineTo(
      canvas.width * 0.5,
      y + 30
    )

    ctx.lineTo(
      canvas.width * 0.75,
      y
    )

    ctx.lineTo(
      canvas.width,
      y + 30
    )

    ctx.stroke()
  }


  /* ---------------------------------------------------------------------- */
  /* Tread highlight                                                         */
  /* ---------------------------------------------------------------------- */

  ctx.strokeStyle = '#4a4e50'
  ctx.lineWidth = 2

  for (
    let y = -spacing;
    y < canvas.height + spacing;
    y += spacing
  ) {
    ctx.beginPath()

    ctx.moveTo(
      0,
      y + 26
    )

    ctx.lineTo(
      canvas.width * 0.25,
      y - 4
    )

    ctx.lineTo(
      canvas.width * 0.5,
      y + 26
    )

    ctx.lineTo(
      canvas.width * 0.75,
      y - 4
    )

    ctx.lineTo(
      canvas.width,
      y + 26
    )

    ctx.stroke()
  }


  /* ---------------------------------------------------------------------- */
  /* Center alignment marking                                               */
  /* ---------------------------------------------------------------------- */

  ctx.strokeStyle = 'rgba(34, 211, 238, 0.28)'
  ctx.lineWidth = 3

  ctx.beginPath()

  ctx.moveTo(
    canvas.width / 2,
    0
  )

  ctx.lineTo(
    canvas.width / 2,
    canvas.height
  )

  ctx.stroke()


  const texture =
    new THREE.CanvasTexture(canvas)

  texture.wrapS =
    THREE.RepeatWrapping

  texture.wrapT =
    THREE.RepeatWrapping

  texture.colorSpace =
    THREE.SRGBColorSpace

  texture.anisotropy = 8

  return texture
}


/* ==========================================================================
   CONVEYOR TRUSS
   ========================================================================== */

function buildTrussGeometry(
  scene,
  L = BELT.LENGTH_3D || BELT.LENGTH || 60
) {
  /*
   * L is treated consistently as HALF the straight conveyor length.
   */
  const halfLength = L

  const frameMat =
    steelMaterial(
      0x46545e,
      0.58,
      0.76
    )

  const darkFrameMat =
    steelMaterial(
      0x29343c,
      0.72,
      0.68
    )

  const pillarMat =
    steelMaterial(
      0x303c45,
      0.7,
      0.7
    )

  const guardMat =
    yellowSafetyMaterial()


  /* ---------------------------------------------------------------------- */
  /* Main longitudinal stringers                                             */
  /* ---------------------------------------------------------------------- */

  for (const z of [-2.15, 2.15]) {
    addBox(scene, {
      size: [
        halfLength * 2,
        0.28,
        0.28,
      ],

      position: [
        0,
        1.0,
        z,
      ],

      material: frameMat,
    })
  }


  /* ---------------------------------------------------------------------- */
  /* Lower longitudinal members                                               */
  /* ---------------------------------------------------------------------- */

  for (const z of [-2.05, 2.05]) {
    addBox(scene, {
      size: [
        halfLength * 2,
        0.18,
        0.18,
      ],

      position: [
        0,
        -0.65,
        z,
      ],

      material: darkFrameMat,
    })
  }


  /* ---------------------------------------------------------------------- */
  /* Vertical support pillars                                                  */
  /* ---------------------------------------------------------------------- */

  const pillarGeometry =
    new THREE.BoxGeometry(
      0.32,
      6.2,
      0.32
    )

  for (
    let x = -halfLength + 4;
    x <= halfLength - 4;
    x += 8
  ) {
    for (const z of [-2.15, 2.15]) {
      const pillar =
        new THREE.Mesh(
          pillarGeometry,
          pillarMat
        )

      pillar.position.set(
        x,
        -2.05,
        z
      )

      pillar.castShadow = true
      pillar.receiveShadow = true

      scene.add(pillar)
    }
  }


  /* ---------------------------------------------------------------------- */
  /* Cross members                                                            */
  /* ---------------------------------------------------------------------- */

  for (
    let x = -halfLength + 4;
    x <= halfLength - 4;
    x += 8
  ) {
    addBox(scene, {
      size: [
        0.22,
        0.22,
        4.6,
      ],

      position: [
        x,
        0.95,
        0,
      ],

      material: darkFrameMat,
    })

    addBox(scene, {
      size: [
        0.22,
        0.18,
        4.3,
      ],

      position: [
        x,
        -0.55,
        0,
      ],

      material: darkFrameMat,
    })
  }


  /* ---------------------------------------------------------------------- */
  /* Diagonal truss braces                                                   */
  /* ---------------------------------------------------------------------- */

  const braceLength =
    Math.sqrt(
      Math.pow(8, 2) +
      Math.pow(1.6, 2)
    )

  for (
    let x = -halfLength + 8;
    x < halfLength - 2;
    x += 8
  ) {
    const angle =
      Math.atan2(
        1.6,
        8
      )

    addBox(scene, {
      size: [
        braceLength,
        0.14,
        0.14,
      ],

      position: [
        x + 4,
        0.18,
        -2.15,
      ],

      rotation: [
        0,
        0,
        -angle,
      ],

      material: darkFrameMat,
    })

    addBox(scene, {
      size: [
        braceLength,
        0.14,
        0.14,
      ],

      position: [
        x + 4,
        0.18,
        2.15,
      ],

      rotation: [
        0,
        0,
        angle,
      ],

      material: darkFrameMat,
    })
  }


  /* ---------------------------------------------------------------------- */
  /* Safety guardrails                                                       */
  /* ---------------------------------------------------------------------- */

  const railRadius = 0.065

  const railGeometry =
    new THREE.CylinderGeometry(
      railRadius,
      railRadius,
      halfLength * 2,
      10
    )

  for (const z of [-2.45, 2.45]) {
    const rail =
      new THREE.Mesh(
        railGeometry,
        guardMat
      )

    rail.rotation.z =
      Math.PI / 2

    rail.position.set(
      0,
      2.15,
      z
    )

    rail.castShadow = true

    scene.add(rail)
  }


  /* ---------------------------------------------------------------------- */
  /* Guardrail posts                                                         */
  /* ---------------------------------------------------------------------- */

  const postGeometry =
    new THREE.CylinderGeometry(
      0.055,
      0.055,
      1.2,
      10
    )

  for (
    let x = -halfLength + 4;
    x <= halfLength - 4;
    x += 4
  ) {
    for (const z of [-2.45, 2.45]) {
      const post =
        new THREE.Mesh(
          postGeometry,
          guardMat
        )

      post.position.set(
        x,
        1.55,
        z
      )

      post.castShadow = true

      scene.add(post)
    }
  }


  /* ---------------------------------------------------------------------- */
  /* Small maintenance walkway                                               */
  /* ---------------------------------------------------------------------- */

  addBox(scene, {
    size: [
      halfLength * 2,
      0.12,
      0.75,
    ],

    position: [
      0,
      0.25,
      3.0,
    ],

    material: darkFrameMat,
  })
}


/* ==========================================================================
   IDLERS
   ========================================================================== */

function buildIdlers(
  scene,
  L = BELT.LENGTH_3D || BELT.LENGTH || 60
) {
  const halfLength = L

  const rollerMat =
    steelMaterial(
      0x69767d,
      0.32,
      0.82
    )

  const axleMat =
    darkSteelMaterial()


  /*
   * Five-piece trough geometry:
   *
   *       /----\
   *      /      \
   * ----/        \----
   *
   * Three-roll physical assembly:
   * center + two wings.
   */


  const centerRadius = 0.23
  const wingRadius = 0.21

  const centerLength = 1.0
  const wingLength = 0.95


  for (
    let x = -halfLength + 3;
    x <= halfLength - 3;
    x += 4
  ) {
    /* -------------------------------------------------------------------- */
    /* Center roll                                                            */
    /* -------------------------------------------------------------------- */

    const center =
      addCylinder(scene, {
        radius: centerRadius,
        height: centerLength,
        position: [
          x,
          1.52,
          0,
        ],

        rotation: [
          0,
          0,
          Math.PI / 2,
        ],

        material: rollerMat,

        radialSegments: 18,

        userData: {
          isConveyorRoller: true,
          rollerType: 'center',
        },
      })


    /* -------------------------------------------------------------------- */
    /* Wing rolls                                                             */
    /* -------------------------------------------------------------------- */

    for (const side of [-1, 1]) {
      const angle =
        THREE.MathUtils.degToRad(
          35
        )

      const wing =
        addCylinder(scene, {
          radius: wingRadius,
          height: wingLength,
          position: [
            x,
            1.52 + 0.24,
            side * 0.67,
          ],

          rotation: [
            0,
            side * angle,
            Math.PI / 2,
          ],

          material: rollerMat,

          radialSegments: 18,

          userData: {
            isConveyorRoller: true,
            rollerType: 'wing',
            side,
          },
        })
    }


    /* -------------------------------------------------------------------- */
    /* Center axle                                                            */
    /* -------------------------------------------------------------------- */

    addCylinder(scene, {
      radius: 0.055,
      height: 2.5,
      position: [
        x,
        1.48,
        0,
      ],

      rotation: [
        0,
        0,
        Math.PI / 2,
      ],

      material: axleMat,

      radialSegments: 10,

      castShadow: false,
    })


    /* -------------------------------------------------------------------- */
    /* Return roller                                                          */
    /* -------------------------------------------------------------------- */

    addCylinder(scene, {
      radius: 0.19,
      height: 2.25,
      position: [
        x,
        -0.78,
        0,
      ],

      rotation: [
        0,
        0,
        Math.PI / 2,
      ],

      material: rollerMat,

      radialSegments: 18,

      userData: {
        isConveyorRoller: true,
        rollerType: 'return',
      },
    })


    /* -------------------------------------------------------------------- */
    /* Idler support bracket                                                  */
    /* -------------------------------------------------------------------- */

    addBox(scene, {
      size: [
        0.12,
        0.5,
        2.4,
      ],

      position: [
        x,
        1.02,
        0,
      ],

      material: axleMat,

      castShadow: false,
    })
  }
}


/* ==========================================================================
   DRIVE STATION
   ========================================================================== */

function buildDriveStation(
  scene,
  L = BELT.LENGTH_3D || BELT.LENGTH || 60
) {
  const halfLength = L

  const stationMat =
    steelMaterial(
      0x37434b,
      0.48,
      0.72
    )

  const darkMat =
    darkSteelMaterial()

  const motorMat =
    steelMaterial(
      0x53636d,
      0.38,
      0.78
    )

  const warningMat =
    orangeWarningMaterial()


  /* ---------------------------------------------------------------------- */
  /* Drive platform                                                          */
  /* ---------------------------------------------------------------------- */

  addBox(scene, {
    size: [
      5.2,
      0.5,
      6.4,
    ],

    position: [
      halfLength + 1.8,
      -1.3,
      0,
    ],

    material: stationMat,
  })


  /* ---------------------------------------------------------------------- */
  /* Main drive housing                                                      */
  /* ---------------------------------------------------------------------- */

  addBox(scene, {
    size: [
      3.8,
      3.8,
      5.4,
    ],

    position: [
      halfLength + 2.3,
      0.1,
      0,
    ],

    material: stationMat,
  })


  /* ---------------------------------------------------------------------- */
  /* Drive pulley                                                            */
  /* ---------------------------------------------------------------------- */

  const pulley =
    addCylinder(scene, {
      radius: BELT.PULLEY_R || 1.2,
      height: 4.0,

      position: [
        halfLength,
        1.6 - (BELT.PULLEY_R || 1.2),
        0,
      ],

      rotation: [
        Math.PI / 2,
        0,
        0,
      ],

      material: darkMat,

      radialSegments: 32,

      userData: {
        isDrivePulley: true,
      },
    })


  /* ---------------------------------------------------------------------- */
  /* Pulley face                                                             */
  /* ---------------------------------------------------------------------- */

  for (const z of [-2.02, 2.02]) {
    addCylinder(scene, {
      radius:
        (BELT.PULLEY_R || 1.2) * 0.82,

      height: 0.08,

      position: [
        halfLength,
        1.6 - (BELT.PULLEY_R || 1.2),
        z,
      ],

      rotation: [
        Math.PI / 2,
        0,
        0,
      ],

      material: darkMat,

      radialSegments: 32,
    })
  }


  /* ---------------------------------------------------------------------- */
  /* Motor                                                                   */
  /* ---------------------------------------------------------------------- */

  const motor =
    addCylinder(scene, {
      radius: 0.9,
      height: 2.4,

      position: [
        halfLength + 2.6,
        -0.3,
        -2.25,
      ],

      rotation: [
        0,
        Math.PI / 2,
        0,
      ],

      material: motorMat,

      radialSegments: 24,
    })

  motor.userData.isDriveMotor = true


  /* ---------------------------------------------------------------------- */
  /* Gearbox                                                                 */
  /* ---------------------------------------------------------------------- */

  addBox(scene, {
    size: [
      1.5,
      1.8,
      1.8,
    ],

    position: [
      halfLength + 1.45,
      -0.15,
      -2.25,
    ],

    material: darkMat,
  })


  /* ---------------------------------------------------------------------- */
  /* Motor shaft                                                             */
  /* ---------------------------------------------------------------------- */

  addCylinder(scene, {
    radius: 0.13,
    height: 2.8,

    position: [
      halfLength + 1.9,
      -0.15,
      -2.25,
    ],

    rotation: [
      0,
      0,
      Math.PI / 2,
    ],

    material: darkMat,

    radialSegments: 16,
  })


  /* ---------------------------------------------------------------------- */
  /* Discharge hood                                                          */
  /* ---------------------------------------------------------------------- */

  const hoodMat =
    steelMaterial(
      0x4c5961,
      0.56,
      0.7
    )

  addBox(scene, {
    size: [
      4.5,
      2.8,
      5.0,
    ],

    position: [
      halfLength + 0.9,
      2.5,
      0,
    ],

    material: hoodMat,
  })


  /* ---------------------------------------------------------------------- */
  /* Hood opening                                                            */
  /* ---------------------------------------------------------------------- */

  addBox(scene, {
    size: [
      0.25,
      1.8,
      3.7,
    ],

    position: [
      halfLength + 3.2,
      1.7,
      0,
    ],

    material: darkMat,
  })


  /* ---------------------------------------------------------------------- */
  /* Warning beacon                                                          */
  /* ---------------------------------------------------------------------- */

  const beacon =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.11,
        0.11,
        0.2,
        16
      ),

      warningMat
    )

  beacon.position.set(
    halfLength + 2.3,
    2.15,
    -2.1
  )

  beacon.userData.isWarningBeacon = true

  scene.add(beacon)
}


/* ==========================================================================
   TAIL STATION + HOPPER
   ========================================================================== */

function buildTailStation(
  scene,
  L = BELT.LENGTH_3D || BELT.LENGTH || 60
) {
  const halfLength = L

  const frameMat =
    steelMaterial(
      0x394750,
      0.56,
      0.72
    )

  const darkMat =
    darkSteelMaterial()

  const hopperMat =
    steelMaterial(
      0x59666e,
      0.6,
      0.68
    )


  /* ---------------------------------------------------------------------- */
  /* Tail platform                                                           */
  /* ---------------------------------------------------------------------- */

  addBox(scene, {
    size: [
      5,
      0.5,
      6,
    ],

    position: [
      -halfLength - 1.5,
      -1.25,
      0,
    ],

    material: frameMat,
  })


  /* ---------------------------------------------------------------------- */
  /* Tail housing                                                            */
  /* ---------------------------------------------------------------------- */

  addBox(scene, {
    size: [
      3.6,
      3.6,
      5.2,
    ],

    position: [
      -halfLength - 1.4,
      0.05,
      0,
    ],

    material: frameMat,
  })


  /* ---------------------------------------------------------------------- */
  /* Tail pulley                                                             */
  /* ---------------------------------------------------------------------- */

  addCylinder(scene, {
    radius: BELT.PULLEY_R || 1.2,
    height: 4.0,

    position: [
      -halfLength,
      1.6 - (BELT.PULLEY_R || 1.2),
      0,
    ],

    rotation: [
      Math.PI / 2,
      0,
      0,
    ],

    material: darkMat,

    radialSegments: 32,

    userData: {
      isTailPulley: true,
    },
  })


  /* ---------------------------------------------------------------------- */
  /* Feed hopper                                                             */
  /* ---------------------------------------------------------------------- */

  const hopperGroup =
    new THREE.Group()

  hopperGroup.position.set(
    -halfLength - 0.5,
    4.0,
    0
  )

  scene.add(hopperGroup)


  const hopperTop =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        5.8,
        0.3,
        4.8
      ),
      hopperMat
    )

  hopperTop.position.y = 1.8

  hopperTop.castShadow = true

  hopperGroup.add(hopperTop)


  /* Hopper side panels */

  for (const z of [-2.1, 2.1]) {
    const panel =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          4.6,
          3.5,
          0.22
        ),
        hopperMat
      )

    panel.position.set(
      0,
      0,
      z
    )

    panel.rotation.x =
      z > 0
        ? -0.15
        : 0.15

    panel.castShadow = true

    hopperGroup.add(panel)
  }


  /* Hopper chute */

  addBox(scene, {
    size: [
      2.4,
      3.0,
      2.6,
    ],

    position: [
      -halfLength,
      2.0,
      0,
    ],

    material: hopperMat,
  })


  /* ---------------------------------------------------------------------- */
  /* Impact bed                                                              */
  /* ---------------------------------------------------------------------- */

  const impactMat =
    darkSteelMaterial()

  for (
    let x = -halfLength + 0.5;
    x < -halfLength + 6;
    x += 1
  ) {
    addCylinder(scene, {
      radius: 0.18,
      height: 2.0,

      position: [
        x,
        1.35,
        0,
      ],

      rotation: [
        0,
        0,
        Math.PI / 2,
      ],

      material: impactMat,

      radialSegments: 14,

      userData: {
        isConveyorRoller: true,
        rollerType: 'impact',
      },
    })
  }
}


/* ==========================================================================
   SENSOR GANTRIES
   ========================================================================== */

function buildSensorGantries(
  scene,
  L = BELT.LENGTH_3D || BELT.LENGTH || 60
) {
  const positions = [
    -L * 0.33,
    0,
    L * 0.33,
  ]


  const frameMat =
    cyanSensorMaterial()

  const darkMat =
    darkSteelMaterial()


  positions.forEach(
    (x, index) => {
      const gantry =
        new THREE.Group()

      gantry.position.set(
        x,
        0,
        0
      )

      scene.add(gantry)


      /* ------------------------------------------------------------------ */
      /* Vertical pillars                                                     */
      /* ------------------------------------------------------------------ */

      for (const z of [-2.7, 2.7]) {
        const pillar =
          new THREE.Mesh(
            new THREE.BoxGeometry(
              0.16,
              4.8,
              0.16
            ),
            frameMat
          )

        pillar.position.set(
          0,
          2.0,
          z
        )

        pillar.castShadow = true

        gantry.add(pillar)
      }


      /* ------------------------------------------------------------------ */
      /* Top bridge                                                           */
      /* ------------------------------------------------------------------ */

      const bridge =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            0.22,
            0.22,
            5.6
          ),
          frameMat
        )

      bridge.position.set(
        0,
        4.35,
        0
      )

      bridge.castShadow = true

      gantry.add(bridge)


      /* ------------------------------------------------------------------ */
      /* Sensor housing                                                       */
      /* ------------------------------------------------------------------ */

      const housing =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            0.65,
            0.45,
            0.9
          ),
          darkMat
        )

      housing.position.set(
        0,
        3.95,
        0
      )

      housing.castShadow = true

      gantry.add(housing)


      /* ------------------------------------------------------------------ */
      /* Sensor-specific hardware                                             */
      /* ------------------------------------------------------------------ */

      if (index === 0) {
        /*
         * Optical AI line scanner.
         */

        const scanner =
          new THREE.Mesh(
            new THREE.BoxGeometry(
              0.35,
              0.25,
              1.5
            ),
            frameMat
          )

        scanner.position.set(
          0,
          3.55,
          0
        )

        gantry.add(scanner)


        /* Laser sheet */

        const laserGeometry =
          new THREE.PlaneGeometry(
            3.2,
            2.2
          )

        const laserMaterial =
          new THREE.MeshBasicMaterial({
            color: 0x22d3ee,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            depthWrite: false,
          })

        const laser =
          new THREE.Mesh(
            laserGeometry,
            laserMaterial
          )

        laser.rotation.x =
          Math.PI / 2

        laser.position.set(
          0,
          2.65,
          0
        )

        laser.userData.isLaserSheet = true

        gantry.add(laser)
      }


      if (index === 1) {
        /*
         * Ultrasonic scanner.
         */

        const ultrasonic =
          new THREE.Mesh(
            new THREE.CylinderGeometry(
              0.22,
              0.22,
              0.3,
              20
            ),
            frameMat
          )

        ultrasonic.position.set(
          0,
          3.55,
          0
        )

        ultrasonic.rotation.x =
          Math.PI / 2

        gantry.add(ultrasonic)


        const ring =
          new THREE.Mesh(
            new THREE.TorusGeometry(
              0.32,
              0.035,
              8,
              24
            ),
            frameMat
          )

        ring.rotation.x =
          Math.PI / 2

        ring.position.set(
          0,
          3.55,
          0
        )

        ring.userData.isUltrasonicRing = true

        gantry.add(ring)
      }


      if (index === 2) {
        /*
         * Tri-axial vibration station.
         */

        for (const z of [-2.2, 2.2]) {
          const sensor =
            new THREE.Mesh(
              new THREE.BoxGeometry(
                0.32,
                0.32,
                0.32
              ),
              frameMat
            )

          sensor.position.set(
            0,
            1.1,
            z
          )

          sensor.userData.isVibrationSensor = true

          gantry.add(sensor)
        }


        /* Bearing housing indicators */

        for (const z of [-2.2, 2.2]) {
          const bearing =
            new THREE.Mesh(
              new THREE.CylinderGeometry(
                0.38,
                0.38,
                0.55,
                20
              ),
              darkMat
            )

          bearing.rotation.z =
            Math.PI / 2

          bearing.position.set(
            0,
            1.15,
            z
          )

          gantry.add(bearing)
        }
      }


      /*
       * Label data for future UI integration.
       */
      gantry.userData.sensorType =
        index === 0
          ? 'optical-line-scan'
          : index === 1
            ? 'ultrasonic-core'
            : 'triaxial-vibration'
    }
  )
}


/* ==========================================================================
   BELT PATH
   ========================================================================== */

function createBeltPathFunction(
  L,
  R
) {
  /*
   * L = half straight length.
   *
   * Top:
   *
   *       ---------------->
   *      /                  \
   *     |                    |
   *      \------------------/
   *
   * Head and tail are true 180° arcs.
   */

  const straightLength =
    L * 2

  const topY = 1.6

  const bottomY =
    topY - 2 * R

  const headCenterY =
    topY - R

  const tailCenterY =
    bottomY + R

  const totalLength =
    straightLength * 2 +
    Math.PI * R * 2


  function beltPointAtDistance(
    distance
  ) {
    let s =
      ((distance % totalLength) +
        totalLength) %
      totalLength


    /* -------------------------------------------------------------------- */
    /* TOP CARRYING STRAND                                                   */
    /* -------------------------------------------------------------------- */

    if (s <= straightLength) {
      return new THREE.Vector3(
        -L + s,
        topY,
        0
      )
    }


    /* -------------------------------------------------------------------- */
    /* HEAD 180° ARC                                                         */
    /* -------------------------------------------------------------------- */

    const headArc =
      Math.PI * R

    if (
      s <=
      straightLength + headArc
    ) {
      const local =
        s - straightLength

      const angle =
        local / R

      return new THREE.Vector3(
        L + R * Math.sin(angle),
        headCenterY +
        R * Math.cos(angle),
        0
      )
    }


    /* -------------------------------------------------------------------- */
    /* BOTTOM RETURN STRAND                                                  */
    /* -------------------------------------------------------------------- */

    if (
      s <=
      straightLength * 2 +
      headArc
    ) {
      const local =
        s -
        straightLength -
        headArc

      return new THREE.Vector3(
        L - local,
        bottomY,
        0
      )
    }


    /* -------------------------------------------------------------------- */
    /* TAIL 180° ARC                                                         */
    /* -------------------------------------------------------------------- */

    const local =
      s -
      straightLength * 2 -
      headArc

    const angle =
      Math.PI +
      local / R

    return new THREE.Vector3(
      -L + R * Math.sin(angle),
      tailCenterY +
      R * Math.cos(angle),
      0
    )
  }


  return {
    beltPointAtDistance,
    totalLength,
    straightLength,
    topY,
    bottomY,
  }
}


/* ==========================================================================
   BELT MESH
   ========================================================================== */

function buildBeltMesh(
  scene,
  L = BELT.LENGTH_3D || BELT.LENGTH || 60,
  R = BELT.PULLEY_R || 1.2,
  texture = null
) {
  const W = 1.8

  /*
   * Five vertices across belt width.
   *
   * The edges are raised to create the 35° trough.
   */
  const profileCount = 5

  const profileZ = [
    -W / 2,
    -W / 4,
    0,
    W / 4,
    W / 2,
  ]

  const troughAngle =
    THREE.MathUtils.degToRad(35)

  const edgeHeight =
    Math.tan(troughAngle) *
    (W / 2)

  const profileY = [
    edgeHeight,
    edgeHeight * 0.35,
    0,
    edgeHeight * 0.35,
    edgeHeight,
  ]


  const path =
    createBeltPathFunction(
      L,
      R
    )

  const segs = 320

  const positions = []
  const uvs = []
  const indices = []


  /* ---------------------------------------------------------------------- */
  /* Generate vertices                                                       */
  /* ---------------------------------------------------------------------- */

  for (
    let i = 0;
    i <= segs;
    i++
  ) {
    const t =
      i / segs

    const distance =
      t * path.totalLength

    const center =
      path.beltPointAtDistance(
        distance
      )


    /*
     * Determine whether we're on the top carrying strand.
     */
    const onTop =
      distance <=
      path.straightLength


    for (
      let p = 0;
      p < profileCount;
      p++
    ) {
      let y =
        center.y

      let z =
        profileZ[p]


      if (onTop) {
        /*
         * Proper trough profile.
         */
        y += profileY[p]
      }


      positions.push(
        center.x,
        y,
        center.z + z
      )


      /*
       * U follows belt travel.
       * V follows belt width.
       */
      uvs.push(
        t * 18,
        p / (profileCount - 1)
      )
    }
  }


  /* ---------------------------------------------------------------------- */
  /* Build faces                                                             */
  /* ---------------------------------------------------------------------- */

  for (
    let i = 0;
    i < segs;
    i++
  ) {
    const rowA =
      i * profileCount

    const rowB =
      (i + 1) * profileCount

    for (
      let p = 0;
      p < profileCount - 1;
      p++
    ) {
      const a =
        rowA + p

      const b =
        rowB + p

      const c =
        rowB + p + 1

      const d =
        rowA + p + 1


      indices.push(
        a,
        b,
        d,

        b,
        c,
        d
      )
    }
  }


  /* ---------------------------------------------------------------------- */
  /* Geometry                                                                */
  /* ---------------------------------------------------------------------- */

  const geometry =
    new THREE.BufferGeometry()

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  )

  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      uvs,
      2
    )
  )

  geometry.setIndex(
    indices
  )

  geometry.computeVertexNormals()


  /* ---------------------------------------------------------------------- */
  /* Material                                                                */
  /* ---------------------------------------------------------------------- */

  const beltTexture =
    texture ||
    buildBeltTexture()

  beltTexture.wrapS =
    THREE.RepeatWrapping

  beltTexture.wrapT =
    THREE.RepeatWrapping

  beltTexture.repeat.set(
    1,
    1
  )

  beltTexture.colorSpace =
    THREE.SRGBColorSpace


  const material =
    new THREE.MeshStandardMaterial({
      map: beltTexture,

      color: 0xffffff,

      roughness: 0.88,

      metalness: 0.02,

      side: THREE.DoubleSide,
    })


  const mesh =
    new THREE.Mesh(
      geometry,
      material
    )

  mesh.castShadow = true
  mesh.receiveShadow = true

  mesh.userData.isConveyorBelt = true

  scene.add(mesh)


  return {
    mesh,
    texture: beltTexture,

    positionFn:
      (t) =>
        path.beltPointAtDistance(
          t * path.totalLength
        ),

    distanceFn:
      (distance) =>
        path.beltPointAtDistance(
          distance
        ),

    totalLength:
      path.totalLength,

    // Expose the carrying-strand length so the Digital Twin health trail
    // can use the exact same belt path without recreating geometry.
    straightLength:
      path.straightLength,
  }
}



/* ==========================================================================
   IRON ORE
   ========================================================================== */



/* ==========================================================================
   IRON ORE
   ========================================================================== */

function buildOreStream(
  scene,
  L = BELT.LENGTH_3D || BELT.LENGTH || 60,
  R = BELT.PULLEY_R || 1.2
) {
  const oreGroup =
    new THREE.Group()

  oreGroup.name =
    'Iron Ore Stream'

  scene.add(oreGroup)


  const oreMaterials = [
    new THREE.MeshStandardMaterial({
      color: 0x4d3424,
      roughness: 0.92,
      metalness: 0.02,
    }),

    new THREE.MeshStandardMaterial({
      color: 0x6b4930,
      roughness: 0.9,
      metalness: 0.02,
    }),

    new THREE.MeshStandardMaterial({
      color: 0x38271f,
      roughness: 0.95,
      metalness: 0.01,
    }),

    new THREE.MeshStandardMaterial({
      color: 0x79563b,
      roughness: 0.9,
      metalness: 0.01,
    }),
  ]


  const path =
    createBeltPathFunction(
      L,
      R
    )


  /*
   * Ore is placed along the carrying strand.
   */
  for (
    let i = 0;
    i < 34;
    i++
  ) {
    const t =
      0.03 +
      Math.random() * 0.9

    const distance =
      t *
      path.straightLength

    const point =
      path.beltPointAtDistance(
        distance
      )

    const radius =
      0.12 +
      Math.random() * 0.18

    const geometry =
      new THREE.DodecahedronGeometry(
        radius,
        1
      )

    const material =
      oreMaterials[
      Math.floor(
        Math.random() *
        oreMaterials.length
      )
      ]

    const ore =
      new THREE.Mesh(
        geometry,
        material
      )

    /*
     * Keep ore above the belt trough.
     */
    ore.position.copy(
      point
    )

    ore.position.y +=
      0.16 +
      Math.random() * 0.14

    ore.position.z =
      (
        Math.random() - 0.5
      ) *
      1.1

    ore.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    )

    ore.castShadow = true
    ore.receiveShadow = true

    ore.userData = {
      isOreLump: true,
      beltT: t,
      randomOffset:
        Math.random(),
    }

    oreGroup.add(ore)
  }


  return oreGroup
}


/* ==========================================================================
   EXPORTS
   ========================================================================== */

export {
  buildTrussGeometry,
  buildIdlers,
  buildDriveStation,
  buildTailStation,
  buildSensorGantries,
  buildBeltMesh,
  buildBeltTexture,
  buildOreStream,
}

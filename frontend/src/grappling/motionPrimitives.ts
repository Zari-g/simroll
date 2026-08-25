import type {
  GrapplerChildJointName,
  GrapplerSkeletonPose,
  LocalJointTransform,
} from './skeleton.ts'

export type GrapplerSide = 'left' | 'right'
export type PlanarDirection = 'forward' | 'backward' | 'left' | 'right'
export type ArmPath = 'straight' | 'under' | 'over' | 'across'
export type PummelDirection = 'inside' | 'outside'
export type StepPath = 'over' | 'around'

/** Existing primitives retained for authored 12A recipe compatibility. */
export type EstablishedMotionPrimitive =
  | { readonly type: 'hipShift'; readonly forward?: number; readonly lateral?: number }
  | { readonly type: 'hipEscape'; readonly distance: number; readonly side: GrapplerSide; readonly turn?: number }
  | { readonly type: 'bridge'; readonly lift: number; readonly extension?: number }
  | { readonly type: 'sitUp'; readonly amount: number; readonly drive?: number }
  | { readonly type: 'postHand'; readonly side: GrapplerSide; readonly shoulder: number; readonly elbow?: number }
  | { readonly type: 'torsoTurn'; readonly spine?: number; readonly chest: number }
  | { readonly type: 'pelvisRotation'; readonly amount: number }
  | { readonly type: 'kneeDrive'; readonly side: GrapplerSide; readonly hip: number; readonly knee: number }
  | { readonly type: 'legPummel'; readonly side: GrapplerSide; readonly hip: number; readonly knee: number }
  | { readonly type: 'weightShift'; readonly forward?: number; readonly lateral?: number; readonly torso?: number }

export type CoreMotionPrimitive =
  | { readonly type: 'hipSwitch'; readonly side: GrapplerSide; readonly amount: number; readonly drive?: number }
  | { readonly type: 'hipDrive'; readonly distance: number; readonly lift?: number; readonly extension?: number }
  | { readonly type: 'baseAdjust'; readonly forward?: number; readonly lateral?: number; readonly rotation?: number }
  | { readonly type: 'postRetract'; readonly side: GrapplerSide; readonly amount: number }
  | { readonly type: 'torsoLean'; readonly amount: number; readonly lateral?: number }
  | { readonly type: 'bodyRotation'; readonly amount: number; readonly torsoFollow?: number }

export type ArmMotionPrimitive =
  | { readonly type: 'reach'; readonly side: GrapplerSide; readonly path: ArmPath; readonly amount: number; readonly bend?: number; readonly wrist?: number }
  | { readonly type: 'retractArm'; readonly side: GrapplerSide; readonly amount: number }
  | { readonly type: 'frame'; readonly side: GrapplerSide; readonly amount: number; readonly angle?: number }
  | { readonly type: 'armPummel'; readonly side: GrapplerSide; readonly direction: PummelDirection; readonly amount: number }
  | { readonly type: 'armDrag'; readonly side: GrapplerSide; readonly amount: number; readonly turn?: number }

export type LegMotionPrimitive =
  | { readonly type: 'kneeInsert'; readonly side: GrapplerSide; readonly amount: number; readonly bend?: number }
  | { readonly type: 'kneeRetract'; readonly side: GrapplerSide; readonly amount: number }
  | { readonly type: 'kneeSlide'; readonly side: GrapplerSide; readonly distance: number; readonly angle?: number }
  | { readonly type: 'legHook'; readonly side: GrapplerSide; readonly amount: number; readonly bend?: number }
  | { readonly type: 'legUnhook'; readonly side: GrapplerSide; readonly amount: number }
  | { readonly type: 'step'; readonly side: GrapplerSide; readonly path: StepPath; readonly amount: number; readonly bend?: number }
  | { readonly type: 'hookElevation'; readonly side: GrapplerSide; readonly amount: number; readonly extension?: number }

/** Root and posture changes usable on either grappler; these do not model force. */
export type RelativeMotionPrimitive =
  | { readonly type: 'push'; readonly direction: PlanarDirection; readonly distance: number; readonly side?: GrapplerSide }
  | { readonly type: 'pull'; readonly direction: PlanarDirection; readonly distance: number; readonly side?: GrapplerSide }
  | { readonly type: 'drag'; readonly direction: PlanarDirection; readonly distance: number; readonly turn?: number }
  | { readonly type: 'lift'; readonly amount: number; readonly extension?: number }
  | { readonly type: 'follow'; readonly direction: PlanarDirection; readonly distance: number }
  | { readonly type: 'dropWeight'; readonly amount: number; readonly lean?: number }
  | { readonly type: 'offBalance'; readonly direction: PlanarDirection; readonly amount: number; readonly turn?: number }

export type MotionPrimitive =
  | EstablishedMotionPrimitive
  | CoreMotionPrimitive
  | ArmMotionPrimitive
  | LegMotionPrimitive
  | RelativeMotionPrimitive

function cloneSkeleton(pose: GrapplerSkeletonPose): GrapplerSkeletonPose {
  return {
    root: { position: { ...pose.root.position }, rotation: pose.root.rotation },
    joints: Object.fromEntries(
      Object.entries(pose.joints).map(([name, transform]) => [name, { ...transform }]),
    ) as Record<GrapplerChildJointName, LocalJointTransform>,
  }
}

function withJointRotations(
  pose: GrapplerSkeletonPose,
  rotations: Readonly<Partial<Record<GrapplerChildJointName, number>>>,
): GrapplerSkeletonPose {
  const joints = { ...pose.joints }
  for (const [name, delta] of Object.entries(rotations)) {
    const jointName = name as GrapplerChildJointName
    const transform = pose.joints[jointName]
    joints[jointName] = { ...transform, rotation: transform.rotation + (delta ?? 0) }
  }
  return { root: { position: { ...pose.root.position }, rotation: pose.root.rotation }, joints }
}

function shiftRoot(pose: GrapplerSkeletonPose, forward = 0, lateral = 0): GrapplerSkeletonPose {
  const radians = (pose.root.rotation * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  return {
    root: {
      position: {
        x: pose.root.position.x + forward * cosine - lateral * sine,
        y: pose.root.position.y + forward * sine + lateral * cosine,
      },
      rotation: pose.root.rotation,
    },
    joints: Object.fromEntries(
      Object.entries(pose.joints).map(([name, transform]) => [name, { ...transform }]),
    ) as Record<GrapplerChildJointName, LocalJointTransform>,
  }
}

function rotateRoot(pose: GrapplerSkeletonPose, amount: number): GrapplerSkeletonPose {
  const result = cloneSkeleton(pose)
  return { ...result, root: { ...result.root, rotation: result.root.rotation + amount } }
}

function sidePrefix(side: GrapplerSide) {
  return side === 'left' ? 'left' : 'right'
}

function sideSign(side: GrapplerSide) {
  return side === 'left' ? -1 : 1
}

function directionComponents(direction: PlanarDirection, distance: number) {
  switch (direction) {
    case 'forward': return { forward: distance, lateral: 0 }
    case 'backward': return { forward: -distance, lateral: 0 }
    case 'left': return { forward: 0, lateral: -distance }
    case 'right': return { forward: 0, lateral: distance }
  }
}

function shiftInDirection(
  pose: GrapplerSkeletonPose,
  direction: PlanarDirection,
  distance: number,
) {
  const movement = directionComponents(direction, distance)
  return shiftRoot(pose, movement.forward, movement.lateral)
}

function armRotations(
  side: GrapplerSide,
  shoulder: number,
  elbow = 0,
  wrist = 0,
): Partial<Record<GrapplerChildJointName, number>> {
  const prefix = sidePrefix(side)
  return {
    [`${prefix}Shoulder`]: shoulder,
    [`${prefix}Elbow`]: elbow,
    [`${prefix}Wrist`]: wrist,
  } as Partial<Record<GrapplerChildJointName, number>>
}

function legRotations(
  side: GrapplerSide,
  hip: number,
  knee = 0,
  ankle = 0,
): Partial<Record<GrapplerChildJointName, number>> {
  const prefix = sidePrefix(side)
  return {
    [`${prefix}Hip`]: hip,
    [`${prefix}Knee`]: knee,
    [`${prefix}Ankle`]: ankle,
  } as Partial<Record<GrapplerChildJointName, number>>
}

/** Apply one deterministic, immutable action in pelvis-rooted skeleton space. */
export function applyMotionPrimitive(
  pose: GrapplerSkeletonPose,
  primitive: MotionPrimitive,
): GrapplerSkeletonPose {
  switch (primitive.type) {
    case 'hipShift':
      return shiftRoot(pose, primitive.forward, primitive.lateral)
    case 'hipEscape': {
      const escaped = shiftRoot(
        pose,
        -primitive.distance * 0.35,
        primitive.side === 'left' ? -primitive.distance : primitive.distance,
      )
      return rotateRoot(escaped, sideSign(primitive.side) * (primitive.turn ?? 12))
    }
    case 'bridge':
      return withJointRotations(shiftRoot(pose, 0, -primitive.lift), {
        spine: -(primitive.extension ?? 10),
        chest: -(primitive.extension ?? 10) * 0.55,
      })
    case 'sitUp':
      return withJointRotations(shiftRoot(pose, primitive.drive ?? 0, 0), {
        spine: primitive.amount * 0.6,
        chest: primitive.amount * 0.4,
        neck: -primitive.amount * 0.2,
      })
    case 'postHand':
      return withJointRotations(pose, armRotations(primitive.side, primitive.shoulder, primitive.elbow))
    case 'torsoTurn':
      return withJointRotations(pose, { spine: primitive.spine ?? 0, chest: primitive.chest })
    case 'pelvisRotation':
      return rotateRoot(pose, primitive.amount)
    case 'kneeDrive':
      return withJointRotations(pose, legRotations(primitive.side, primitive.hip, primitive.knee))
    case 'legPummel':
      return withJointRotations(
        pose,
        legRotations(primitive.side, primitive.hip, primitive.knee, -primitive.knee * 0.25),
      )
    case 'weightShift':
      return withJointRotations(
        shiftRoot(pose, primitive.forward, primitive.lateral),
        { chest: primitive.torso ?? 0 },
      )
    case 'hipSwitch': {
      const sign = sideSign(primitive.side)
      return withJointRotations(
        rotateRoot(shiftRoot(pose, primitive.drive ?? 0, 0), sign * primitive.amount),
        { leftHip: -sign * primitive.amount * 0.35, rightHip: sign * primitive.amount * 0.35 },
      )
    }
    case 'hipDrive':
      return withJointRotations(shiftRoot(pose, primitive.distance, -(primitive.lift ?? 0)), {
        spine: -(primitive.extension ?? 0) * 0.6,
        chest: -(primitive.extension ?? 0) * 0.4,
      })
    case 'baseAdjust':
      return rotateRoot(shiftRoot(pose, primitive.forward, primitive.lateral), primitive.rotation ?? 0)
    case 'postRetract': {
      const sign = sideSign(primitive.side)
      return withJointRotations(
        pose,
        armRotations(primitive.side, -sign * primitive.amount * 0.65, sign * primitive.amount),
      )
    }
    case 'torsoLean':
      return withJointRotations(pose, {
        spine: primitive.amount * 0.6,
        chest: primitive.amount * 0.4,
        neck: -primitive.amount * 0.15,
        ...(primitive.lateral === undefined
          ? {}
          : { leftShoulder: -primitive.lateral * 0.25, rightShoulder: primitive.lateral * 0.25 }),
      })
    case 'bodyRotation':
      return withJointRotations(rotateRoot(pose, primitive.amount), {
        spine: -primitive.amount * (primitive.torsoFollow ?? 0.2),
        chest: -primitive.amount * (primitive.torsoFollow ?? 0.2),
      })
    case 'reach': {
      const sign = sideSign(primitive.side)
      const pathFactor = { straight: 0.75, under: -0.65, over: 1, across: -1 }[primitive.path]
      const reached = withJointRotations(
        pose,
        armRotations(
          primitive.side,
          sign * primitive.amount * pathFactor,
          -sign * (primitive.bend ?? primitive.amount * 0.25),
          sign * (primitive.wrist ?? 0),
        ),
      )
      return primitive.path === 'across'
        ? withJointRotations(reached, { chest: sign * primitive.amount * 0.2 })
        : reached
    }
    case 'retractArm': {
      const sign = sideSign(primitive.side)
      return withJointRotations(
        pose,
        armRotations(primitive.side, -sign * primitive.amount * 0.7, sign * primitive.amount),
      )
    }
    case 'frame': {
      const sign = sideSign(primitive.side)
      return withJointRotations(
        pose,
        armRotations(
          primitive.side,
          sign * (primitive.angle ?? primitive.amount * 0.45),
          -sign * primitive.amount,
          sign * primitive.amount * 0.15,
        ),
      )
    }
    case 'armPummel': {
      const sign = sideSign(primitive.side)
      const direction = primitive.direction === 'inside' ? -1 : 1
      return withJointRotations(
        pose,
        armRotations(
          primitive.side,
          sign * direction * primitive.amount,
          -sign * direction * primitive.amount * 0.6,
        ),
      )
    }
    case 'armDrag': {
      const sign = sideSign(primitive.side)
      return withJointRotations(pose, {
        ...armRotations(primitive.side, -sign * primitive.amount, sign * primitive.amount * 0.55),
        chest: sign * (primitive.turn ?? primitive.amount * 0.25),
      })
    }
    case 'kneeInsert': {
      const sign = sideSign(primitive.side)
      return withJointRotations(
        pose,
        legRotations(
          primitive.side,
          -sign * primitive.amount,
          sign * (primitive.bend ?? primitive.amount * 0.7),
        ),
      )
    }
    case 'kneeRetract': {
      const sign = sideSign(primitive.side)
      return withJointRotations(
        pose,
        legRotations(primitive.side, sign * primitive.amount * 0.65, -sign * primitive.amount),
      )
    }
    case 'kneeSlide': {
      const sign = sideSign(primitive.side)
      const angle = primitive.angle ?? primitive.distance * 0.5
      return withJointRotations(
        shiftRoot(pose, primitive.distance * 0.65, sign * primitive.distance * 0.2),
        legRotations(primitive.side, sign * angle, -sign * angle * 0.8),
      )
    }
    case 'legHook': {
      const sign = sideSign(primitive.side)
      return withJointRotations(
        pose,
        legRotations(
          primitive.side,
          -sign * primitive.amount * 0.6,
          sign * (primitive.bend ?? primitive.amount),
          -sign * primitive.amount * 0.25,
        ),
      )
    }
    case 'legUnhook': {
      const sign = sideSign(primitive.side)
      return withJointRotations(
        pose,
        legRotations(
          primitive.side,
          sign * primitive.amount * 0.5,
          -sign * primitive.amount,
          sign * primitive.amount * 0.2,
        ),
      )
    }
    case 'step': {
      const sign = sideSign(primitive.side)
      const path = primitive.path === 'over' ? 1 : -1
      return withJointRotations(
        shiftRoot(pose, primitive.path === 'around' ? primitive.amount * 0.25 : 0, 0),
        legRotations(
          primitive.side,
          sign * path * primitive.amount,
          -sign * (primitive.bend ?? primitive.amount * 0.65),
        ),
      )
    }
    case 'hookElevation': {
      const sign = sideSign(primitive.side)
      return withJointRotations(
        shiftRoot(pose, 0, -primitive.amount * 0.2),
        legRotations(
          primitive.side,
          -sign * primitive.amount * 0.45,
          sign * (primitive.extension ?? primitive.amount * 0.7),
          -sign * primitive.amount * 0.15,
        ),
      )
    }
    case 'push': {
      const braced = shiftInDirection(pose, primitive.direction, -primitive.distance * 0.15)
      if (!primitive.side) return braced
      const sign = sideSign(primitive.side)
      return withJointRotations(
        braced,
        armRotations(
          primitive.side,
          sign * primitive.distance * 0.45,
          -sign * primitive.distance * 0.2,
        ),
      )
    }
    case 'pull': {
      const pulled = shiftInDirection(pose, primitive.direction, primitive.distance * 0.25)
      if (!primitive.side) return pulled
      const sign = sideSign(primitive.side)
      return withJointRotations(
        pulled,
        armRotations(
          primitive.side,
          -sign * primitive.distance * 0.35,
          sign * primitive.distance * 0.7,
        ),
      )
    }
    case 'drag':
      return withJointRotations(
        shiftInDirection(pose, primitive.direction, primitive.distance),
        { chest: primitive.turn ?? 0 },
      )
    case 'lift':
      return withJointRotations(shiftRoot(pose, 0, -primitive.amount), {
        spine: -(primitive.extension ?? 0) * 0.6,
        chest: -(primitive.extension ?? 0) * 0.4,
      })
    case 'follow':
      return shiftInDirection(pose, primitive.direction, primitive.distance)
    case 'dropWeight':
      return withJointRotations(shiftRoot(pose, 0, primitive.amount), {
        spine: primitive.lean ?? 0,
        chest: (primitive.lean ?? 0) * 0.5,
      })
    case 'offBalance': {
      const shifted = shiftInDirection(pose, primitive.direction, primitive.amount)
      const defaultTurn = primitive.direction === 'left'
        ? -primitive.amount * 0.5
        : primitive.direction === 'right'
          ? primitive.amount * 0.5
          : 0
      return rotateRoot(shifted, primitive.turn ?? defaultTurn)
    }
  }
}

export function composeMotionPrimitives(
  pose: GrapplerSkeletonPose,
  primitives: readonly MotionPrimitive[],
): GrapplerSkeletonPose {
  return primitives.reduce(applyMotionPrimitive, pose)
}

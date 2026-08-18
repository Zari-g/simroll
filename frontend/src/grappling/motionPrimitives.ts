import type {
  GrapplerChildJointName,
  GrapplerSkeletonPose,
  LocalJointTransform,
} from './skeleton.ts'

export type GrapplerSide = 'left' | 'right'

export type MotionPrimitive =
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

function cloneSkeleton(pose: GrapplerSkeletonPose): GrapplerSkeletonPose {
  return {
    root: {
      position: { ...pose.root.position },
      rotation: pose.root.rotation,
    },
    joints: Object.fromEntries(
      Object.entries(pose.joints).map(([name, transform]) => [
        name,
        { ...transform },
      ]),
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
    joints[jointName] = {
      ...transform,
      rotation: transform.rotation + (delta ?? 0),
    }
  }
  return { root: { position: { ...pose.root.position }, rotation: pose.root.rotation }, joints }
}

function shiftRoot(
  pose: GrapplerSkeletonPose,
  forward = 0,
  lateral = 0,
): GrapplerSkeletonPose {
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
      return {
        ...escaped,
        root: {
          ...escaped.root,
          rotation:
            escaped.root.rotation +
            (primitive.side === 'left' ? -1 : 1) * (primitive.turn ?? 12),
        },
      }
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
    case 'postHand': {
      const prefix = primitive.side === 'left' ? 'left' : 'right'
      return withJointRotations(pose, {
        [`${prefix}Shoulder`]: primitive.shoulder,
        [`${prefix}Elbow`]: primitive.elbow ?? 0,
      } as Partial<Record<GrapplerChildJointName, number>>)
    }
    case 'torsoTurn':
      return withJointRotations(pose, {
        spine: primitive.spine ?? 0,
        chest: primitive.chest,
      })
    case 'pelvisRotation': {
      const result = cloneSkeleton(pose)
      return {
        ...result,
        root: { ...result.root, rotation: result.root.rotation + primitive.amount },
      }
    }
    case 'kneeDrive': {
      const prefix = primitive.side === 'left' ? 'left' : 'right'
      return withJointRotations(pose, {
        [`${prefix}Hip`]: primitive.hip,
        [`${prefix}Knee`]: primitive.knee,
      } as Partial<Record<GrapplerChildJointName, number>>)
    }
    case 'legPummel': {
      const prefix = primitive.side === 'left' ? 'left' : 'right'
      return withJointRotations(pose, {
        [`${prefix}Hip`]: primitive.hip,
        [`${prefix}Knee`]: primitive.knee,
        [`${prefix}Ankle`]: -primitive.knee * 0.25,
      } as Partial<Record<GrapplerChildJointName, number>>)
    }
    case 'weightShift':
      return withJointRotations(
        shiftRoot(pose, primitive.forward, primitive.lateral),
        { chest: primitive.torso ?? 0 },
      )
  }
}

export function composeMotionPrimitives(
  pose: GrapplerSkeletonPose,
  primitives: readonly MotionPrimitive[],
): GrapplerSkeletonPose {
  return primitives.reduce(applyMotionPrimitive, pose)
}

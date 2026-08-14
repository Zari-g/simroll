export const grapplerJointNames = [
  'pelvis',
  'spine',
  'chest',
  'neck',
  'head',
  'leftShoulder',
  'leftElbow',
  'leftWrist',
  'rightShoulder',
  'rightElbow',
  'rightWrist',
  'leftHip',
  'leftKnee',
  'leftAnkle',
  'rightHip',
  'rightKnee',
  'rightAnkle',
] as const

export type GrapplerJointName = (typeof grapplerJointNames)[number]
export type GrapplerRootJointName = 'pelvis'
export type GrapplerChildJointName = Exclude<
  GrapplerJointName,
  GrapplerRootJointName
>

export interface JointPosition {
  readonly x: number
  readonly y: number
}

/** A joint transform expressed in its parent's coordinate system. */
export interface LocalJointTransform extends JointPosition {
  readonly rotation: number
}

export interface RootJointTransform {
  readonly position: JointPosition
  readonly rotation: number
}

/**
 * Authoritative kinematic pose. Child coordinates and rotations are local to
 * the parent declared in `grapplerJointParents`.
 */
export interface GrapplerSkeletonPose {
  readonly root: RootJointTransform
  readonly joints: Readonly<
    Record<GrapplerChildJointName, LocalJointTransform>
  >
}

export interface WorldJointTransform extends JointPosition {
  readonly rotation: number
}

/** Derived world-space geometry; never authored alongside a local pose. */
export interface ResolvedGrapplerSkeleton {
  readonly joints: Readonly<Record<GrapplerJointName, WorldJointTransform>>
}

export const grapplerJointParents = {
  pelvis: null,
  spine: 'pelvis',
  chest: 'spine',
  neck: 'chest',
  head: 'neck',
  leftShoulder: 'chest',
  leftElbow: 'leftShoulder',
  leftWrist: 'leftElbow',
  rightShoulder: 'chest',
  rightElbow: 'rightShoulder',
  rightWrist: 'rightElbow',
  leftHip: 'pelvis',
  leftKnee: 'leftHip',
  leftAnkle: 'leftKnee',
  rightHip: 'pelvis',
  rightKnee: 'rightHip',
  rightAnkle: 'rightKnee',
} as const satisfies Readonly<
  Record<GrapplerJointName, GrapplerJointName | null>
>

export interface GrapplerJointRelationship {
  readonly parent: GrapplerJointName
  readonly child: GrapplerChildJointName
}

export const grapplerJointRelationships: readonly GrapplerJointRelationship[] =
  grapplerJointNames.flatMap((child) => {
    const parent = grapplerJointParents[child]

    return parent === null
      ? []
      : [{ parent, child: child as GrapplerChildJointName }]
  })

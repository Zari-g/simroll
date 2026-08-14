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

/** Pose-only controls for the pelvis-rooted articulated core. */
export interface CoreArticulation {
  readonly pelvisRotation: number
  readonly spineFlexion: number
  readonly chestRotation: number
  readonly neckRotation?: number
  readonly headRotation?: number
}

/** Parent-relative controls for one connected two-segment limb chain. */
export interface LimbArticulation {
  readonly proximalRotation: number
  readonly distalRotation: number
  readonly proximalLength: number
  readonly distalLength: number
}

export interface GrapplerLimbArticulations {
  readonly leftArm: LimbArticulation
  readonly rightArm: LimbArticulation
  readonly leftLeg: LimbArticulation
  readonly rightLeg: LimbArticulation
}

/**
 * Compact authored pose. Anatomy supplies attachment spans and core lengths;
 * this definition supplies only root placement and local articulation.
 */
export interface ArticulatedGrapplerPoseDefinition {
  readonly rootPosition: JointPosition
  readonly core: CoreArticulation
  readonly limbs: GrapplerLimbArticulations
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

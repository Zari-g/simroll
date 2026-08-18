import {
  grapplerJointNames,
  grapplerJointParents,
  type GrapplerChildJointName,
  type GrapplerJointName,
  type GrapplerSkeletonPose,
  type JointPosition,
  type ResolvedGrapplerSkeleton,
  type WorldJointTransform,
} from './skeleton.ts'
import type {
  GrapplerPose,
  GrapplerSegmentName,
  SegmentPose,
} from './types.ts'
import {
  constrainSkeletonPose,
  validateSkeletonPose,
} from './poseValidation.ts'

export interface SegmentJointRelationship {
  readonly start: GrapplerJointName
  readonly end: GrapplerJointName
}

export interface ResolvedCoreGeometry {
  readonly pelvis: WorldJointTransform
  readonly spine: WorldJointTransform
  readonly chest: WorldJointTransform
  readonly neck: WorldJointTransform
  readonly head: WorldJointTransform
  /** Renderer-compatible chord derived across the articulated core. */
  readonly torso: SegmentPose
}

export const skeletonSegmentJoints = {
  torso: { start: 'pelvis', end: 'chest' },
  leftUpperArm: { start: 'leftShoulder', end: 'leftElbow' },
  leftForearm: { start: 'leftElbow', end: 'leftWrist' },
  rightUpperArm: { start: 'rightShoulder', end: 'rightElbow' },
  rightForearm: { start: 'rightElbow', end: 'rightWrist' },
  leftThigh: { start: 'leftHip', end: 'leftKnee' },
  leftShin: { start: 'leftKnee', end: 'leftAnkle' },
  rightThigh: { start: 'rightHip', end: 'rightKnee' },
  rightShin: { start: 'rightKnee', end: 'rightAnkle' },
} as const satisfies Readonly<
  Record<GrapplerSegmentName, SegmentJointRelationship>
>

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function calculateSegmentEndpoint(
  segment: SegmentPose,
): JointPosition {
  const radians = degreesToRadians(segment.rotation)

  return {
    x: segment.x + Math.cos(radians) * segment.length,
    y: segment.y + Math.sin(radians) * segment.length,
  }
}

function rotatePoint(point: JointPosition, degrees: number): JointPosition {
  const radians = degreesToRadians(degrees)
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)

  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  }
}

export function calculateSegmentLength(
  start: JointPosition,
  end: JointPosition,
): number {
  return Math.hypot(end.x - start.x, end.y - start.y)
}

export function calculateSegmentRotation(
  start: JointPosition,
  end: JointPosition,
): number {
  return (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI
}

export function deriveSegmentPose(
  start: JointPosition,
  end: JointPosition,
): SegmentPose {
  return {
    x: start.x,
    y: start.y,
    rotation: calculateSegmentRotation(start, end),
    length: calculateSegmentLength(start, end),
  }
}

/** Resolve parent-relative joint transforms into a fresh world-space pose. */
export function resolveSkeletonPose(
  skeleton: GrapplerSkeletonPose,
): ResolvedGrapplerSkeleton {
  const validation = validateSkeletonPose(skeleton)
  const structuralViolation = validation.violations.find(
    (violation) => violation.category === 'structure',
  )
  if (structuralViolation) {
    throw new Error(`Cannot resolve malformed skeleton: ${structuralViolation.message}`)
  }
  const constrainedSkeleton = constrainSkeletonPose(skeleton)
  const resolved = {
    pelvis: {
      x: constrainedSkeleton.root.position.x,
      y: constrainedSkeleton.root.position.y,
      rotation: constrainedSkeleton.root.rotation,
    },
  } as Partial<Record<GrapplerJointName, WorldJointTransform>>

  for (const jointName of grapplerJointNames.slice(1)) {
    const childName = jointName as GrapplerChildJointName
    const parentName = grapplerJointParents[childName]
    const parent = resolved[parentName]
    if (!parent) {
      throw new Error(`Cannot resolve ${childName} before ${parentName}`)
    }

    const local = constrainedSkeleton.joints[childName]
    const offset = rotatePoint(local, parent.rotation)
    resolved[childName] = {
      x: parent.x + offset.x,
      y: parent.y + offset.y,
      rotation: parent.rotation + local.rotation,
    }
  }

  return {
    joints: resolved as Record<GrapplerJointName, WorldJointTransform>,
  }
}

export function deriveSkeletonSegments(
  skeleton: ResolvedGrapplerSkeleton,
): Readonly<Record<GrapplerSegmentName, SegmentPose>> {
  const core = deriveResolvedCoreGeometry(skeleton)

  return Object.fromEntries(
    Object.entries(skeletonSegmentJoints).map(
      ([segmentName, relationship]) => [
        segmentName,
        segmentName === 'torso'
          ? core.torso
          : deriveSegmentPose(
              skeleton.joints[relationship.start],
              skeleton.joints[relationship.end],
            ),
      ],
    ),
  ) as Record<GrapplerSegmentName, SegmentPose>
}

/** Rich resolved core data kept outside React and SVG rendering code. */
export function deriveResolvedCoreGeometry(
  skeleton: ResolvedGrapplerSkeleton,
): ResolvedCoreGeometry {
  const { pelvis, spine, chest, neck, head } = skeleton.joints

  return {
    pelvis: { ...pelvis },
    spine: { ...spine },
    chest: { ...chest },
    neck: { ...neck },
    head: { ...head },
    torso: deriveSegmentPose(pelvis, chest),
  }
}

/** Adapter from resolved kinematic geometry to the current SVG renderer. */
export function skeletonToGrapplerPose(
  skeleton: GrapplerSkeletonPose | ResolvedGrapplerSkeleton,
): GrapplerPose {
  const resolved = 'root' in skeleton ? resolveSkeletonPose(skeleton) : skeleton

  return {
    head: {
      x: resolved.joints.head.x,
      y: resolved.joints.head.y,
    },
    core: {
      pelvis: {
        x: resolved.joints.pelvis.x,
        y: resolved.joints.pelvis.y,
      },
      spine: {
        x: resolved.joints.spine.x,
        y: resolved.joints.spine.y,
      },
      chest: {
        x: resolved.joints.chest.x,
        y: resolved.joints.chest.y,
      },
    },
    segments: deriveSkeletonSegments(resolved),
  }
}

function pointAlongSegment(
  start: JointPosition,
  end: JointPosition,
  progress: number,
): JointPosition {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  }
}

function endpointFrom(
  start: JointPosition,
  rotation: number,
  length: number,
): JointPosition {
  const radians = degreesToRadians(rotation)

  return {
    x: start.x + Math.cos(radians) * length,
    y: start.y + Math.sin(radians) * length,
  }
}

function localTransformFromWorld(
  joint: WorldJointTransform,
  parent: WorldJointTransform,
) {
  const offset = rotatePoint(
    { x: joint.x - parent.x, y: joint.y - parent.y },
    -parent.rotation,
  )

  return {
    ...offset,
    rotation: joint.rotation - parent.rotation,
  }
}

function localSkeletonFromWorldJoints(
  joints: Readonly<Record<GrapplerJointName, WorldJointTransform>>,
): GrapplerSkeletonPose {
  const localJoints = {} as Record<
    GrapplerChildJointName,
    ReturnType<typeof localTransformFromWorld>
  >

  for (const jointName of grapplerJointNames.slice(1)) {
    const childName = jointName as GrapplerChildJointName
    const parentName = grapplerJointParents[childName]
    localJoints[childName] = localTransformFromWorld(
      joints[childName],
      joints[parentName],
    )
  }

  return {
    root: {
      position: { x: joints.pelvis.x, y: joints.pelvis.y },
      rotation: joints.pelvis.rotation,
    },
    joints: localJoints,
  }
}

/**
 * Incremental migration adapter for legacy flat poses. Upper/lower limb gaps
 * are intentionally normalized so the resulting skeleton has connected
 * elbows and knees. The input object is never changed.
 */
export function grapplerPoseToSkeleton(pose: GrapplerPose): GrapplerSkeletonPose {
  const torso = pose.segments.torso
  const pelvis = { x: torso.x, y: torso.y }
  const chest = calculateSegmentEndpoint(torso)
  const spine = pointAlongSegment(pelvis, chest, 0.5)
  const neck = pointAlongSegment(chest, pose.head, 0.5)
  const coreRotation = torso.rotation
  const neckRotation =
    calculateSegmentLength(chest, pose.head) === 0
      ? coreRotation
      : calculateSegmentRotation(chest, pose.head)

  const leftUpperArm = pose.segments.leftUpperArm
  const rightUpperArm = pose.segments.rightUpperArm
  const leftForearm = pose.segments.leftForearm
  const rightForearm = pose.segments.rightForearm
  const leftThigh = pose.segments.leftThigh
  const rightThigh = pose.segments.rightThigh
  const leftShin = pose.segments.leftShin
  const rightShin = pose.segments.rightShin

  const leftElbow = calculateSegmentEndpoint(leftUpperArm)
  const rightElbow = calculateSegmentEndpoint(rightUpperArm)
  const leftKnee = calculateSegmentEndpoint(leftThigh)
  const rightKnee = calculateSegmentEndpoint(rightThigh)

  const worldJoints: Record<GrapplerJointName, WorldJointTransform> = {
    pelvis: { ...pelvis, rotation: coreRotation },
    spine: { ...spine, rotation: coreRotation },
    chest: { ...chest, rotation: coreRotation },
    neck: { ...neck, rotation: neckRotation },
    head: { ...pose.head, rotation: neckRotation },
    leftShoulder: {
      x: leftUpperArm.x,
      y: leftUpperArm.y,
      rotation: leftUpperArm.rotation,
    },
    leftElbow: { ...leftElbow, rotation: leftForearm.rotation },
    leftWrist: {
      ...endpointFrom(leftElbow, leftForearm.rotation, leftForearm.length),
      rotation: leftForearm.rotation,
    },
    rightShoulder: {
      x: rightUpperArm.x,
      y: rightUpperArm.y,
      rotation: rightUpperArm.rotation,
    },
    rightElbow: { ...rightElbow, rotation: rightForearm.rotation },
    rightWrist: {
      ...endpointFrom(rightElbow, rightForearm.rotation, rightForearm.length),
      rotation: rightForearm.rotation,
    },
    leftHip: {
      x: leftThigh.x,
      y: leftThigh.y,
      rotation: leftThigh.rotation,
    },
    leftKnee: { ...leftKnee, rotation: leftShin.rotation },
    leftAnkle: {
      ...endpointFrom(leftKnee, leftShin.rotation, leftShin.length),
      rotation: leftShin.rotation,
    },
    rightHip: {
      x: rightThigh.x,
      y: rightThigh.y,
      rotation: rightThigh.rotation,
    },
    rightKnee: { ...rightKnee, rotation: rightShin.rotation },
    rightAnkle: {
      ...endpointFrom(rightKnee, rightShin.rotation, rightShin.length),
      rotation: rightShin.rotation,
    },
  }

  return localSkeletonFromWorldJoints(worldJoints)
}

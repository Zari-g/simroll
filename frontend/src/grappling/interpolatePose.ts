import type {
  GrapplerChildJointName,
  GrapplerSkeletonPose,
  LocalJointTransform,
} from './skeleton.ts'
import type {
  GrapplerId,
  GrapplerPose,
  GrapplerSegmentName,
  SkeletonPoseOverride,
  TransitionGrapplerChoreography,
  TransitionVisualDefinition,
} from './types'
import { grapplerPoseToSkeleton, skeletonToGrapplerPose } from './kinematics.ts'
import { composeMotionPrimitives } from './motionPrimitives.ts'
import { constrainSkeletonPose } from './poseValidation.ts'

export type GrapplerPosePair = Record<GrapplerId, GrapplerPose>

const segmentNames: readonly GrapplerSegmentName[] = [
  'torso',
  'leftUpperArm',
  'leftForearm',
  'rightUpperArm',
  'rightForearm',
  'leftThigh',
  'leftShin',
  'rightThigh',
  'rightShin',
]

export function lerpNumber(start: number, end: number, progress: number) {
  return start + (end - start) * progress
}

export function interpolateAngle(
  start: number,
  end: number,
  progress: number,
) {
  if (progress <= 0) return start
  if (progress >= 1) return end

  const delta = ((end - start + 540) % 360) - 180
  return start + delta * progress
}

export function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2
}

function cloneGrapplerPose(pose: GrapplerPose): GrapplerPose {
  return {
    head: { ...pose.head },
    core: pose.core && {
      pelvis: { ...pose.core.pelvis },
      spine: { ...pose.core.spine },
      chest: { ...pose.core.chest },
    },
    segments: Object.fromEntries(
      segmentNames.map((segmentName) => [
        segmentName,
        { ...pose.segments[segmentName] },
      ]),
    ) as GrapplerPose['segments'],
  }
}

export function interpolateGrapplerPose(
  start: GrapplerPose,
  end: GrapplerPose,
  progress: number,
): GrapplerPose {
  if (progress <= 0) return cloneGrapplerPose(start)
  if (progress >= 1) return cloneGrapplerPose(end)

  const segments = Object.fromEntries(
      segmentNames.map((segmentName) => {
        const startSegment = start.segments[segmentName]
        const endSegment = end.segments[segmentName]
        return [
          segmentName,
          {
            x: lerpNumber(startSegment.x, endSegment.x, progress),
            y: lerpNumber(startSegment.y, endSegment.y, progress),
            rotation: interpolateAngle(
              startSegment.rotation,
              endSegment.rotation,
              progress,
            ),
            length: lerpNumber(
              startSegment.length,
              endSegment.length,
              progress,
            ),
          },
        ]
      }),
    ) as GrapplerPose['segments']
  const torsoRadians = (segments.torso.rotation * Math.PI) / 180

  return {
    head: {
      x: lerpNumber(start.head.x, end.head.x, progress),
      y: lerpNumber(start.head.y, end.head.y, progress),
    },
    core:
      start.core && end.core
        ? {
            pelvis: { x: segments.torso.x, y: segments.torso.y },
            spine: {
              x: lerpNumber(start.core.spine.x, end.core.spine.x, progress),
              y: lerpNumber(start.core.spine.y, end.core.spine.y, progress),
            },
            chest: {
              x: segments.torso.x + Math.cos(torsoRadians) * segments.torso.length,
              y: segments.torso.y + Math.sin(torsoRadians) * segments.torso.length,
            },
          }
        : undefined,
    segments,
  }
}

function interpolateSkeletonPose(
  start: GrapplerSkeletonPose,
  end: GrapplerSkeletonPose,
  progress: number,
): GrapplerSkeletonPose {
  return {
    root: {
      position: {
        x: lerpNumber(start.root.position.x, end.root.position.x, progress),
        y: lerpNumber(start.root.position.y, end.root.position.y, progress),
      },
      rotation: interpolateAngle(start.root.rotation, end.root.rotation, progress),
    },
    joints: Object.fromEntries(
      Object.entries(start.joints).map(([name, transform]) => {
        const jointName = name as GrapplerChildJointName
        const target = end.joints[jointName]
        return [
          jointName,
          {
            x: lerpNumber(transform.x, target.x, progress),
            y: lerpNumber(transform.y, target.y, progress),
            rotation: interpolateAngle(transform.rotation, target.rotation, progress),
          },
        ]
      }),
    ) as Record<GrapplerChildJointName, LocalJointTransform>,
  }
}

function applySkeletonOverride(
  pose: GrapplerSkeletonPose,
  override?: SkeletonPoseOverride,
): GrapplerSkeletonPose {
  if (!override) return pose
  const joints = { ...pose.joints }
  for (const [name, transform] of Object.entries(override.joints ?? {})) {
    const jointName = name as GrapplerChildJointName
    joints[jointName] = { ...joints[jointName], ...transform }
  }
  return {
    root: {
      position: { ...pose.root.position, ...override.root?.position },
      rotation: override.root?.rotation ?? pose.root.rotation,
    },
    joints,
  }
}

function resolveChoreographedSkeleton(
  start: GrapplerSkeletonPose,
  end: GrapplerSkeletonPose,
  baseProgress: number,
  choreography?: TransitionGrapplerChoreography,
): GrapplerSkeletonPose {
  const blended = interpolateSkeletonPose(start, end, baseProgress)
  const moved = composeMotionPrimitives(blended, choreography?.primitives ?? [])
  return constrainSkeletonPose(applySkeletonOverride(moved, choreography?.override))
}

interface CompiledTransitionFrame {
  readonly progress: number
  readonly poses: GrapplerPosePair
  readonly skeletons?: Readonly<Record<GrapplerId, GrapplerSkeletonPose>>
}

const compiledTransitionCache = new WeakMap<
  TransitionVisualDefinition,
  WeakMap<GrapplerPosePair, WeakMap<GrapplerPosePair, readonly CompiledTransitionFrame[]>>
>()

function compileTransitionFrames(
  definition: TransitionVisualDefinition,
  start: GrapplerPosePair,
  end: GrapplerPosePair,
): readonly CompiledTransitionFrame[] {
  const startSkeletons = {
    playerA: grapplerPoseToSkeleton(start.playerA),
    playerB: grapplerPoseToSkeleton(start.playerB),
  }
  const endSkeletons = {
    playerA: grapplerPoseToSkeleton(end.playerA),
    playerB: grapplerPoseToSkeleton(end.playerB),
  }

  return [
    { progress: 0, poses: { playerA: cloneGrapplerPose(start.playerA), playerB: cloneGrapplerPose(start.playerB) } },
    ...definition.keyframes
      .filter((phase) => phase.progress > 0 && phase.progress < 1)
      .map((phase) => {
        const baseProgress = phase.baseProgress ?? phase.progress
        const skeletons = {
          playerA: resolveChoreographedSkeleton(
            startSkeletons.playerA,
            endSkeletons.playerA,
            baseProgress,
            phase.playerA,
          ),
          playerB: resolveChoreographedSkeleton(
            startSkeletons.playerB,
            endSkeletons.playerB,
            baseProgress,
            phase.playerB,
          ),
        }
        return {
          progress: phase.progress,
          skeletons,
          poses: {
            playerA: skeletonToGrapplerPose(skeletons.playerA),
            playerB: skeletonToGrapplerPose(skeletons.playerB),
          },
        }
      }),
    { progress: 1, poses: { playerA: cloneGrapplerPose(end.playerA), playerB: cloneGrapplerPose(end.playerB) } },
  ].sort((left, right) => left.progress - right.progress)
}

function getCompiledTransitionFrames(
  definition: TransitionVisualDefinition,
  start: GrapplerPosePair,
  end: GrapplerPosePair,
) {
  let byStart = compiledTransitionCache.get(definition)
  if (!byStart) {
    byStart = new WeakMap()
    compiledTransitionCache.set(definition, byStart)
  }
  let byEnd = byStart.get(start)
  if (!byEnd) {
    byEnd = new WeakMap()
    byStart.set(start, byEnd)
  }
  let frames = byEnd.get(end)
  if (!frames) {
    frames = compileTransitionFrames(definition, start, end)
    byEnd.set(end, frames)
  }
  return frames
}

/** Authoring/test access to the constrained local skeleton phases. */
export function resolveTransitionSkeletonKeyframes(
  definition: TransitionVisualDefinition,
  start: GrapplerPosePair,
  end: GrapplerPosePair,
) {
  return getCompiledTransitionFrames(definition, start, end)
    .filter((frame) => frame.skeletons)
    .map((frame) => ({ progress: frame.progress, skeletons: frame.skeletons! }))
}

export function resolveTransitionPoses(
  definition: TransitionVisualDefinition,
  start: GrapplerPosePair,
  end: GrapplerPosePair,
  progress: number,
): GrapplerPosePair {
  if (progress <= 0) return {
    playerA: cloneGrapplerPose(start.playerA),
    playerB: cloneGrapplerPose(start.playerB),
  }
  if (progress >= 1) return {
    playerA: cloneGrapplerPose(end.playerA),
    playerB: cloneGrapplerPose(end.playerB),
  }

  const frames = getCompiledTransitionFrames(definition, start, end)

  const rightIndex = frames.findIndex((frame) => frame.progress >= progress)
  const leftFrame = frames[rightIndex - 1]
  const rightFrame = frames[rightIndex]
  const localProgress = easeInOutCubic(
    (progress - leftFrame.progress) /
      (rightFrame.progress - leftFrame.progress),
  )

  return {
    playerA: interpolateGrapplerPose(
      leftFrame.poses.playerA,
      rightFrame.poses.playerA,
      localProgress,
    ),
    playerB: interpolateGrapplerPose(
      leftFrame.poses.playerB,
      rightFrame.poses.playerB,
      localProgress,
    ),
  }
}

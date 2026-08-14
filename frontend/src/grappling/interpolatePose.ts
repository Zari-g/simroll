import type {
  GrapplerId,
  GrapplerPose,
  GrapplerPoseOverride,
  GrapplerSegmentName,
  TransitionVisualDefinition,
} from './types'

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

  return {
    head: {
      x: lerpNumber(start.head.x, end.head.x, progress),
      y: lerpNumber(start.head.y, end.head.y, progress),
    },
    segments: Object.fromEntries(
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
    ) as GrapplerPose['segments'],
  }
}

function applyPoseOverride(
  pose: GrapplerPose,
  override?: GrapplerPoseOverride,
): GrapplerPose {
  if (!override) return pose

  const segments = { ...pose.segments }
  for (const segmentName of segmentNames) {
    const segmentOverride = override.segments?.[segmentName]
    if (segmentOverride) {
      segments[segmentName] = {
        ...segments[segmentName],
        ...segmentOverride,
      }
    }
  }

  return {
    head: { ...pose.head, ...override.head },
    segments,
  }
}

function resolveAuthoredKeyframe(
  start: GrapplerPosePair,
  end: GrapplerPosePair,
  progress: number,
  playerA?: GrapplerPoseOverride,
  playerB?: GrapplerPoseOverride,
): GrapplerPosePair {
  return {
    playerA: applyPoseOverride(
      interpolateGrapplerPose(start.playerA, end.playerA, progress),
      playerA,
    ),
    playerB: applyPoseOverride(
      interpolateGrapplerPose(start.playerB, end.playerB, progress),
      playerB,
    ),
  }
}

export function resolveTransitionPoses(
  definition: TransitionVisualDefinition,
  start: GrapplerPosePair,
  end: GrapplerPosePair,
  progress: number,
): GrapplerPosePair {
  if (progress <= 0) return resolveAuthoredKeyframe(start, end, 0)
  if (progress >= 1) return resolveAuthoredKeyframe(start, end, 1)

  const frames = [
    { progress: 0, poses: resolveAuthoredKeyframe(start, end, 0) },
    ...definition.keyframes
      .filter((keyframe) => keyframe.progress > 0 && keyframe.progress < 1)
      .map((keyframe) => ({
        progress: keyframe.progress,
        poses: resolveAuthoredKeyframe(
          start,
          end,
          keyframe.progress,
          keyframe.playerA,
          keyframe.playerB,
        ),
      })),
    { progress: 1, poses: resolveAuthoredKeyframe(start, end, 1) },
  ].sort((left, right) => left.progress - right.progress)

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

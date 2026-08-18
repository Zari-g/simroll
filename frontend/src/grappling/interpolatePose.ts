import type {
  GrapplerCorePose,
  GrapplerId,
  GrapplerPose,
  GrapplerPoseOverride,
  GrapplerSegmentName,
  SegmentPose,
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

function transformCorePoint(
  point: GrapplerCorePose['pelvis'],
  from: SegmentPose,
  to: SegmentPose,
) {
  const fromRadians = (-from.rotation * Math.PI) / 180
  const x = point.x - from.x
  const y = point.y - from.y
  const localX = x * Math.cos(fromRadians) - y * Math.sin(fromRadians)
  const localY = x * Math.sin(fromRadians) + y * Math.cos(fromRadians)
  const scale = to.length / from.length
  const toRadians = (to.rotation * Math.PI) / 180

  return {
    x:
      to.x +
      localX * scale * Math.cos(toRadians) -
      localY * scale * Math.sin(toRadians),
    y:
      to.y +
      localX * scale * Math.sin(toRadians) +
      localY * scale * Math.cos(toRadians),
  }
}

function transformCorePose(
  core: GrapplerCorePose,
  to: SegmentPose,
): GrapplerCorePose {
  const from = {
    x: core.pelvis.x,
    y: core.pelvis.y,
    rotation:
      (Math.atan2(
        core.chest.y - core.pelvis.y,
        core.chest.x - core.pelvis.x,
      ) *
        180) /
      Math.PI,
    length: Math.hypot(
      core.chest.x - core.pelvis.x,
      core.chest.y - core.pelvis.y,
    ),
  }

  return {
    pelvis: transformCorePoint(core.pelvis, from, to),
    spine: transformCorePoint(core.spine, from, to),
    chest: transformCorePoint(core.chest, from, to),
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
    core:
      start.core && end.core
        ? {
            pelvis: {
              x: lerpNumber(start.core.pelvis.x, end.core.pelvis.x, progress),
              y: lerpNumber(start.core.pelvis.y, end.core.pelvis.y, progress),
            },
            spine: {
              x: lerpNumber(start.core.spine.x, end.core.spine.x, progress),
              y: lerpNumber(start.core.spine.y, end.core.spine.y, progress),
            },
            chest: {
              x: lerpNumber(start.core.chest.x, end.core.chest.x, progress),
              y: lerpNumber(start.core.chest.y, end.core.chest.y, progress),
            },
          }
        : undefined,
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

  const core =
    pose.core && override.segments?.torso
      ? transformCorePose(
          pose.core,
          segments.torso,
        )
      : pose.core && {
          pelvis: { ...pose.core.pelvis },
          spine: { ...pose.core.spine },
          chest: { ...pose.core.chest },
        }

  return {
    head: { ...pose.head, ...override.head },
    core,
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

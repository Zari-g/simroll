import type {
  GrapplerPose,
  GrapplerPoseOverride,
  GrapplerSegmentName,
} from './types'

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

export function createPoseVariant(
  basePose: GrapplerPose,
  override: GrapplerPoseOverride,
): GrapplerPose {
  return {
    head: {
      ...basePose.head,
      ...override.head,
    },
    segments: Object.fromEntries(
      segmentNames.map((segmentName) => [
        segmentName,
        {
          ...basePose.segments[segmentName],
          ...override.segments?.[segmentName],
        },
      ]),
    ) as Record<
      GrapplerSegmentName,
      GrapplerPose['segments'][GrapplerSegmentName]
    >,
  }
}

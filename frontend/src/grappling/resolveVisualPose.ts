import { getGripVisualModifier } from './gripVisuals.ts'
import type {
  GrapplerId,
  GrapplerPose,
  GrapplerSegmentName,
  GrapplingPositionVisualDefinition,
  GripContactIndicator,
  GripPositionVisualModifier,
} from './types'

export interface ResolvedPositionVisual {
  poses: Record<GrapplerId, GrapplerPose>
  contactIndicators: GripContactIndicator[]
}

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

function clonePose(pose: GrapplerPose): GrapplerPose {
  return {
    head: { ...pose.head },
    segments: Object.fromEntries(
      segmentNames.map((segmentName) => [
        segmentName,
        { ...pose.segments[segmentName] },
      ]),
    ) as Record<GrapplerSegmentName, GrapplerPose['segments'][GrapplerSegmentName]>,
  }
}

function applyModifier(
  pose: GrapplerPose,
  modifier: GripPositionVisualModifier,
) {
  for (const segmentName of segmentNames) {
    const override = modifier.segmentOverrides[segmentName]
    if (override) {
      pose.segments[segmentName] = {
        ...pose.segments[segmentName],
        ...override,
      }
    }
  }
}

export function resolveVisualPose(
  baseVisual: GrapplingPositionVisualDefinition,
  activeGripIds: readonly string[],
): ResolvedPositionVisual {
  const poses = {
    playerA: clonePose(baseVisual.playerAPose),
    playerB: clonePose(baseVisual.playerBPose),
  }

  const modifiers = [...new Set(activeGripIds)]
    .map((gripId) => ({
      gripId,
      modifier: getGripVisualModifier(gripId, baseVisual.positionId),
    }))
    .filter(
      (
        entry,
      ): entry is { gripId: string; modifier: GripPositionVisualModifier } =>
        entry.modifier !== null,
    )
    // Higher priority wins a segment/property conflict; grip ID breaks ties.
    .sort(
      (left, right) =>
        left.modifier.priority - right.modifier.priority ||
        left.gripId.localeCompare(right.gripId),
    )

  const contactIndicators: GripContactIndicator[] = []
  for (const { modifier } of modifiers) {
    applyModifier(poses[modifier.appliesTo], modifier)
    if (modifier.contactIndicator) {
      contactIndicators.push({ ...modifier.contactIndicator })
    }
  }

  return { poses, contactIndicators }
}

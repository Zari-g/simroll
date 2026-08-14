import type { GrapplerChildJointName } from './skeleton.ts'

export type ConstrainedJointName = Exclude<GrapplerChildJointName, 'head'>

export interface JointRotationConstraint {
  readonly minRotation: number
  readonly maxRotation: number
  readonly preferredRange?: Readonly<{
    minRotation: number
    maxRotation: number
  }>
}

export type JointConstraintProfile = Readonly<
  Record<ConstrainedJointName, JointRotationConstraint>
>

/** Return the equivalent angle in the canonical [-180, 180) interval. */
export function normalizeAngleDegrees(rotation: number): number {
  if (!Number.isFinite(rotation)) {
    return rotation
  }
  if (rotation >= -180 && rotation < 180) {
    return rotation
  }

  const normalized = ((rotation + 180) % 360 + 360) % 360 - 180
  return Object.is(normalized, -0) ? 0 : normalized
}

export function mirrorRotationConstraint(
  constraint: JointRotationConstraint,
): JointRotationConstraint {
  return {
    minRotation: -constraint.maxRotation,
    maxRotation: -constraint.minRotation,
    ...(constraint.preferredRange
      ? {
          preferredRange: {
            minRotation: -constraint.preferredRange.maxRotation,
            maxRotation: -constraint.preferredRange.minRotation,
          },
        }
      : {}),
  }
}

export function constrainRotation(
  rotation: number,
  constraint: JointRotationConstraint,
): number {
  const normalized = normalizeAngleDegrees(rotation)
  if (!Number.isFinite(normalized)) {
    return normalized
  }

  return Math.min(
    constraint.maxRotation,
    Math.max(constraint.minRotation, normalized),
  )
}

const leftShoulderConstraint = {
  minRotation: -165,
  maxRotation: 170,
  preferredRange: { minRotation: -145, maxRotation: 145 },
} as const satisfies JointRotationConstraint

const leftHipConstraint = {
  minRotation: -170,
  maxRotation: 175,
  preferredRange: { minRotation: -155, maxRotation: 160 },
} as const satisfies JointRotationConstraint

/**
 * Conservative visual limits for the parent-relative 2D skeleton. These are
 * authoring guardrails, not clinical or three-dimensional biomechanical data.
 */
export const defaultHumanJointConstraints = {
  spine: {
    minRotation: -45,
    maxRotation: 45,
    preferredRange: { minRotation: -25, maxRotation: 25 },
  },
  chest: {
    minRotation: -45,
    maxRotation: 45,
    preferredRange: { minRotation: -25, maxRotation: 25 },
  },
  neck: {
    minRotation: -65,
    maxRotation: 65,
    preferredRange: { minRotation: -35, maxRotation: 35 },
  },
  leftShoulder: leftShoulderConstraint,
  rightShoulder: mirrorRotationConstraint(leftShoulderConstraint),
  leftElbow: {
    minRotation: -175,
    maxRotation: 175,
    preferredRange: { minRotation: -150, maxRotation: 150 },
  },
  rightElbow: {
    minRotation: -175,
    maxRotation: 175,
    preferredRange: { minRotation: -150, maxRotation: 150 },
  },
  leftWrist: {
    minRotation: -95,
    maxRotation: 95,
    preferredRange: { minRotation: -60, maxRotation: 60 },
  },
  rightWrist: {
    minRotation: -95,
    maxRotation: 95,
    preferredRange: { minRotation: -60, maxRotation: 60 },
  },
  leftHip: leftHipConstraint,
  rightHip: mirrorRotationConstraint(leftHipConstraint),
  leftKnee: {
    minRotation: -125,
    maxRotation: 125,
    preferredRange: { minRotation: -110, maxRotation: 110 },
  },
  rightKnee: {
    minRotation: -125,
    maxRotation: 125,
    preferredRange: { minRotation: -110, maxRotation: 110 },
  },
  leftAnkle: {
    minRotation: -75,
    maxRotation: 75,
    preferredRange: { minRotation: -45, maxRotation: 45 },
  },
  rightAnkle: {
    minRotation: -75,
    maxRotation: 75,
    preferredRange: { minRotation: -45, maxRotation: 45 },
  },
} as const satisfies JointConstraintProfile

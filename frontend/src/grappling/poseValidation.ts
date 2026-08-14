import {
  constrainRotation,
  defaultHumanJointConstraints,
  normalizeAngleDegrees,
  type ConstrainedJointName,
  type JointConstraintProfile,
} from './jointConstraints.ts'
import {
  grapplerJointNames,
  grapplerJointParents,
  type GrapplerChildJointName,
  type GrapplerJointName,
  type GrapplerSkeletonPose,
  type LocalJointTransform,
} from './skeleton.ts'

export type PoseViolationSeverity = 'warning' | 'error'

export interface RotationConstraintViolation {
  readonly category: 'rotation'
  readonly severity: 'error'
  readonly joint: ConstrainedJointName
  readonly requestedValue: number
  readonly normalizedValue: number
  readonly resolvedValue: number
  readonly minAllowed: number
  readonly maxAllowed: number
  readonly message: string
}

export interface StructuralPoseViolation {
  readonly category: 'structure'
  readonly severity: 'error'
  readonly joint: GrapplerJointName
  readonly field: 'position' | 'rotation' | 'length' | 'parent' | 'transform'
  readonly message: string
}

export type PoseConstraintViolation =
  | RotationConstraintViolation
  | StructuralPoseViolation

export interface PoseValidationResult {
  readonly valid: boolean
  readonly violations: readonly PoseConstraintViolation[]
}

const constrainedJointNames = Object.keys(
  defaultHumanJointConstraints,
) as ConstrainedJointName[]

const lengthBearingJointNames = new Set<GrapplerChildJointName>([
  'spine',
  'chest',
  'neck',
  'head',
  'leftElbow',
  'leftWrist',
  'rightElbow',
  'rightWrist',
  'leftKnee',
  'leftAnkle',
  'rightKnee',
  'rightAnkle',
])

function structuralViolation(
  joint: GrapplerJointName,
  field: StructuralPoseViolation['field'],
  message: string,
): StructuralPoseViolation {
  return { category: 'structure', severity: 'error', joint, field, message }
}

function validateHierarchy(): StructuralPoseViolation[] {
  const violations: StructuralPoseViolation[] = []
  const available = new Set<GrapplerJointName>(['pelvis'])

  for (const joint of grapplerJointNames.slice(1)) {
    const child = joint as GrapplerChildJointName
    const parent = grapplerJointParents[child]
    if (!available.has(parent)) {
      violations.push(
        structuralViolation(
          child,
          'parent',
          `${child} references unavailable parent ${parent}`,
        ),
      )
    }
    available.add(child)
  }

  return violations
}

function validateRoot(skeleton: GrapplerSkeletonPose): StructuralPoseViolation[] {
  const violations: StructuralPoseViolation[] = []
  const { position, rotation } = skeleton.root

  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    violations.push(
      structuralViolation('pelvis', 'position', 'pelvis position must be finite'),
    )
  }
  if (!Number.isFinite(rotation)) {
    violations.push(
      structuralViolation('pelvis', 'rotation', 'pelvis rotation must be finite'),
    )
  }

  return violations
}

function validateLocalTransform(
  joint: GrapplerChildJointName,
  transform: LocalJointTransform | undefined,
): StructuralPoseViolation[] {
  if (!transform) {
    return [
      structuralViolation(joint, 'transform', `${joint} transform is missing`),
    ]
  }

  const violations: StructuralPoseViolation[] = []
  if (!Number.isFinite(transform.x) || !Number.isFinite(transform.y)) {
    violations.push(
      structuralViolation(joint, 'position', `${joint} offset must be finite`),
    )
  }
  if (!Number.isFinite(transform.rotation)) {
    violations.push(
      structuralViolation(joint, 'rotation', `${joint} rotation must be finite`),
    )
  }
  if (lengthBearingJointNames.has(joint) && transform.x <= 0) {
    violations.push(
      structuralViolation(
        joint,
        'length',
        `${joint} structural length must be greater than zero`,
      ),
    )
  }
  if (
    !lengthBearingJointNames.has(joint) &&
    Number.isFinite(transform.x) &&
    Number.isFinite(transform.y) &&
    Math.hypot(transform.x, transform.y) === 0
  ) {
    violations.push(
      structuralViolation(
        joint,
        'length',
        `${joint} attachment offset must be greater than zero`,
      ),
    )
  }

  return violations
}

/** Inspect authored local transforms without changing them. */
export function validateSkeletonPose(
  skeleton: GrapplerSkeletonPose,
  profile: JointConstraintProfile = defaultHumanJointConstraints,
): PoseValidationResult {
  const violations: PoseConstraintViolation[] = [
    ...validateHierarchy(),
    ...validateRoot(skeleton),
  ]
  const joints = skeleton.joints as Partial<
    Record<GrapplerChildJointName, LocalJointTransform>
  >

  for (const joint of grapplerJointNames.slice(1)) {
    violations.push(
      ...validateLocalTransform(
        joint as GrapplerChildJointName,
        joints[joint as GrapplerChildJointName],
      ),
    )
  }

  for (const joint of constrainedJointNames) {
    const transform = joints[joint]
    if (!transform || !Number.isFinite(transform.rotation)) {
      continue
    }
    const constraint = profile[joint]
    const normalizedValue = normalizeAngleDegrees(transform.rotation)
    const resolvedValue = constrainRotation(transform.rotation, constraint)
    if (resolvedValue !== normalizedValue) {
      violations.push({
        category: 'rotation',
        severity: 'error',
        joint,
        requestedValue: transform.rotation,
        normalizedValue,
        resolvedValue,
        minAllowed: constraint.minRotation,
        maxAllowed: constraint.maxRotation,
        message: `${joint} rotation ${transform.rotation}deg resolves to ${resolvedValue}deg`,
      })
    }
  }

  return { valid: violations.length === 0, violations }
}

/**
 * Return a fresh pose with constrained joint rotations. Structural problems
 * stay visible to validation and are not concealed by invented geometry.
 */
export function constrainSkeletonPose(
  skeleton: GrapplerSkeletonPose,
  profile: JointConstraintProfile = defaultHumanJointConstraints,
): GrapplerSkeletonPose {
  const constrainedJoints = Object.fromEntries(
    grapplerJointNames.slice(1).map((jointName) => {
      const joint = jointName as GrapplerChildJointName
      const transform = skeleton.joints[joint]
      const constraint = profile[joint as ConstrainedJointName]

      return [
        joint,
        {
          ...transform,
          rotation: constraint
            ? constrainRotation(transform.rotation, constraint)
            : transform.rotation,
        },
      ]
    }),
  ) as Record<GrapplerChildJointName, LocalJointTransform>

  return {
    root: {
      position: { ...skeleton.root.position },
      rotation: skeleton.root.rotation,
    },
    joints: constrainedJoints,
  }
}

/** Development-only, one-shot authoring feedback; never used per animation frame. */
export function warnForInvalidSkeletonPose(
  skeleton: GrapplerSkeletonPose,
  label: string,
): PoseValidationResult {
  const result = validateSkeletonPose(skeleton)

  if (!result.valid && import.meta.env?.DEV) {
    console.warn(`Invalid skeleton pose: ${label}`, result.violations)
  }

  return result
}

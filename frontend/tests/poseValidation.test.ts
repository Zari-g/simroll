import assert from 'node:assert/strict'
import test from 'node:test'

import {
  defaultHumanJointConstraints,
  normalizeAngleDegrees,
} from '../src/grappling/jointConstraints.ts'
import {
  calculateSegmentEndpoint,
  resolveSkeletonPose,
  skeletonToGrapplerPose,
} from '../src/grappling/kinematics.ts'
import {
  constrainSkeletonPose,
  validateSkeletonPose,
} from '../src/grappling/poseValidation.ts'
import { articulatedPositionSkeletons } from '../src/grappling/positionVisuals.ts'
import type {
  GrapplerChildJointName,
  GrapplerSkeletonPose,
  LocalJointTransform,
} from '../src/grappling/skeleton.ts'

const migratedSkeletons = [
  ['Closed Guard Bottom', articulatedPositionSkeletons.closed_guard_bottom.playerA],
  ['Closed Guard Top', articulatedPositionSkeletons.closed_guard_bottom.playerB],
  ['Mount Top', articulatedPositionSkeletons.mount_top.playerA],
  ['Mount Bottom', articulatedPositionSkeletons.mount_top.playerB],
  ['Side Control Top', articulatedPositionSkeletons.side_control_top.playerA],
  ['Side Control Bottom', articulatedPositionSkeletons.side_control_top.playerB],
] as const

function baseSkeleton(): GrapplerSkeletonPose {
  return articulatedPositionSkeletons.closed_guard_bottom.playerA
}

function withRotation(
  skeleton: GrapplerSkeletonPose,
  joint: GrapplerChildJointName,
  rotation: number,
): GrapplerSkeletonPose {
  return {
    ...skeleton,
    root: { ...skeleton.root, position: { ...skeleton.root.position } },
    joints: {
      ...skeleton.joints,
      [joint]: { ...skeleton.joints[joint], rotation },
    },
  }
}

function assertPointNear(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
) {
  assert.ok(Math.abs(actual.x - expected.x) < 1e-10)
  assert.ok(Math.abs(actual.y - expected.y) < 1e-10)
}

test('default profile represents every constrained core and limb joint', () => {
  assert.deepEqual(Object.keys(defaultHumanJointConstraints).sort(), [
    'chest',
    'leftAnkle',
    'leftElbow',
    'leftHip',
    'leftKnee',
    'leftShoulder',
    'leftWrist',
    'neck',
    'rightAnkle',
    'rightElbow',
    'rightHip',
    'rightKnee',
    'rightShoulder',
    'rightWrist',
    'spine',
  ])
})

test('excessive elbow rotation is reported and clamped', () => {
  const skeleton = withRotation(baseSkeleton(), 'leftElbow', 179)
  const validation = validateSkeletonPose(skeleton)
  const violation = validation.violations.find(
    (item) => item.category === 'rotation' && item.joint === 'leftElbow',
  )

  assert.equal(validation.valid, false)
  assert.ok(violation)
  assert.equal(violation.requestedValue, 179)
  assert.equal(violation.minAllowed, -175)
  assert.equal(violation.maxAllowed, 175)
  assert.equal(violation.resolvedValue, 175)
  assert.equal(constrainSkeletonPose(skeleton).joints.leftElbow.rotation, 175)
})

test('backwards knee configuration is reported and clamped', () => {
  const skeleton = withRotation(baseSkeleton(), 'rightKnee', 150)
  const validation = validateSkeletonPose(skeleton)
  const violation = validation.violations.find(
    (item) => item.category === 'rotation' && item.joint === 'rightKnee',
  )

  assert.ok(violation)
  assert.equal(violation.resolvedValue, 125)
  assert.equal(constrainSkeletonPose(skeleton).joints.rightKnee.rotation, 125)
})

test('extreme shoulder rotation is detected using mirrored limits', () => {
  const skeleton = withRotation(baseSkeleton(), 'rightShoulder', 179)
  const violation = validateSkeletonPose(skeleton).violations.find(
    (item) => item.category === 'rotation' && item.joint === 'rightShoulder',
  )

  assert.ok(violation)
  assert.equal(defaultHumanJointConstraints.rightShoulder.maxRotation, 165)
  assert.equal(violation.resolvedValue, 165)
})

test('grappling-specific hip flexion remains accepted', () => {
  const skeleton = withRotation(baseSkeleton(), 'leftHip', 169)

  assert.equal(validateSkeletonPose(skeleton).valid, true)
  assert.equal(constrainSkeletonPose(skeleton).joints.leftHip.rotation, 169)
})

test('excessive spine, chest, and neck articulation is constrained', () => {
  for (const [joint, requested, expected] of [
    ['spine', 80, 45],
    ['chest', -75, -45],
    ['neck', 100, 65],
  ] as const) {
    const skeleton = withRotation(baseSkeleton(), joint, requested)
    const violation = validateSkeletonPose(skeleton).violations.find(
      (item) => item.category === 'rotation' && item.joint === joint,
    )

    assert.ok(violation)
    assert.equal(violation.resolvedValue, expected)
    assert.equal(constrainSkeletonPose(skeleton).joints[joint].rotation, expected)
  }
})

test('wrapped angles normalize consistently before validation and correction', () => {
  const skeleton = withRotation(baseSkeleton(), 'leftWrist', 370)

  assert.equal(normalizeAngleDegrees(370), 10)
  assert.equal(normalizeAngleDegrees(-350), 10)
  assert.equal(validateSkeletonPose(skeleton).valid, true)
  assert.equal(constrainSkeletonPose(skeleton).joints.leftWrist.rotation, 10)
})

test('validation and correction are immutable and deterministic', () => {
  const skeleton = withRotation(baseSkeleton(), 'leftKnee', 160)
  const snapshot = structuredClone(skeleton)

  const firstValidation = validateSkeletonPose(skeleton)
  const secondValidation = validateSkeletonPose(skeleton)
  const firstCorrection = constrainSkeletonPose(skeleton)
  const secondCorrection = constrainSkeletonPose(skeleton)

  assert.deepEqual(firstValidation, secondValidation)
  assert.deepEqual(firstCorrection, secondCorrection)
  assert.deepEqual(skeleton, snapshot)
  assert.notEqual(firstCorrection, skeleton)
  assert.notEqual(firstCorrection.joints, skeleton.joints)
})

test('all six re-authored core figures satisfy the default profile', () => {
  for (const [label, skeleton] of migratedSkeletons) {
    assert.deepEqual(validateSkeletonPose(skeleton), {
      valid: true,
      violations: [],
    }, label)
  }
})

test('structural validation detects missing, non-finite, and zero-length joints', () => {
  const missingJoints = { ...baseSkeleton().joints } as Partial<
    Record<GrapplerChildJointName, LocalJointTransform>
  >
  delete missingJoints.leftWrist
  const missing = {
    ...baseSkeleton(),
    joints: missingJoints as Record<GrapplerChildJointName, LocalJointTransform>,
  }
  const nonFinite = {
    ...baseSkeleton(),
    root: { ...baseSkeleton().root, position: { x: Number.NaN, y: 300 } },
  }
  const zeroLength = {
    ...baseSkeleton(),
    joints: {
      ...baseSkeleton().joints,
      leftElbow: { ...baseSkeleton().joints.leftElbow, x: 0 },
    },
  }

  assert.ok(
    validateSkeletonPose(missing).violations.some(
      (item) => item.category === 'structure' && item.joint === 'leftWrist',
    ),
  )
  assert.ok(
    validateSkeletonPose(nonFinite).violations.some(
      (item) => item.category === 'structure' && item.field === 'position',
    ),
  )
  assert.ok(
    validateSkeletonPose(zeroLength).violations.some(
      (item) => item.category === 'structure' && item.field === 'length',
    ),
  )
  assert.throws(() => resolveSkeletonPose(zeroLength), /malformed skeleton/)
})

test('constrained world geometry retains connected segment chains', () => {
  const skeleton = withRotation(baseSkeleton(), 'leftKnee', 160)
  const resolved = resolveSkeletonPose(skeleton)
  const pose = skeletonToGrapplerPose(skeleton)

  assert.equal(
    resolved.joints.leftKnee.rotation,
    resolved.joints.leftHip.rotation +
      defaultHumanJointConstraints.leftKnee.maxRotation,
  )

  for (const [proximal, distal] of [
    ['leftUpperArm', 'leftForearm'],
    ['rightUpperArm', 'rightForearm'],
    ['leftThigh', 'leftShin'],
    ['rightThigh', 'rightShin'],
  ] as const) {
    assertPointNear(
      calculateSegmentEndpoint(pose.segments[proximal]),
      pose.segments[distal],
    )
  }
})

test('valid endpoint poses remain exact through constraint resolution', () => {
  for (const [, skeleton] of migratedSkeletons) {
    const constrained = constrainSkeletonPose(skeleton)

    assert.deepEqual(constrained, skeleton)
    assert.deepEqual(
      skeletonToGrapplerPose(constrained),
      skeletonToGrapplerPose(skeleton),
    )
  }
})

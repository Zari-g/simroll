import assert from 'node:assert/strict'
import test from 'node:test'

import { groundSkeletonPose } from '../src/grappling/groundedAnchors.ts'
import { resolveSkeletonPose } from '../src/grappling/kinematics.ts'
import { validateSkeletonPose } from '../src/grappling/poseValidation.ts'
import { articulatedPositionSkeletons } from '../src/grappling/positionVisuals.ts'
import type { GrapplerSkeletonPose } from '../src/grappling/skeleton.ts'

function getClosedGuardSkeleton(): GrapplerSkeletonPose {
  return articulatedPositionSkeletons.closed_guard_bottom.playerA
}

function assertFiniteSkeleton(skeleton: GrapplerSkeletonPose) {
  assert.ok(Number.isFinite(skeleton.root.position.x))
  assert.ok(Number.isFinite(skeleton.root.position.y))
  assert.ok(Number.isFinite(skeleton.root.rotation))
  for (const transform of Object.values(skeleton.joints)) {
    assert.ok(Number.isFinite(transform.x))
    assert.ok(Number.isFinite(transform.y))
    assert.ok(Number.isFinite(transform.rotation))
  }
}

test('grounding is a no-op when no anchors are declared', () => {
  const skeleton = getClosedGuardSkeleton()
  const snapshot = structuredClone(skeleton)

  assert.deepEqual(groundSkeletonPose(skeleton), skeleton)
  assert.deepEqual(groundSkeletonPose(skeleton, {}), skeleton)
  assert.deepEqual(skeleton, snapshot)
})

test('grounding pins a declared joint to its mat baseline Y', () => {
  const skeleton = getClosedGuardSkeleton()
  const resolved = resolveSkeletonPose(skeleton)
  const baselineY = resolved.joints.leftKnee.y + 40
  const grounded = groundSkeletonPose(skeleton, { leftKnee: { baselineY } })
  const groundedResolved = resolveSkeletonPose(grounded)

  assert.ok(Math.abs(groundedResolved.joints.leftKnee.y - baselineY) < 1e-9)
  assert.equal(groundedResolved.joints.leftKnee.x, resolved.joints.leftKnee.x)
})

test('grounding the pelvis translates every joint by the same delta', () => {
  const skeleton = getClosedGuardSkeleton()
  const before = resolveSkeletonPose(skeleton)
  const deltaY = 15
  const grounded = groundSkeletonPose(skeleton, {
    pelvis: { baselineY: skeleton.root.position.y + deltaY },
  })
  const after = resolveSkeletonPose(grounded)

  for (const jointName of Object.keys(before.joints) as Array<
    keyof typeof before.joints
  >) {
    assert.ok(
      Math.abs(after.joints[jointName].y - before.joints[jointName].y - deltaY) <
        1e-9,
    )
    assert.equal(after.joints[jointName].x, before.joints[jointName].x)
  }
})

test('grounding within tolerance of the baseline is a no-op', () => {
  const skeleton = getClosedGuardSkeleton()
  const currentKneeY = resolveSkeletonPose(skeleton).joints.leftKnee.y
  const grounded = groundSkeletonPose(skeleton, {
    leftKnee: { baselineY: currentKneeY + 2, tolerance: 5 },
  })

  assert.deepEqual(grounded, skeleton)
})

test('grounding stays inside the existing joint constraint profile', () => {
  const skeleton = getClosedGuardSkeleton()
  assert.equal(validateSkeletonPose(skeleton).valid, true)
  const resolved = resolveSkeletonPose(skeleton)

  const grounded = groundSkeletonPose(skeleton, {
    leftKnee: { baselineY: resolved.joints.leftKnee.y + 30 },
    rightWrist: { baselineY: resolved.joints.rightWrist.y - 20 },
  })

  assert.equal(validateSkeletonPose(grounded).valid, true)
})

test('grounding produces finite output for finite anchors', () => {
  const skeleton = getClosedGuardSkeleton()
  const grounded = groundSkeletonPose(skeleton, {
    leftKnee: { baselineY: 999 },
    rightAnkle: { baselineY: -250 },
  })

  assertFiniteSkeleton(grounded)
})

test('grounding ignores a non-finite baseline and leaves the skeleton unchanged', () => {
  const skeleton = getClosedGuardSkeleton()
  const grounded = groundSkeletonPose(skeleton, {
    leftKnee: { baselineY: Number.NaN },
  })

  assert.deepEqual(grounded, skeleton)
})

test('grounding is deterministic and does not mutate its input', () => {
  const skeleton = getClosedGuardSkeleton()
  const snapshot = structuredClone(skeleton)
  const anchors = {
    leftKnee: {
      baselineY: resolveSkeletonPose(skeleton).joints.leftKnee.y + 25,
    },
  } as const

  const first = groundSkeletonPose(skeleton, anchors)
  const second = groundSkeletonPose(skeleton, anchors)

  assert.deepEqual(first, second)
  assert.deepEqual(skeleton, snapshot)
})

test('grounding applies anchors in canonical joint order regardless of declaration order', () => {
  const skeleton = getClosedGuardSkeleton()
  const resolved = resolveSkeletonPose(skeleton)
  const rightWristBaseline = resolved.joints.rightWrist.y + 10
  const leftKneeBaseline = resolved.joints.leftKnee.y + 30
  const anchorsA = {
    rightWrist: { baselineY: rightWristBaseline },
    leftKnee: { baselineY: leftKneeBaseline },
  } as const
  const anchorsB = {
    leftKnee: { baselineY: leftKneeBaseline },
    rightWrist: { baselineY: rightWristBaseline },
  } as const

  const groundedA = groundSkeletonPose(skeleton, anchorsA)
  const groundedB = groundSkeletonPose(skeleton, anchorsB)

  assert.deepEqual(groundedA, groundedB)

  // leftKnee is resolved after rightWrist in canonical joint order, so it
  // lands exactly on its baseline while the earlier rightWrist anchor drifts
  // away from its own baseline again -- this is intentional sequential
  // resolution, not simultaneous multi-anchor solving.
  const groundedResolved = resolveSkeletonPose(groundedA)
  assert.ok(
    Math.abs(groundedResolved.joints.leftKnee.y - leftKneeBaseline) < 1e-9,
  )
  assert.notEqual(groundedResolved.joints.rightWrist.y, rightWristBaseline)
})

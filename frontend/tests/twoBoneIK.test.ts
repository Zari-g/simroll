import assert from 'node:assert/strict'
import test from 'node:test'

import { defaultGrapplerAnatomy } from '../src/grappling/anatomy.ts'
import { createArticulatedSkeletonPose } from '../src/grappling/coreKinematics.ts'
import { resolveSkeletonPose } from '../src/grappling/kinematics.ts'
import type { GrapplerSkeletonPose, JointPosition } from '../src/grappling/skeleton.ts'
import {
  solveTwoBoneIK,
  twoBoneIKChains,
  type TwoBoneIKChain,
} from '../src/grappling/twoBoneIK.ts'
import { validateSkeletonPose } from '../src/grappling/poseValidation.ts'

function baseSkeleton(): GrapplerSkeletonPose {
  return createArticulatedSkeletonPose({
    rootPosition: { x: 100, y: 100 },
    core: { pelvisRotation: 0, spineFlexion: 0, chestRotation: 0 },
    limbs: {
      leftArm: { proximalRotation: 20, distalRotation: -60, proximalLength: 76, distalLength: 68 },
      rightArm: { proximalRotation: -20, distalRotation: 60, proximalLength: 76, distalLength: 68 },
      leftLeg: { proximalRotation: 25, distalRotation: -70, proximalLength: 116, distalLength: 98 },
      rightLeg: { proximalRotation: -25, distalRotation: 70, proximalLength: 116, distalLength: 98 },
    },
  }, defaultGrapplerAnatomy)
}

function distance(left: JointPosition, right: JointPosition): number {
  return Math.hypot(right.x - left.x, right.y - left.y)
}

function targetFromRoot(
  skeleton: GrapplerSkeletonPose,
  chain: TwoBoneIKChain,
  x: number,
  y: number,
): JointPosition {
  const root = resolveSkeletonPose(skeleton).joints[chain.root]
  return { x: root.x + x, y: root.y + y }
}

function assertPreservedChain(
  before: GrapplerSkeletonPose,
  after: GrapplerSkeletonPose,
  chain: TwoBoneIKChain,
) {
  const beforeWorld = resolveSkeletonPose(before).joints
  const afterWorld = resolveSkeletonPose(after).joints
  assert.ok(Math.abs(
    distance(beforeWorld[chain.root], beforeWorld[chain.mid]) -
      distance(afterWorld[chain.root], afterWorld[chain.mid]),
  ) < 1e-9)
  assert.ok(Math.abs(
    distance(beforeWorld[chain.mid], beforeWorld[chain.end]) -
      distance(afterWorld[chain.mid], afterWorld[chain.end]),
  ) < 1e-9)
  assert.deepEqual(after.root, before.root)
  assert.equal(validateSkeletonPose(after).valid, true)
}

test('solves reachable arm and leg targets exactly without changing bone lengths', () => {
  const skeleton = baseSkeleton()
  const snapshot = structuredClone(skeleton)

  for (const [chain, offset] of [
    [twoBoneIKChains.leftArm, { x: 100, y: 20 }],
    [twoBoneIKChains.leftLeg, { x: 160, y: 30 }],
  ] as const) {
    const target = targetFromRoot(skeleton, chain, offset.x, offset.y)
    const beforeEnd = resolveSkeletonPose(skeleton).joints[chain.end]
    const solved = solveTwoBoneIK({ skeleton, chain, target })
    assert.equal(solved.ok, true)
    if (!solved.ok) continue
    const end = resolveSkeletonPose(solved.skeleton).joints[chain.end]
    assert.ok(distance(end, target) < 1e-8)
    assert.ok(distance(end, target) < distance(beforeEnd, target))
    assertPreservedChain(skeleton, solved.skeleton, chain)
  }

  assert.deepEqual(skeleton, snapshot)
})

test('clamps far and too-close targets to safe reachable geometry', () => {
  const skeleton = baseSkeleton()
  const chain = twoBoneIKChains.leftArm
  const root = resolveSkeletonPose(skeleton).joints[chain.root]
  const farTarget = { x: root.x + 1_000, y: root.y }
  const far = solveTwoBoneIK({ skeleton, chain, target: farTarget })
  assert.equal(far.ok, true)
  if (far.ok) {
    assert.equal(far.reach, 'too-far')
    const end = resolveSkeletonPose(far.skeleton).joints[chain.end]
    assert.ok(Math.abs(distance(root, end) - 144) < 1e-8)
    assert.ok(distance(end, farTarget) < distance(
      resolveSkeletonPose(skeleton).joints[chain.end], farTarget,
    ))
    assertPreservedChain(skeleton, far.skeleton, chain)
  }

  const unequalSkeleton = {
    ...skeleton,
    joints: {
      ...skeleton.joints,
      leftWrist: { ...skeleton.joints.leftWrist, x: 20 },
    },
  }
  const closeTarget = { x: root.x + 2, y: root.y }
  const close = solveTwoBoneIK({ skeleton: unequalSkeleton, chain, target: closeTarget })
  assert.equal(close.ok, true)
  if (close.ok) {
    assert.equal(close.reach, 'too-close')
    for (const joint of Object.values(close.skeleton.joints)) {
      assert.ok(Number.isFinite(joint.rotation))
    }
    assertPreservedChain(unequalSkeleton, close.skeleton, chain)
  }
})

test('bend direction is explicit, repeatable, and selects opposite elbow sides', () => {
  const skeleton = baseSkeleton()
  const chain = twoBoneIKChains.leftArm
  const target = targetFromRoot(skeleton, chain, 100, 0)
  const positive = solveTwoBoneIK({ skeleton, chain, target, bendDirection: 'positive' })
  const repeated = solveTwoBoneIK({ skeleton, chain, target, bendDirection: 'positive' })
  const negative = solveTwoBoneIK({ skeleton, chain, target, bendDirection: 'negative' })
  assert.deepEqual(positive, repeated)
  assert.equal(positive.ok, true)
  assert.equal(negative.ok, true)
  if (!positive.ok || !negative.ok) return

  const root = resolveSkeletonPose(skeleton).joints[chain.root]
  const positiveMid = resolveSkeletonPose(positive.skeleton).joints[chain.mid]
  const negativeMid = resolveSkeletonPose(negative.skeleton).joints[chain.mid]
  assert.ok(positiveMid.y > root.y)
  assert.ok(negativeMid.y < root.y)
})

test('shared joint constraints clamp illegal analytic angles', () => {
  const skeleton = baseSkeleton()
  const chain = twoBoneIKChains.rightArm
  const target = targetFromRoot(skeleton, chain, -1_000, 87)
  const solved = solveTwoBoneIK({
    skeleton,
    chain,
    target,
    bendDirection: 'positive',
  })
  assert.equal(solved.ok, true)
  if (!solved.ok) return
  assert.equal(solved.constrained, true)
  assert.equal(validateSkeletonPose(solved.skeleton).valid, true)
  assertPreservedChain(skeleton, solved.skeleton, chain)
})

test('invalid and degenerate inputs return typed failures without throwing', () => {
  const skeleton = baseSkeleton()
  const chain = twoBoneIKChains.leftArm
  const invalidChain = {
    ...chain,
    mid: 'rightElbow',
  } as TwoBoneIKChain
  const malformed = {
    ...skeleton,
    joints: {
      ...skeleton.joints,
      leftWrist: { ...skeleton.joints.leftWrist, x: 0 },
    },
  }
  const root = resolveSkeletonPose(skeleton).joints.leftShoulder

  assert.equal(solveTwoBoneIK({ skeleton, chain, target: { x: Number.NaN, y: 0 } }).ok, false)
  assert.equal(solveTwoBoneIK({ skeleton, chain, target: { x: Number.POSITIVE_INFINITY, y: 0 } }).ok, false)
  assert.equal(solveTwoBoneIK({ skeleton, chain, target: root }).ok, false)
  assert.equal(solveTwoBoneIK({ skeleton, chain: invalidChain, target: { x: 1, y: 1 } }).ok, false)
  assert.equal(solveTwoBoneIK({ skeleton: malformed, chain, target: { x: 1, y: 1 } }).ok, false)
})

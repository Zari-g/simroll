import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateSegmentRotation,
  deriveSegmentPose,
  grapplerPoseToSkeleton,
  resolveSkeletonPose,
  skeletonToGrapplerPose,
} from '../src/grappling/kinematics.ts'
import { getPositionVisual } from '../src/grappling/positionVisuals.ts'
import {
  grapplerJointNames,
  grapplerJointParents,
  grapplerJointRelationships,
  type GrapplerSkeletonPose,
} from '../src/grappling/skeleton.ts'
import { resolveTransitionPoses } from '../src/grappling/interpolatePose.ts'
import { getTransitionVisual } from '../src/grappling/transitionVisuals.ts'

function getClosedGuardSkeleton(): GrapplerSkeletonPose {
  const visual = getPositionVisual('closed_guard_bottom')
  assert.ok(visual)

  return grapplerPoseToSkeleton(visual.playerAPose)
}

test('skeleton contains every required joint in a parent-first hierarchy', () => {
  assert.deepEqual(grapplerJointNames, [
    'pelvis',
    'spine',
    'chest',
    'neck',
    'head',
    'leftShoulder',
    'leftElbow',
    'leftWrist',
    'rightShoulder',
    'rightElbow',
    'rightWrist',
    'leftHip',
    'leftKnee',
    'leftAnkle',
    'rightHip',
    'rightKnee',
    'rightAnkle',
  ])
  assert.equal(grapplerJointParents.pelvis, null)
  assert.equal(grapplerJointParents.leftShoulder, 'chest')
  assert.equal(grapplerJointParents.leftElbow, 'leftShoulder')
  assert.equal(grapplerJointParents.leftWrist, 'leftElbow')
  assert.equal(grapplerJointParents.rightHip, 'pelvis')
  assert.equal(grapplerJointParents.rightAnkle, 'rightKnee')
  assert.equal(grapplerJointRelationships.length, grapplerJointNames.length - 1)
})

test('segment geometry is derived from its connected joints', () => {
  const segment = deriveSegmentPose({ x: 10, y: 20 }, { x: 13, y: 24 })

  assert.deepEqual(
    { x: segment.x, y: segment.y, length: segment.length },
    { x: 10, y: 20, length: 5 },
  )
  assert.equal(
    segment.rotation,
    calculateSegmentRotation({ x: 10, y: 20 }, { x: 13, y: 24 }),
  )
  assert.ok(Math.abs(segment.rotation - 53.13010235415598) < 1e-10)
})

test('moving the chest coherently moves shoulder-dependent geometry', () => {
  const skeleton = getClosedGuardSkeleton()
  const before = resolveSkeletonPose(skeleton)
  const moved = resolveSkeletonPose({
    ...skeleton,
    joints: {
      ...skeleton.joints,
      chest: {
        ...skeleton.joints.chest,
        x: skeleton.joints.chest.x + 12,
        y: skeleton.joints.chest.y - 7,
      },
    },
  })
  const chestDelta = {
    x: moved.joints.chest.x - before.joints.chest.x,
    y: moved.joints.chest.y - before.joints.chest.y,
  }

  for (const jointName of ['leftShoulder', 'leftElbow', 'leftWrist'] as const) {
    assert.ok(
      Math.abs(
        moved.joints[jointName].x - before.joints[jointName].x - chestDelta.x,
      ) < 1e-10,
    )
    assert.ok(
      Math.abs(
        moved.joints[jointName].y - before.joints[jointName].y - chestDelta.y,
      ) < 1e-10,
    )
  }
})

test('moving the pelvis coherently moves hip-dependent geometry', () => {
  const skeleton = getClosedGuardSkeleton()
  const before = resolveSkeletonPose(skeleton)
  const moved = resolveSkeletonPose({
    ...skeleton,
    root: {
      ...skeleton.root,
      position: {
        x: skeleton.root.position.x + 20,
        y: skeleton.root.position.y + 15,
      },
    },
  })

  for (const jointName of ['leftHip', 'leftKnee', 'leftAnkle'] as const) {
    assert.ok(Math.abs(moved.joints[jointName].x - before.joints[jointName].x - 20) < 1e-10)
    assert.ok(Math.abs(moved.joints[jointName].y - before.joints[jointName].y - 15) < 1e-10)
  }
})

test('skeleton resolution and renderer conversion are deterministic and immutable', () => {
  const skeleton = getClosedGuardSkeleton()
  const snapshot = structuredClone(skeleton)

  assert.deepEqual(resolveSkeletonPose(skeleton), resolveSkeletonPose(skeleton))
  assert.deepEqual(skeletonToGrapplerPose(skeleton), skeletonToGrapplerPose(skeleton))
  assert.deepEqual(skeleton, snapshot)
})

test('derived limb segments share their hierarchy joints', () => {
  const pose = skeletonToGrapplerPose(getClosedGuardSkeleton())
  const upperArm = pose.segments.leftUpperArm
  const forearm = pose.segments.leftForearm
  const radians = (upperArm.rotation * Math.PI) / 180

  assert.ok(
    Math.abs(
      forearm.x - (upperArm.x + Math.cos(radians) * upperArm.length),
    ) < 1e-10,
  )
  assert.ok(
    Math.abs(
      forearm.y - (upperArm.y + Math.sin(radians) * upperArm.length),
    ) < 1e-10,
  )
})

test('transition endpoints remain exact with a skeleton-derived position pose', () => {
  const source = getPositionVisual('closed_guard_bottom')
  const destination = getPositionVisual('mount_top')
  const transition = getTransitionVisual('hip_bump_sweep')
  assert.ok(source)
  assert.ok(destination)
  assert.ok(transition)
  const start = {
    playerA: source.playerAPose,
    playerB: source.playerBPose,
  }
  const end = {
    playerA: destination.playerAPose,
    playerB: destination.playerBPose,
  }

  assert.deepEqual(resolveTransitionPoses(transition, start, end, 0), start)
  assert.deepEqual(resolveTransitionPoses(transition, start, end, 1), end)
})

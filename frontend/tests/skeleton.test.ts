import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateSegmentEndpoint,
  calculateSegmentRotation,
  deriveResolvedCoreGeometry,
  deriveSegmentPose,
  grapplerPoseToSkeleton,
  resolveSkeletonPose,
  skeletonToGrapplerPose,
} from '../src/grappling/kinematics.ts'
import { defaultGrapplerAnatomy } from '../src/grappling/anatomy.ts'
import { createArticulatedSkeletonPose } from '../src/grappling/coreKinematics.ts'
import {
  articulatedPositionSkeletons,
  getPositionVisual,
} from '../src/grappling/positionVisuals.ts'
import {
  grapplerJointNames,
  grapplerJointParents,
  grapplerJointRelationships,
  type GrapplerSkeletonPose,
} from '../src/grappling/skeleton.ts'
import { resolveTransitionPoses } from '../src/grappling/interpolatePose.ts'
import { getAnimationRecipe } from '../src/grappling/animationRecipes/registry.ts'

function getClosedGuardSkeleton(): GrapplerSkeletonPose {
  return articulatedPositionSkeletons.closed_guard_bottom.playerA
}

function assertPointNear(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
) {
  assert.ok(Math.abs(actual.x - expected.x) < 1e-10)
  assert.ok(Math.abs(actual.y - expected.y) < 1e-10)
}

function assertPointMoved(
  before: { x: number; y: number },
  after: { x: number; y: number },
) {
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) > 0.01)
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
  assert.equal(grapplerJointParents.spine, 'pelvis')
  assert.equal(grapplerJointParents.chest, 'spine')
  assert.equal(grapplerJointParents.neck, 'chest')
  assert.equal(grapplerJointParents.head, 'neck')
  assert.equal(grapplerJointParents.leftShoulder, 'chest')
  assert.equal(grapplerJointParents.leftElbow, 'leftShoulder')
  assert.equal(grapplerJointParents.leftWrist, 'leftElbow')
  assert.equal(grapplerJointParents.rightHip, 'pelvis')
  assert.equal(grapplerJointParents.rightAnkle, 'rightKnee')
  assert.equal(grapplerJointRelationships.length, grapplerJointNames.length - 1)
})

test('anatomy-backed authoring keeps core lengths separate from articulation', () => {
  const definition = {
    rootPosition: { x: 200, y: 300 },
    core: {
      pelvisRotation: -90,
      spineFlexion: 15,
      chestRotation: -10,
      neckRotation: 5,
      headRotation: -5,
    },
    limbs: {
      leftArm: { proximalRotation: -60, distalRotation: 90, proximalLength: 70, distalLength: 65 },
      rightArm: { proximalRotation: 60, distalRotation: -90, proximalLength: 70, distalLength: 65 },
      leftLeg: { proximalRotation: -120, distalRotation: -30, proximalLength: 110, distalLength: 95 },
      rightLeg: { proximalRotation: 120, distalRotation: 30, proximalLength: 110, distalLength: 95 },
    },
  } as const
  const definitionSnapshot = structuredClone(definition)
  const skeleton = createArticulatedSkeletonPose(
    definition,
    defaultGrapplerAnatomy,
  )

  assert.equal(
    skeleton.joints.spine.x,
    defaultGrapplerAnatomy.core.pelvisToSpineLength,
  )
  assert.equal(
    skeleton.joints.chest.x,
    defaultGrapplerAnatomy.core.spineToChestLength,
  )
  assert.equal(skeleton.joints.spine.rotation, definition.core.spineFlexion)
  assert.equal(skeleton.joints.chest.rotation, definition.core.chestRotation)
  assert.deepEqual(definition, definitionSnapshot)
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

test('rotating the chest moves shoulders, neck, and head without moving the pelvis', () => {
  const skeleton = getClosedGuardSkeleton()
  const before = resolveSkeletonPose(skeleton)
  const rotated = resolveSkeletonPose({
    ...skeleton,
    joints: {
      ...skeleton.joints,
      chest: {
        ...skeleton.joints.chest,
        rotation: skeleton.joints.chest.rotation + 25,
      },
    },
  })

  assertPointNear(rotated.joints.pelvis, before.joints.pelvis)
  assertPointNear(rotated.joints.chest, before.joints.chest)
  for (const jointName of [
    'leftShoulder',
    'rightShoulder',
    'neck',
    'head',
  ] as const) {
    assertPointMoved(before.joints[jointName], rotated.joints[jointName])
  }
})

test('rotating the pelvis moves hips, legs, and dependent trunk coherently', () => {
  const skeleton = getClosedGuardSkeleton()
  const before = resolveSkeletonPose(skeleton)
  const rotated = resolveSkeletonPose({
    ...skeleton,
    root: {
      ...skeleton.root,
      rotation: skeleton.root.rotation + 25,
    },
  })

  assertPointNear(rotated.joints.pelvis, before.joints.pelvis)
  for (const jointName of [
    'leftHip',
    'leftKnee',
    'leftAnkle',
    'spine',
    'chest',
    'head',
  ] as const) {
    assertPointMoved(before.joints[jointName], rotated.joints[jointName])
  }
})

test('spine flexion changes chest and head position relative to the pelvis', () => {
  const skeleton = getClosedGuardSkeleton()
  const before = resolveSkeletonPose(skeleton)
  const flexed = resolveSkeletonPose({
    ...skeleton,
    joints: {
      ...skeleton.joints,
      spine: {
        ...skeleton.joints.spine,
        rotation: skeleton.joints.spine.rotation + 20,
      },
    },
  })

  assertPointNear(flexed.joints.pelvis, before.joints.pelvis)
  assertPointNear(flexed.joints.spine, before.joints.spine)
  assertPointMoved(before.joints.chest, flexed.joints.chest)
  assertPointMoved(before.joints.head, flexed.joints.head)
})

test('shoulders and hips are symmetric around their anatomy-driven parents', () => {
  const joints = resolveSkeletonPose(getClosedGuardSkeleton()).joints

  assertPointNear(
    {
      x: (joints.leftShoulder.x + joints.rightShoulder.x) / 2,
      y: (joints.leftShoulder.y + joints.rightShoulder.y) / 2,
    },
    joints.chest,
  )
  assertPointNear(
    {
      x: (joints.leftHip.x + joints.rightHip.x) / 2,
      y: (joints.leftHip.y + joints.rightHip.y) / 2,
    },
    joints.pelvis,
  )
  assert.ok(
    Math.abs(
      Math.hypot(
        joints.leftShoulder.x - joints.rightShoulder.x,
        joints.leftShoulder.y - joints.rightShoulder.y,
      ) - defaultGrapplerAnatomy.core.shoulderSpan,
    ) < 1e-10,
  )
  assert.ok(
    Math.abs(
      Math.hypot(
        joints.leftHip.x - joints.rightHip.x,
        joints.leftHip.y - joints.rightHip.y,
      ) - defaultGrapplerAnatomy.core.hipSpan,
    ) < 1e-10,
  )
})

test('resolved core geometry preserves pelvis-spine-chest-neck-head attachment', () => {
  const skeleton = getClosedGuardSkeleton()
  const resolved = resolveSkeletonPose(skeleton)
  const core = deriveResolvedCoreGeometry(resolved)

  assert.deepEqual(core.pelvis, resolved.joints.pelvis)
  assert.deepEqual(core.spine, resolved.joints.spine)
  assert.deepEqual(core.chest, resolved.joints.chest)
  assert.deepEqual(core.neck, resolved.joints.neck)
  assert.deepEqual(core.head, resolved.joints.head)
  assertPointNear(calculateSegmentEndpoint(core.torso), core.chest)
})

test('skeleton resolution and renderer conversion are deterministic and immutable', () => {
  const skeleton = getClosedGuardSkeleton()
  const snapshot = structuredClone(skeleton)

  assert.deepEqual(resolveSkeletonPose(skeleton), resolveSkeletonPose(skeleton))
  assert.deepEqual(skeletonToGrapplerPose(skeleton), skeletonToGrapplerPose(skeleton))
  assert.deepEqual(skeleton, snapshot)
})

test('all derived limb segments meet at their shared hierarchy joints', () => {
  const pose = skeletonToGrapplerPose(getClosedGuardSkeleton())

  for (const [proximalName, distalName] of [
    ['leftUpperArm', 'leftForearm'],
    ['rightUpperArm', 'rightForearm'],
    ['leftThigh', 'leftShin'],
    ['rightThigh', 'rightShin'],
  ] as const) {
    assertPointNear(
      calculateSegmentEndpoint(pose.segments[proximalName]),
      pose.segments[distalName],
    )
  }
})

test('all six representative figures are derived from articulated skeletons', () => {
  for (const positionId of [
    'closed_guard_bottom',
    'mount_top',
    'side_control_top',
  ] as const) {
    const visual = getPositionVisual(positionId)
    assert.ok(visual)

    assert.deepEqual(
      visual.playerAPose,
      skeletonToGrapplerPose(articulatedPositionSkeletons[positionId].playerA),
    )
    assert.deepEqual(
      visual.playerBPose,
      skeletonToGrapplerPose(articulatedPositionSkeletons[positionId].playerB),
    )
  }
})

test('legacy renderer poses retain a connected compatibility adapter', () => {
  const visual = getPositionVisual('mount_top')
  assert.ok(visual)
  const legacySnapshot = structuredClone(visual.playerAPose)
  const converted = skeletonToGrapplerPose(
    grapplerPoseToSkeleton(visual.playerAPose),
  )

  assertPointNear(converted.head, visual.playerAPose.head)
  for (const segmentName of Object.keys(converted.segments) as Array<
    keyof typeof converted.segments
  >) {
    assertPointNear(converted.segments[segmentName], visual.playerAPose.segments[segmentName])
    assertPointNear(
      calculateSegmentEndpoint(converted.segments[segmentName]),
      calculateSegmentEndpoint(visual.playerAPose.segments[segmentName]),
    )
  }
  assert.deepEqual(visual.playerAPose, legacySnapshot)
})

test('transition endpoints remain exact with a skeleton-derived position pose', () => {
  const source = getPositionVisual('closed_guard_bottom')
  const destination = getPositionVisual('mount_top')
  const transition = getAnimationRecipe('hip_bump_sweep')
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

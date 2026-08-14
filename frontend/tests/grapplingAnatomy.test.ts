import assert from 'node:assert/strict'
import test from 'node:test'

import {
  defaultGrapplerAnatomy,
  deriveFootGeometry,
  deriveHandGeometry,
  resolveGrapplerAnatomy,
  resolveSegmentAnatomy,
} from '../src/grappling/anatomy.ts'
import {
  interpolateGrapplerPose,
  resolveTransitionPoses,
} from '../src/grappling/interpolatePose.ts'
import { getPositionVisual } from '../src/grappling/positionVisuals.ts'
import { resolveVisualPose } from '../src/grappling/resolveVisualPose.ts'
import { getTransitionVisual } from '../src/grappling/transitionVisuals.ts'
import type {
  GrapplerSegmentName,
  SegmentPose,
} from '../src/grappling/types.ts'

const requiredBodyRegions = [
  'head',
  'torso',
  'upperArm',
  'forearm',
  'hand',
  'thigh',
  'shin',
  'foot',
] as const

const rigSegmentNames: readonly GrapplerSegmentName[] = [
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

test('default anatomy defines every required human body region', () => {
  for (const region of requiredBodyRegions) {
    assert.ok(region in defaultGrapplerAnatomy)
  }

  assert.ok(defaultGrapplerAnatomy.torso.width > defaultGrapplerAnatomy.upperArm.width)
  assert.ok(defaultGrapplerAnatomy.thigh.width > defaultGrapplerAnatomy.shin.width)
  assert.ok(defaultGrapplerAnatomy.upperArm.width > defaultGrapplerAnatomy.forearm.width)
})

test('every animated rig segment resolves valid anatomy metadata', () => {
  for (const segmentName of rigSegmentNames) {
    const segment = resolveSegmentAnatomy(defaultGrapplerAnatomy, segmentName)

    assert.ok(segment.width > 0)
    assert.ok(segment.jointRadius > 0)
    assert.ok(segment.endpointRadius > 0)
    assert.ok(segment.taper > 0 && segment.taper <= 1)
    assert.ok(Number.isFinite(segment.layerHint))
  }
})

test('players resolve the shared default and support independent overrides', () => {
  const compactAnatomy = {
    ...defaultGrapplerAnatomy,
    head: { ...defaultGrapplerAnatomy.head, radius: 27 },
  }

  assert.strictEqual(resolveGrapplerAnatomy('playerA'), defaultGrapplerAnatomy)
  assert.strictEqual(resolveGrapplerAnatomy('playerB'), defaultGrapplerAnatomy)
  assert.strictEqual(
    resolveGrapplerAnatomy('playerA', { playerA: compactAnatomy }),
    compactAnatomy,
  )
  assert.strictEqual(
    resolveGrapplerAnatomy('playerB', { playerA: compactAnatomy }),
    defaultGrapplerAnatomy,
  )
})

test('hand and foot geometry derives deterministically from limb endpoints', () => {
  const segment: SegmentPose = {
    x: 100,
    y: 50,
    rotation: 0,
    length: 40,
  }

  assert.deepEqual(deriveHandGeometry(segment, defaultGrapplerAnatomy), {
    x: 140,
    y: 50,
    rotation: 0,
    length: defaultGrapplerAnatomy.hand.length,
    width: defaultGrapplerAnatomy.hand.width,
  })
  assert.deepEqual(deriveFootGeometry(segment, defaultGrapplerAnatomy), {
    x: 140,
    y: 50,
    rotation: 0,
    length: defaultGrapplerAnatomy.foot.length,
    width: defaultGrapplerAnatomy.foot.width,
  })
})

test('pose interpolation stays independent from anatomy configuration', () => {
  const closedGuard = getPositionVisual('closed_guard_bottom')
  const mount = getPositionVisual('mount_top')
  assert.ok(closedGuard)
  assert.ok(mount)
  const anatomySnapshot = structuredClone(defaultGrapplerAnatomy)

  const pose = interpolateGrapplerPose(
    closedGuard.playerAPose,
    mount.playerAPose,
    0.5,
  )

  assert.deepEqual(defaultGrapplerAnatomy, anatomySnapshot)
  assert.deepEqual(Object.keys(pose.head).sort(), ['x', 'y'])
  assert.equal('width' in pose.segments.leftUpperArm, false)
})

test('position resolution preserves base poses while applying grip visuals', () => {
  const visual = getPositionVisual('closed_guard_bottom')
  assert.ok(visual)
  const baseRotation = visual.playerAPose.segments.rightUpperArm.rotation

  const resolved = resolveVisualPose(visual, ['sleeve_grip'])

  assert.equal(resolved.poses.playerA.segments.rightUpperArm.rotation, -122)
  assert.equal(visual.playerAPose.segments.rightUpperArm.rotation, baseRotation)
  assert.equal(resolved.contactIndicators.length, 1)
})

test('transition pose resolution still interpolates both grapplers', () => {
  const closedGuard = getPositionVisual('closed_guard_bottom')
  const mount = getPositionVisual('mount_top')
  const transition = getTransitionVisual('hip_bump_sweep')
  assert.ok(closedGuard)
  assert.ok(mount)
  assert.ok(transition)

  const poses = resolveTransitionPoses(
    transition,
    {
      playerA: closedGuard.playerAPose,
      playerB: closedGuard.playerBPose,
    },
    {
      playerA: mount.playerAPose,
      playerB: mount.playerBPose,
    },
    0.5,
  )

  assert.ok(Number.isFinite(poses.playerA.head.x))
  assert.ok(Number.isFinite(poses.playerB.segments.torso.rotation))
})

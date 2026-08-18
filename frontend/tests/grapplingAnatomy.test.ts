import assert from 'node:assert/strict'
import test from 'node:test'

import {
  defaultGrapplerAnatomy,
  deriveFootGeometry,
  deriveHandGeometry,
  getSegmentEndpoint,
  resolveGrapplerAnatomy,
  resolveSegmentAnatomy,
} from '../src/grappling/anatomy.ts'
import {
  createTaperedSegmentGeometry,
  createTorsoGeometry,
  resolveBodyPartLayerOrder,
} from '../src/grappling/bodyGeometry.ts'
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
  'core',
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
  assert.ok(defaultGrapplerAnatomy.core.shoulderSpan > defaultGrapplerAnatomy.core.hipSpan)
  assert.ok(defaultGrapplerAnatomy.core.pelvisToSpineLength > 0)
  assert.ok(defaultGrapplerAnatomy.core.spineToChestLength > 0)
  assert.ok(defaultGrapplerAnatomy.core.neckLength > 0)
  assert.ok(defaultGrapplerAnatomy.core.headOffset > 0)
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

test('tapered body geometry returns deterministic rounded segment paths', () => {
  const geometry = createTaperedSegmentGeometry(100, 40, 0.8)

  assert.deepEqual(geometry, {
    length: 100,
    startWidth: 40,
    endWidth: 32,
    path: 'M 0 -20 L 100 -16 A 16 16 0 0 1 100 16 L 0 20 A 20 20 0 0 1 0 -20 Z',
  })
})

test('renderer geometry keeps pose length authoritative and anatomy controls width', () => {
  const visual = getPositionVisual('mount_top')
  assert.ok(visual)
  const poseSnapshot = structuredClone(visual.playerAPose)
  const upperArm = visual.playerAPose.segments.leftUpperArm
  const standard = createTaperedSegmentGeometry(
    upperArm.length,
    defaultGrapplerAnatomy.upperArm.width,
    defaultGrapplerAnatomy.upperArm.taper,
  )
  const wider = createTaperedSegmentGeometry(
    upperArm.length,
    defaultGrapplerAnatomy.upperArm.width + 8,
    defaultGrapplerAnatomy.upperArm.taper,
  )

  assert.equal(standard.length, upperArm.length)
  assert.equal(wider.length, upperArm.length)
  assert.equal(wider.startWidth, standard.startWidth + 8)
  assert.notEqual(wider.path, standard.path)
  assert.deepEqual(visual.playerAPose, poseSnapshot)
})

test('every rig segment resolves tapered renderer geometry', () => {
  const visual = getPositionVisual('closed_guard_bottom')
  assert.ok(visual)

  for (const segmentName of rigSegmentNames) {
    const pose = visual.playerAPose.segments[segmentName]
    const anatomy = resolveSegmentAnatomy(defaultGrapplerAnatomy, segmentName)
    const geometry = createTaperedSegmentGeometry(
      pose.length,
      anatomy.width,
      anatomy.taper,
    )

    assert.equal(geometry.length, pose.length)
    assert.ok(geometry.startWidth > geometry.endWidth)
    assert.match(geometry.path, /^M 0 /)
    assert.match(geometry.path, / Z$/)
  }
})

test('torso geometry places the wider shoulder end nearest the head', () => {
  const closedGuard = getPositionVisual('closed_guard_bottom')
  assert.ok(closedGuard)
  const bottomGeometry = createTorsoGeometry(
    closedGuard.playerAPose.segments.torso,
    closedGuard.playerAPose.head,
    defaultGrapplerAnatomy,
    closedGuard.playerAPose.core,
  )
  const topGeometry = createTorsoGeometry(
    closedGuard.playerBPose.segments.torso,
    closedGuard.playerBPose.head,
    defaultGrapplerAnatomy,
    closedGuard.playerBPose.core,
  )

  assert.ok(bottomGeometry.endWidth > bottomGeometry.startWidth)
  assert.ok(topGeometry.endWidth > topGeometry.startWidth)
})

test('articulated torso geometry follows the resolved spine without mutating it', () => {
  const visual = getPositionVisual('closed_guard_bottom')
  assert.ok(visual)
  const pose = visual.playerAPose
  assert.ok(pose.core)
  const poseSnapshot = structuredClone(pose)
  const articulated = createTorsoGeometry(
    pose.segments.torso,
    pose.head,
    defaultGrapplerAnatomy,
    pose.core,
  )
  const legacyChord = createTorsoGeometry(
    pose.segments.torso,
    pose.head,
    defaultGrapplerAnatomy,
  )

  assert.match(articulated.path, / Q /)
  assert.match(articulated.centerlinePath, / Q /)
  assert.notEqual(articulated.path, legacyChord.path)
  assert.ok(Math.abs(articulated.midsection.center.y) > 1)
  assert.equal(
    Math.hypot(
      articulated.waist.left.x - articulated.waist.right.x,
      articulated.waist.left.y - articulated.waist.right.y,
    ),
    defaultGrapplerAnatomy.torso.width * defaultGrapplerAnatomy.torso.taper,
  )
  assert.equal(
    Math.hypot(
      articulated.shoulders.left.x - articulated.shoulders.right.x,
      articulated.shoulders.left.y - articulated.shoulders.right.y,
    ),
    defaultGrapplerAnatomy.torso.width,
  )
  assert.deepEqual(pose, poseSnapshot)
})

test('body-part layer hints place legs behind torso and arms above it', () => {
  const order = resolveBodyPartLayerOrder(defaultGrapplerAnatomy)

  assert.ok(order.indexOf('leftThigh') < order.indexOf('torso'))
  assert.ok(order.indexOf('torso') < order.indexOf('leftUpperArm'))
  assert.ok(order.indexOf('leftForearm') < order.indexOf('leftHand'))
  assert.ok(order.indexOf('rightFoot') < order.indexOf('head'))
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

  assert.equal(
    resolved.poses.playerA.segments.rightUpperArm.rotation,
    -78.599,
  )
  assert.equal(visual.playerAPose.segments.rightUpperArm.rotation, baseRotation)
  assert.equal(resolved.gripContacts.length, 1)
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
  assert.ok(poses.playerA.core)
  assert.ok(poses.playerB.core)
})

test('authored torso keyframes carry the derived core silhouette with them', () => {
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
    0.3,
  )
  const torso = poses.playerA.segments.torso
  const torsoEnd = getSegmentEndpoint(torso)
  assert.ok(poses.playerA.core)

  assert.ok(
    Math.hypot(
      poses.playerA.core.pelvis.x - torso.x,
      poses.playerA.core.pelvis.y - torso.y,
    ) < 1e-10,
  )
  assert.ok(
    Math.hypot(
      poses.playerA.core.chest.x - torsoEnd.x,
      poses.playerA.core.chest.y - torsoEnd.y,
    ) < 1e-10,
  )
})

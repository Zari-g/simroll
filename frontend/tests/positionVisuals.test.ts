import assert from 'node:assert/strict'
import test from 'node:test'

import {
  defaultGrapplerAnatomy,
  getSegmentEndpoint,
  resolveGrapplerAnatomy,
  resolveSegmentAnatomy,
} from '../src/grappling/anatomy.ts'
import { resolveGrapplerAppearance } from '../src/grappling/appearance.ts'
import {
  createTaperedSegmentGeometry,
  createTorsoGeometry,
} from '../src/grappling/bodyGeometry.ts'
import { createPoseVariant } from '../src/grappling/positionPoseHelpers.ts'
import {
  corePositionVisualIds,
  getPositionVisual,
} from '../src/grappling/positionVisuals.ts'
import type {
  GrapplerId,
  GrapplerPose,
  GrapplerSegmentName,
} from '../src/grappling/types.ts'

const grapplerIds: readonly GrapplerId[] = ['playerA', 'playerB']
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

function getPose(
  visual: NonNullable<ReturnType<typeof getPositionVisual>>,
  grapplerId: GrapplerId,
) {
  return grapplerId === 'playerA' ? visual.playerAPose : visual.playerBPose
}

function assertPointInMat(point: { x: number; y: number }) {
  assert.ok(point.x >= 0 && point.x <= 1000)
  assert.ok(point.y >= 0 && point.y <= 600)
}

function assertFinitePose(pose: GrapplerPose) {
  assert.ok(Number.isFinite(pose.head.x))
  assert.ok(Number.isFinite(pose.head.y))
  assertPointInMat(pose.head)
  assert.ok(pose.core)
  for (const point of [
    pose.core.pelvis,
    pose.core.spine,
    pose.core.chest,
  ]) {
    assert.ok(Number.isFinite(point.x))
    assert.ok(Number.isFinite(point.y))
    assertPointInMat(point)
  }

  assert.deepEqual(Object.keys(pose.segments).sort(), [...segmentNames].sort())

  for (const segmentName of segmentNames) {
    const segment = pose.segments[segmentName]

    assert.ok(Number.isFinite(segment.x))
    assert.ok(Number.isFinite(segment.y))
    assert.ok(Number.isFinite(segment.rotation))
    assert.ok(Number.isFinite(segment.length))
    assert.ok(segment.length > 0)
    assertPointInMat(segment)
    assertPointInMat(getSegmentEndpoint(segment))
  }
}

test('every repository position resolves a complete core visual', () => {
  assert.deepEqual(corePositionVisualIds, [
    'closed_guard_bottom',
    'mount_top',
    'side_control_top',
    'open_guard_bottom',
    'half_guard_bottom',
    'back_control_top',
  ])

  for (const positionId of corePositionVisualIds) {
    const visual = getPositionVisual(positionId)
    assert.ok(visual)
    assert.equal(visual.positionId, positionId)
    assert.ok(visual.label.length > 0)
    assert.ok(visual.description.length > 0)
    assert.ok(visual.playerARole.length > 0)
    assert.ok(visual.playerBRole.length > 0)
    assertFinitePose(visual.playerAPose)
    assertFinitePose(visual.playerBPose)
    assert.deepEqual([...visual.playerOrder].sort(), [...grapplerIds].sort())
  }
})

test('all core poses resolve anatomy-backed body geometry', () => {
  for (const positionId of corePositionVisualIds) {
    const visual = getPositionVisual(positionId)
    assert.ok(visual)

    for (const grapplerId of grapplerIds) {
      const pose = getPose(visual, grapplerId)
      const anatomy = resolveGrapplerAnatomy(grapplerId)

      for (const segmentName of segmentNames) {
        const segment = pose.segments[segmentName]
        const segmentAnatomy = resolveSegmentAnatomy(anatomy, segmentName)
        const geometry = segmentName === 'torso'
          ? createTorsoGeometry(segment, pose.head, anatomy, pose.core)
          : createTaperedSegmentGeometry(
              segment.length,
              segmentAnatomy.width,
              segmentAnatomy.taper,
            )

        assert.equal(geometry.length, segment.length)
        assert.match(
          geometry.path,
          segmentName === 'torso' ? / Q / : /^M 0 /,
        )
        assert.match(geometry.path, / Z$/)
      }
    }
  }
})

test('every core visual supports Gi and No-Gi player appearances', () => {
  for (const positionId of corePositionVisualIds) {
    assert.ok(getPositionVisual(positionId))

    for (const grapplerId of grapplerIds) {
      assert.equal(resolveGrapplerAppearance(grapplerId, 'gi').mode, 'gi')
      assert.equal(
        resolveGrapplerAppearance(grapplerId, 'no_gi').mode,
        'no_gi',
      )
    }
  }
})

test('pose variants preserve the base pose and unchanged segments', () => {
  const visual = getPositionVisual('mount_top')
  assert.ok(visual)
  const baseSnapshot = structuredClone(visual.playerBPose)

  const variant = createPoseVariant(visual.playerBPose, {
    head: { x: 475 },
    segments: { leftUpperArm: { rotation: 135 } },
  })

  assert.deepEqual(visual.playerBPose, baseSnapshot)
  assert.equal(variant.head.x, 475)
  assert.equal(variant.head.y, visual.playerBPose.head.y)
  assert.equal(variant.segments.leftUpperArm.rotation, 135)
  assert.deepEqual(
    variant.segments.rightUpperArm,
    visual.playerBPose.segments.rightUpperArm,
  )
})

test('expanded runtime positions without artwork use the visual fallback', () => {
  assert.equal(getPositionVisual('turtle_bottom'), null)
})

test('side control intentionally layers the top player over the bottom player', () => {
  const visual = getPositionVisual('side_control_top')
  assert.ok(visual)

  assert.deepEqual(visual.playerOrder, ['playerB', 'playerA'])
  assert.equal(visual.playerARole, 'Top')
  assert.equal(visual.playerBRole, 'Bottom')
})

test('side control limb chains remain connected inside the mat', () => {
  const visual = getPositionVisual('side_control_top')
  assert.ok(visual)

  for (const pose of [visual.playerAPose, visual.playerBPose]) {
    for (const [proximalName, distalName] of [
      ['leftUpperArm', 'leftForearm'],
      ['rightUpperArm', 'rightForearm'],
      ['leftThigh', 'leftShin'],
      ['rightThigh', 'rightShin'],
    ] as const) {
      const endpoint = getSegmentEndpoint(pose.segments[proximalName])
      const distal = pose.segments[distalName]
      const distance = Math.hypot(endpoint.x - distal.x, endpoint.y - distal.y)

      assert.ok(distance < 2)
    }
  }
})

test('pose helper remains independent from anatomy configuration', () => {
  const visual = getPositionVisual('closed_guard_bottom')
  assert.ok(visual)
  const anatomySnapshot = structuredClone(defaultGrapplerAnatomy)

  createPoseVariant(visual.playerAPose, { head: { y: 420 } })

  assert.deepEqual(defaultGrapplerAnatomy, anatomySnapshot)
})

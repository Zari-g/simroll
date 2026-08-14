import assert from 'node:assert/strict'
import test from 'node:test'

import {
  defaultGrapplerAnatomy,
  getSegmentEndpoint,
} from '../src/grappling/anatomy.ts'
import {
  getBodyPartAnchor,
  resolveContactPoint,
} from '../src/grappling/contactGeometry.ts'
import {
  resolvePositionContacts,
  resolveSceneBodyPartOrder,
} from '../src/grappling/contacts.ts'
import { resolveGrapplerAppearance } from '../src/grappling/appearance.ts'
import { resolveBodyPartLayerOrder } from '../src/grappling/bodyGeometry.ts'
import {
  corePositionVisualIds,
  getPositionVisual,
} from '../src/grappling/positionVisuals.ts'
import { resolveVisualPose } from '../src/grappling/resolveVisualPose.ts'
import type {
  BodyPartReference,
  GrapplerId,
  GrapplerPose,
} from '../src/grappling/types.ts'

const anatomies = {
  playerA: defaultGrapplerAnatomy,
  playerB: defaultGrapplerAnatomy,
} as const

function getPoses(positionId: string) {
  const visual = getPositionVisual(positionId)
  assert.ok(visual)

  return {
    playerA: visual.playerAPose,
    playerB: visual.playerBPose,
  }
}

function referenceKey(reference: BodyPartReference) {
  return `${reference.grapplerId}.${reference.bodyPart}`
}

function assertFinitePoint(point: { x: number; y: number }) {
  assert.ok(Number.isFinite(point.x))
  assert.ok(Number.isFinite(point.y))
}

test('segment start, midpoint, and end anchors use deterministic pose geometry', () => {
  const pose = getPoses('closed_guard_bottom').playerA
  const start = getBodyPartAnchor(
    pose,
    defaultGrapplerAnatomy,
    'torso',
    'start',
  )
  const midpoint = getBodyPartAnchor(
    pose,
    defaultGrapplerAnatomy,
    'torso',
    'midpoint',
  )
  const end = getBodyPartAnchor(
    pose,
    defaultGrapplerAnatomy,
    'torso',
    'end',
  )

  assert.deepEqual(start, {
    x: pose.segments.torso.x,
    y: pose.segments.torso.y,
  })
  assert.ok(Math.abs(midpoint.x - (start.x + end.x) / 2) < 0.000001)
  assert.ok(Math.abs(midpoint.y - (start.y + end.y) / 2) < 0.000001)
  assert.deepEqual(end, getSegmentEndpoint(pose.segments.torso))
})

test('position contact metadata and derived geometry resolve deterministically', () => {
  for (const positionId of corePositionVisualIds) {
    const visual = getPositionVisual(positionId)
    assert.ok(visual)
    const firstResolution = resolvePositionContacts(visual)
    const secondResolution = resolvePositionContacts(visual)

    assert.ok(firstResolution.length > 0)
    assert.deepEqual(firstResolution, secondResolution)
    assert.notStrictEqual(firstResolution, visual.contacts)

    for (const contact of firstResolution) {
      const geometry = resolveContactPoint(
        contact,
        getPoses(positionId),
        anatomies,
      )

      assertFinitePoint(geometry.source)
      assertFinitePoint(geometry.target)
      assertFinitePoint(geometry.point)
      assert.ok(Number.isFinite(geometry.angle))
    }
  }
})

test('core positions define focused contact and occlusion metadata', () => {
  const expected = {
    closed_guard_bottom: {
      contactTypes: ['hook', 'hook'],
      overrideCount: 2,
    },
    mount_top: {
      contactTypes: ['pressure', 'control', 'control'],
      overrideCount: 2,
    },
    side_control_top: {
      contactTypes: ['pressure', 'control'],
      overrideCount: 1,
    },
  } as const

  for (const positionId of corePositionVisualIds) {
    const visual = getPositionVisual(positionId)
    assert.ok(visual)
    assert.deepEqual(
      visual.contacts?.map((contact) => contact.type),
      expected[positionId].contactTypes,
    )
    assert.equal(
      visual.occlusion?.overrides.length,
      expected[positionId].overrideCount,
    )
  }
})

test('scene ordering keeps anatomy layers and player order without overrides', () => {
  const playerOrder: readonly GrapplerId[] = ['playerB', 'playerA']
  const resolved = resolveSceneBodyPartOrder(playerOrder, anatomies)
  const expected = playerOrder.flatMap((grapplerId) =>
    resolveBodyPartLayerOrder(anatomies[grapplerId]).map((bodyPart) => ({
      grapplerId,
      bodyPart,
    })),
  )

  assert.deepEqual(resolved, expected)
})

test('occlusion overrides move only their explicitly targeted body parts', () => {
  for (const positionId of corePositionVisualIds) {
    const visual = getPositionVisual(positionId)
    assert.ok(visual)
    assert.ok(visual.occlusion)
    const defaultOrder = resolveSceneBodyPartOrder(
      visual.playerOrder,
      anatomies,
    )
    const overriddenOrder = resolveSceneBodyPartOrder(
      visual.playerOrder,
      anatomies,
      visual.occlusion,
    )
    const movedParts = new Set(
      visual.occlusion.overrides.map((override) =>
        referenceKey(override.bodyPart),
      ),
    )

    assert.deepEqual(
      overriddenOrder
        .filter((reference) => !movedParts.has(referenceKey(reference)))
        .map(referenceKey),
      defaultOrder
        .filter((reference) => !movedParts.has(referenceKey(reference)))
        .map(referenceKey),
    )

    for (const override of visual.occlusion.overrides) {
      const bodyPartIndex = overriddenOrder.findIndex(
        (reference) => referenceKey(reference) === referenceKey(override.bodyPart),
      )
      const relativeIndex = overriddenOrder.findIndex(
        (reference) => referenceKey(reference) === referenceKey(override.relativeTo),
      )

      assert.equal(
        bodyPartIndex < relativeIndex,
        override.placement === 'before',
      )
    }
  }
})

test('contact geometry works for both apparel modes without changing its inputs', () => {
  const visual = getPositionVisual('side_control_top')
  assert.ok(visual)
  const poses: Readonly<Record<GrapplerId, GrapplerPose>> = {
    playerA: visual.playerAPose,
    playerB: visual.playerBPose,
  }
  const poseSnapshot = structuredClone(poses)
  const anatomySnapshot = structuredClone(anatomies)
  const contact = resolvePositionContacts(visual)[0]

  for (const mode of ['gi', 'no_gi'] as const) {
    assert.equal(resolveGrapplerAppearance('playerA', mode).mode, mode)
    assert.equal(resolveGrapplerAppearance('playerB', mode).mode, mode)
    assertFinitePoint(resolveContactPoint(contact, poses, anatomies).point)
  }

  resolveSceneBodyPartOrder(visual.playerOrder, anatomies, visual.occlusion)
  assert.deepEqual(poses, poseSnapshot)
  assert.deepEqual(anatomies, anatomySnapshot)
})

test('grip contacts resolve from hands to targets deterministically', () => {
  const visual = getPositionVisual('closed_guard_bottom')
  assert.ok(visual)
  const visualSnapshot = structuredClone(visual)
  const first = resolveVisualPose(visual, ['sleeve_grip'])
  const second = resolveVisualPose(visual, ['sleeve_grip'])

  assert.deepEqual(first, second)
  assert.equal(first.gripContacts.length, 1)
  const geometry = resolveContactPoint(
    first.gripContacts[0],
    first.poses,
    anatomies,
  )

  assert.ok(Math.hypot(
    geometry.source.x - geometry.target.x,
    geometry.source.y - geometry.target.y,
  ) < 8)
  assert.deepEqual(visual, visualSnapshot)
})

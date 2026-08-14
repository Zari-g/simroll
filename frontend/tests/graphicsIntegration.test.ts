import assert from 'node:assert/strict'
import test from 'node:test'

import {
  defaultGrapplerAnatomy,
  deriveFootGeometry,
  deriveHandGeometry,
  getSegmentEndpoint,
  resolveGrapplerAnatomy,
} from '../src/grappling/anatomy.ts'
import {
  defaultAppearanceThemes,
  resolveGrapplerAppearance,
} from '../src/grappling/appearance.ts'
import { resolveContactPoint } from '../src/grappling/contactGeometry.ts'
import {
  resolvePositionContacts,
  resolveSceneBodyPartOrder,
} from '../src/grappling/contacts.ts'
import {
  createGrapplingDisplayState,
  displayStateFromResponse,
  resolveGrapplingDisplayState,
  resolveTransitionDisplayState,
} from '../src/grappling/displayState.ts'
import { gripVisuals } from '../src/grappling/gripVisuals.ts'
import { resolveTransitionPoses } from '../src/grappling/interpolatePose.ts'
import {
  corePositionVisualIds,
  getPositionVisual,
} from '../src/grappling/positionVisuals.ts'
import { resolveVisualPose } from '../src/grappling/resolveVisualPose.ts'
import {
  getTransitionVisual,
  transitionVisuals,
} from '../src/grappling/transitionVisuals.ts'
import type {
  GrapplerId,
  GrapplerPose,
  GrapplerSegmentName,
} from '../src/grappling/types.ts'
import type { GrapplingStateResponse } from '../src/types/api.ts'

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

const anatomies = {
  playerA: defaultGrapplerAnatomy,
  playerB: defaultGrapplerAnatomy,
} as const

function poseFor(
  visual: NonNullable<ReturnType<typeof getPositionVisual>>,
  grapplerId: GrapplerId,
) {
  return grapplerId === 'playerA' ? visual.playerAPose : visual.playerBPose
}

function assertInScene(point: { x: number; y: number }) {
  assert.ok(Number.isFinite(point.x))
  assert.ok(Number.isFinite(point.y))
  assert.ok(point.x >= 35 && point.x <= 965, `x=${point.x}`)
  assert.ok(point.y >= 35 && point.y <= 565, `y=${point.y}`)
}

function assertPoseExtents(pose: GrapplerPose) {
  assertInScene(pose.head)

  for (const segmentName of segmentNames) {
    assertInScene(pose.segments[segmentName])
    assertInScene(getSegmentEndpoint(pose.segments[segmentName]))
  }

  for (const geometry of [
    deriveHandGeometry(pose.segments.leftForearm, defaultGrapplerAnatomy),
    deriveHandGeometry(pose.segments.rightForearm, defaultGrapplerAnatomy),
    deriveFootGeometry(pose.segments.leftShin, defaultGrapplerAnatomy),
    deriveFootGeometry(pose.segments.rightShin, defaultGrapplerAnatomy),
  ]) {
    assertInScene(geometry)
    assertInScene(getSegmentEndpoint(geometry))
  }
}

test('configured, live, and playback state resolve through one display boundary', () => {
  const configured = createGrapplingDisplayState(
    'closed_guard_bottom',
    'gi',
    ['sleeve_grip'],
  )
  const liveResponse: GrapplingStateResponse = {
    position_id: 'mount_top',
    mode: 'gi',
    active_grips: ['underhook'],
  }
  const playbackResponse: GrapplingStateResponse = {
    position_id: 'side_control_top',
    mode: 'no_gi',
    active_grips: [],
  }
  const live = displayStateFromResponse(liveResponse)
  const playback = displayStateFromResponse(playbackResponse)

  assert.deepEqual(resolveGrapplingDisplayState({ configured }), configured)
  assert.deepEqual(
    resolveGrapplingDisplayState({ configured, live }),
    live,
  )
  assert.deepEqual(
    resolveGrapplingDisplayState({ configured, live, playback }),
    playback,
  )
  assert.equal(playback.mode, 'no_gi')
  assert.deepEqual(playback.activeGripIds, [])
  assert.equal(live.mode, 'gi')
  assert.deepEqual(live.activeGripIds, ['underhook'])

  liveResponse.active_grips.push('sleeve_grip')
  assert.deepEqual(live.activeGripIds, ['underhook'])
})

test('transition endpoints preserve resolved pose, mode, and grips exactly', () => {
  const sourceVisual = getPositionVisual('closed_guard_bottom')
  const destinationVisual = getPositionVisual('mount_top')
  const transition = getTransitionVisual('hip_bump_sweep')
  assert.ok(sourceVisual)
  assert.ok(destinationVisual)
  assert.ok(transition)

  const source = resolveVisualPose(sourceVisual, ['sleeve_grip'])
  const destination = resolveVisualPose(destinationVisual, ['underhook'])
  const sourceState = createGrapplingDisplayState(
    sourceVisual.positionId,
    'gi',
    ['sleeve_grip'],
  )
  const destinationState = createGrapplingDisplayState(
    destinationVisual.positionId,
    'no_gi',
    ['underhook'],
  )

  assert.deepEqual(
    resolveTransitionPoses(transition, source.poses, destination.poses, 0),
    source.poses,
  )
  assert.deepEqual(
    resolveTransitionPoses(transition, source.poses, destination.poses, 1),
    destination.poses,
  )
  assert.deepEqual(
    resolveTransitionDisplayState(sourceState, destinationState, 0),
    sourceState,
  )
  assert.deepEqual(
    resolveTransitionDisplayState(sourceState, destinationState, 1),
    destinationState,
  )
})

test('all core scenes resolve deterministic anatomy, appearance, contacts, and occlusion', () => {
  for (const positionId of corePositionVisualIds) {
    const visual = getPositionVisual(positionId)
    assert.ok(visual)

    for (const grapplerId of grapplerIds) {
      assert.ok(resolveGrapplerAnatomy(grapplerId))
      assert.deepEqual(
        resolveGrapplerAppearance(grapplerId, 'gi'),
        resolveGrapplerAppearance(grapplerId, 'gi'),
      )
      assert.deepEqual(
        resolveGrapplerAppearance(grapplerId, 'no_gi'),
        resolveGrapplerAppearance(grapplerId, 'no_gi'),
      )
      assertPoseExtents(poseFor(visual, grapplerId))
    }

    assert.deepEqual(
      resolveSceneBodyPartOrder(
        visual.playerOrder,
        anatomies,
        visual.occlusion,
      ),
      resolveSceneBodyPartOrder(
        visual.playerOrder,
        anatomies,
        visual.occlusion,
      ),
    )

    for (const contact of resolvePositionContacts(visual)) {
      const geometry = resolveContactPoint(
        contact,
        { playerA: visual.playerAPose, playerB: visual.playerBPose },
        anatomies,
      )
      assertInScene(geometry.source)
      assertInScene(geometry.target)
      assertInScene(geometry.point)
    }
  }
})

test('graphics resolution never mutates static Iteration 9 definitions', () => {
  const anatomySnapshot = structuredClone(defaultGrapplerAnatomy)
  const appearanceSnapshot = structuredClone(defaultAppearanceThemes)
  const gripSnapshot = structuredClone(gripVisuals)
  const transitionSnapshot = structuredClone(transitionVisuals)
  const positionSnapshots = Object.fromEntries(
    corePositionVisualIds.map((positionId) => [
      positionId,
      structuredClone(getPositionVisual(positionId)),
    ]),
  )

  for (const positionId of corePositionVisualIds) {
    const visual = getPositionVisual(positionId)
    assert.ok(visual)
    const resolved = resolveVisualPose(visual, [
      'sleeve_grip',
      'wrist_control',
      'underhook',
    ])
    resolvePositionContacts(visual)
    resolveSceneBodyPartOrder(
      visual.playerOrder,
      anatomies,
      visual.occlusion,
    )
    for (const contact of resolved.gripContacts) {
      resolveContactPoint(contact, resolved.poses, anatomies)
    }
  }

  assert.deepEqual(defaultGrapplerAnatomy, anatomySnapshot)
  assert.deepEqual(defaultAppearanceThemes, appearanceSnapshot)
  assert.deepEqual(gripVisuals, gripSnapshot)
  assert.deepEqual(transitionVisuals, transitionSnapshot)
  for (const positionId of corePositionVisualIds) {
    assert.deepEqual(getPositionVisual(positionId), positionSnapshots[positionId])
  }
})

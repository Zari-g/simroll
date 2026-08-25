import assert from 'node:assert/strict'
import test from 'node:test'

import {
  compileControlsToContacts,
  controlTargetRegistry,
  getControlTargetDefinition,
  validateControlTargetDefinition,
} from '../src/grappling/controlTargets.ts'
import {
  resolveTransitionContactTargets,
  resolveTransitionPoses,
  resolveTransitionSkeletonKeyframes,
} from '../src/grappling/interpolatePose.ts'
import { validateSkeletonPose } from '../src/grappling/poseValidation.ts'
import { getPositionVisual } from '../src/grappling/positionVisuals.ts'
import type { AnimationRecipe } from '../src/grappling/animationRecipes/types.ts'

test('control registry resolves known definitions, handles unknown IDs, and is deeply immutable', () => {
  const wrist = getControlTargetDefinition('wrist_control')
  assert.ok(wrist)
  assert.equal(wrist, controlTargetRegistry.wrist_control)
  assert.equal(getControlTargetDefinition('unknown_control'), null)
  assert.deepEqual(compileControlsToContacts([{
    controlId: 'unknown_control', controller: 'playerA', opponent: 'playerB',
  }]), [])
  assert.ok(Object.isFrozen(controlTargetRegistry))
  assert.ok(Object.isFrozen(wrist))
  assert.ok(Object.isFrozen(wrist.contacts))
  assert.throws(() => {
    ;(wrist.contacts as unknown[]).push(wrist.contacts[0])
  }, TypeError)
})

test('control validation rejects invalid landmarks and strengths', () => {
  assert.throws(() => validateControlTargetDefinition({
    id: 'invalid',
    contacts: [{
      id: 'bad-landmark', type: 'control',
      source: { participant: 'controller', landmark: 'antenna' as never },
      target: { participant: 'opponent', landmark: 'torso' },
    }],
  }), /invalid body landmark/)
  assert.throws(() => compileControlsToContacts([{
    controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', strength: Number.NaN,
  }]), /strength must be within/)
  assert.throws(() => compileControlsToContacts([{
    controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', strength: 1.1,
  }]), /strength must be within/)
})

test('wrist, underhook, and butterfly controls compile to semantic body landmarks', () => {
  const [wrist] = compileControlsToContacts([{
    controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', side: 'left',
  }])
  assert.equal(wrist.contact.source.bodyPart, 'leftHand')
  assert.equal(wrist.contact.target.bodyPart, 'rightForearm')
  assert.equal(wrist.contact.target.anchor, 'end')

  const underhook = compileControlsToContacts([{
    controlId: 'underhook', controller: 'playerB', opponent: 'playerA', side: 'right',
  }])
  assert.equal(underhook[0].contact.source.bodyPart, 'rightForearm')
  assert.equal(underhook[0].contact.target.bodyPart, 'torso')
  assert.ok(underhook.some(({ contact }) => contact.target.bodyPart === 'leftUpperArm'))

  const [butterfly] = compileControlsToContacts([{
    controlId: 'butterfly_hook', controller: 'playerA', opponent: 'playerB', side: 'right',
  }])
  assert.equal(butterfly.contact.type, 'hook')
  assert.equal(butterfly.contact.source.bodyPart, 'rightFoot')
  assert.equal(butterfly.contact.target.bodyPart, 'leftThigh')
})

test('left and right control variants resolve deterministically', () => {
  const left = compileControlsToContacts([{
    controlId: 'ankle_control', controller: 'playerA', opponent: 'playerB', side: 'left',
  }])[0]
  const right = compileControlsToContacts([{
    controlId: 'ankle_control', controller: 'playerA', opponent: 'playerB', side: 'right',
  }])[0]
  assert.equal(left.contact.source.bodyPart, 'leftHand')
  assert.equal(left.contact.target.bodyPart, 'rightShin')
  assert.equal(right.contact.source.bodyPart, 'rightHand')
  assert.equal(right.contact.target.bodyPart, 'leftShin')
  assert.deepEqual(
    compileControlsToContacts([{
      controlId: 'ankle_control', controller: 'playerA', opponent: 'playerB', side: 'right',
    }]),
    [right],
  )
})

test('Gi and No-Gi controls compile over one shared canonical position', () => {
  const canonical = getPositionVisual('closed_guard_bottom')
  assert.ok(canonical)
  const gi = compileControlsToContacts([
    { controlId: 'collar_grip', controller: 'playerA', opponent: 'playerB' },
    { controlId: 'sleeve_grip', controller: 'playerA', opponent: 'playerB', side: 'right' },
  ])
  const noGi = compileControlsToContacts([
    { controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB' },
    { controlId: 'underhook', controller: 'playerA', opponent: 'playerB', side: 'right' },
  ])
  assert.equal(canonical.positionId, 'closed_guard_bottom')
  assert.ok(gi.length > 0)
  assert.ok(noGi.length > 0)
  assert.equal(getPositionVisual('closed_guard_bottom'), canonical)
})

const lifecycleRecipe: AnimationRecipe = {
  transitionId: 'control_lifecycle_test',
  durationMs: 500,
  phases: [{ progress: 0.25 }, { progress: 0.5 }, { progress: 0.75 }],
  requirements: { controls: [
    { controlId: 'wrist_control', action: 'preserve' },
    { controlId: 'closed_guard_connection', action: 'release', activeUntil: 0.7 },
    { controlId: 'underhook', action: 'acquire', activeFrom: 0.3 },
  ] },
}

const lifecycleContext = {
  startContacts: [], endContacts: [],
  startControls: [
    { controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB' },
    { controlId: 'closed_guard_connection', controller: 'playerA', opponent: 'playerB' },
  ],
  endControls: [
    { controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB' },
    { controlId: 'underhook', controller: 'playerA', opponent: 'playerB' },
  ],
} as const

function strengthFor(targets: ReturnType<typeof resolveTransitionContactTargets>, id: string) {
  return targets.find(({ contact }) => contact.id.includes(`control:${id}:`))?.strength ?? 0
}

test('recipe controls persist, release, acquire, and blend without changing endpoints', () => {
  const early = resolveTransitionContactTargets(lifecycleRecipe, lifecycleContext, 0.25)
  const middle = resolveTransitionContactTargets(lifecycleRecipe, lifecycleContext, 0.5)
  const late = resolveTransitionContactTargets(lifecycleRecipe, lifecycleContext, 0.75)
  assert.equal(strengthFor(early, 'wrist_control'), 1)
  assert.equal(strengthFor(middle, 'wrist_control'), 1)
  assert.equal(strengthFor(late, 'wrist_control'), 1)
  assert.ok(strengthFor(early, 'closed_guard_connection') > strengthFor(middle, 'closed_guard_connection'))
  assert.equal(strengthFor(late, 'closed_guard_connection'), 0)
  assert.equal(strengthFor(early, 'underhook'), 0)
  assert.ok(strengthFor(middle, 'underhook') > 0)
  assert.ok(strengthFor(late, 'underhook') > strengthFor(middle, 'underhook'))

  const startVisual = getPositionVisual('closed_guard_bottom')
  const endVisual = getPositionVisual('mount_top')
  assert.ok(startVisual)
  assert.ok(endVisual)
  const start = { playerA: startVisual.playerAPose, playerB: startVisual.playerBPose }
  const end = { playerA: endVisual.playerAPose, playerB: endVisual.playerBPose }
  assert.deepEqual(resolveTransitionPoses(lifecycleRecipe, start, end, 0, lifecycleContext), start)
  assert.deepEqual(resolveTransitionPoses(lifecycleRecipe, start, end, 1, lifecycleContext), end)
  const first = resolveTransitionSkeletonKeyframes(lifecycleRecipe, start, end, lifecycleContext)
  const second = resolveTransitionSkeletonKeyframes(lifecycleRecipe, start, end, lifecycleContext)
  assert.deepEqual(first, second)
  for (const frame of first) {
    assert.equal(validateSkeletonPose(frame.skeletons.playerA).valid, true)
    assert.equal(validateSkeletonPose(frame.skeletons.playerB).valid, true)
    assert.ok(Number.isFinite(frame.skeletons.playerA.root.position.x))
    assert.ok(Number.isFinite(frame.skeletons.playerB.root.position.y))
  }
})

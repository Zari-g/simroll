import assert from 'node:assert/strict'
import test from 'node:test'

import { defaultGrapplerAnatomy } from '../src/grappling/anatomy.ts'
import { resolveContactPoint } from '../src/grappling/contactGeometry.ts'
import { correctSkeletonContacts } from '../src/grappling/contactCorrection.ts'
import { compileControlsToContacts } from '../src/grappling/controlTargets.ts'
import { groundSkeletonPose } from '../src/grappling/groundedAnchors.ts'
import {
  resolveSkeletonPose,
  skeletonToGrapplerPose,
} from '../src/grappling/kinematics.ts'
import { constrainSkeletonPose, validateSkeletonPose } from '../src/grappling/poseValidation.ts'
import { articulatedPositionSkeletons } from '../src/grappling/positionVisuals.ts'
import {
  composeAnimationSkeleton,
  orderFrameContactConstraints,
  resolveAnimationFrame,
  type FrameContactConstraint,
} from '../src/grappling/resolveAnimationFrame.ts'
import type { GrapplerSkeletonPose } from '../src/grappling/skeleton.ts'
import type { GrapplingContact } from '../src/grappling/types.ts'

function skeletonPair() {
  return {
    playerA: structuredClone(articulatedPositionSkeletons.closed_guard_bottom.playerA),
    playerB: structuredClone(articulatedPositionSkeletons.closed_guard_bottom.playerB),
  }
}

function assertFinite(skeleton: GrapplerSkeletonPose) {
  assert.ok(Number.isFinite(skeleton.root.position.x))
  assert.ok(Number.isFinite(skeleton.root.position.y))
  assert.ok(Number.isFinite(skeleton.root.rotation))
  for (const transform of Object.values(skeleton.joints)) {
    assert.ok(Number.isFinite(transform.x))
    assert.ok(Number.isFinite(transform.y))
    assert.ok(Number.isFinite(transform.rotation))
  }
}

const wristTarget = compileControlsToContacts([{
  controlId: 'wrist_control',
  controller: 'playerA',
  opponent: 'playerB',
  side: 'left',
}])[0]

test('central resolver preserves both authoritative endpoints exactly', () => {
  const source = skeletonPair()
  const destination = {
    playerA: articulatedPositionSkeletons.mount_top.playerA,
    playerB: articulatedPositionSkeletons.mount_top.playerB,
  }
  const inputs = skeletonPair()
  const grounding = { playerA: { pelvis: { baselineY: 999 } } } as const

  assert.deepEqual(resolveAnimationFrame({
    skeletons: inputs,
    progress: 0,
    sourceSkeletons: source,
    destinationSkeletons: destination,
    grounding,
    contactTargets: [wristTarget],
  }), source)
  assert.deepEqual(resolveAnimationFrame({
    skeletons: inputs,
    progress: 1,
    sourceSkeletons: source,
    destinationSkeletons: destination,
    grounding,
    contactTargets: [wristTarget],
  }), destination)
})

test('grounding precedes relational IK and final joint constraints', () => {
  const skeletons = skeletonPair()
  skeletons.playerA = {
    ...skeletons.playerA,
    joints: {
      ...skeletons.playerA.joints,
      leftWrist: { ...skeletons.playerA.joints.leftWrist, rotation: 999 },
    },
  }
  const baselineY = skeletons.playerA.root.position.y + 24
  const grounding = { playerA: { pelvis: { baselineY } } } as const
  const choreography = {
    playerA: { primitives: [{ type: 'hipShift', forward: 12, lateral: 0 }] },
  } as const
  const resolved = resolveAnimationFrame({
    skeletons,
    progress: 0.5,
    choreography,
    grounding,
    contactTargets: [wristTarget],
  })
  const composed = {
    playerA: composeAnimationSkeleton(skeletons.playerA, choreography.playerA),
    playerB: composeAnimationSkeleton(skeletons.playerB),
  }
  const grounded = {
    playerA: groundSkeletonPose(composed.playerA, grounding.playerA),
    playerB: groundSkeletonPose(composed.playerB),
  }
  const expected = correctSkeletonContacts(grounded, [wristTarget], {
    preserveTargetOrder: true,
  })
  const correctedBeforeGrounding = correctSkeletonContacts(
    composed,
    [wristTarget],
    { preserveTargetOrder: true },
  )
  const reverseOrder = groundSkeletonPose(
    correctedBeforeGrounding.playerA,
    grounding.playerA,
  )

  assert.equal(resolved.playerA.root.position.y, baselineY)
  assert.notEqual(resolved.playerA.root.position.x, skeletons.playerA.root.position.x)
  assert.deepEqual(resolved.playerA, constrainSkeletonPose(expected.playerA))
  assert.notDeepEqual(
    resolved.playerA.joints,
    constrainSkeletonPose(reverseOrder).joints,
  )
  assert.notEqual(
    resolved.playerA.joints.leftElbow.rotation,
    constrainSkeletonPose(grounded.playerA).joints.leftElbow.rotation,
  )
  assert.equal(validateSkeletonPose(resolved.playerA).valid, true)
  assert.equal(validateSkeletonPose(resolved.playerB).valid, true)
})

test('priority ordering is explicit and same-priority ordering is canonical', () => {
  const high: FrameContactConstraint = {
    priority: 'critical',
    strength: 1,
    contact: {
      id: 'z-high', type: 'control',
      source: { grapplerId: 'playerA', bodyPart: 'torso', anchor: 'center' },
      target: { grapplerId: 'playerB', bodyPart: 'leftHand', anchor: 'center' },
    },
  }
  const low: FrameContactConstraint = {
    priority: 'low',
    strength: 1,
    contact: {
      id: 'a-low', type: 'grip',
      source: { grapplerId: 'playerA', bodyPart: 'torso', anchor: 'center' },
      target: { grapplerId: 'playerB', bodyPart: 'rightFoot', anchor: 'center' },
    },
  }
  assert.deepEqual(orderFrameContactConstraints([low, high]), [high, low])

  const first = { ...high, priority: 'medium' as const }
  const second = { ...low, priority: 'medium' as const }
  assert.deepEqual(
    orderFrameContactConstraints([first, second]),
    orderFrameContactConstraints([second, first]),
  )
  assert.deepEqual(
    resolveAnimationFrame({ skeletons: skeletonPair(), contactTargets: [first, second] }),
    resolveAnimationFrame({ skeletons: skeletonPair(), contactTargets: [second, first] }),
  )
})

test('one frame applies grounding and contact correction exactly once', () => {
  const skeletons = skeletonPair()
  const baselineY = skeletons.playerA.root.position.y + 18
  const grounding = { playerA: { pelvis: { baselineY } } } as const
  const rootTarget: FrameContactConstraint = {
    priority: 'high',
    strength: 1,
    contact: {
      id: 'one-pass-root-contact', type: 'control',
      source: { grapplerId: 'playerA', bodyPart: 'torso', anchor: 'center' },
      target: { grapplerId: 'playerB', bodyPart: 'head', anchor: 'center' },
    },
  }
  const grounded = {
    playerA: groundSkeletonPose(skeletons.playerA, grounding.playerA),
    playerB: groundSkeletonPose(skeletons.playerB),
  }
  const once = correctSkeletonContacts(grounded, [rootTarget], {
    preserveTargetOrder: true,
  })
  const twice = correctSkeletonContacts(once, [rootTarget], {
    preserveTargetOrder: true,
  })
  const resolved = resolveAnimationFrame({
    skeletons,
    grounding,
    contactTargets: [rootTarget],
  })

  assert.deepEqual(resolved.playerA, constrainSkeletonPose(once.playerA))
  assert.notDeepEqual(resolved.playerA.root, twice.playerA.root)
})

test('central IK failure retains the bounded single-joint fallback', () => {
  const skeletons = skeletonPair()
  const sourceRoot = resolveSkeletonPose(skeletons.playerA).joints.leftShoulder
  const contact: GrapplingContact = {
    id: 'central-ik-fallback',
    type: 'grip',
    source: { grapplerId: 'playerA', bodyPart: 'leftHand', anchor: 'center' },
    target: { grapplerId: 'playerB', bodyPart: 'head', anchor: 'center' },
  }
  const targetBefore = resolveContactPoint(contact, {
    playerA: skeletonToGrapplerPose(skeletons.playerA),
    playerB: skeletonToGrapplerPose(skeletons.playerB),
  }, {
    playerA: defaultGrapplerAnatomy,
    playerB: defaultGrapplerAnatomy,
  }).target
  skeletons.playerB = {
    ...skeletons.playerB,
    root: {
      ...skeletons.playerB.root,
      position: {
        x: skeletons.playerB.root.position.x + sourceRoot.x - targetBefore.x,
        y: skeletons.playerB.root.position.y + sourceRoot.y - targetBefore.y,
      },
    },
  }

  const resolved = resolveAnimationFrame({
    skeletons,
    contactTargets: [{
      contact,
      strength: 1,
      relationalAnchor: 'hand-to-grip-target',
    }],
  })
  assert.equal(
    resolved.playerA.joints.leftShoulder.rotation,
    skeletons.playerA.joints.leftShoulder.rotation,
  )
  assert.notEqual(
    resolved.playerA.joints.leftElbow.rotation,
    skeletons.playerA.joints.leftElbow.rotation,
  )
  assert.deepEqual(resolved.playerA.root, skeletons.playerA.root)
})

test('central resolution is deterministic, immutable, finite, and valid', () => {
  const skeletons = skeletonPair()
  const skeletonSnapshot = structuredClone(skeletons)
  const targets = [wristTarget]
  const targetSnapshot = structuredClone(targets)
  const options = {
    skeletons,
    progress: 0.5,
    grounding: { playerB: { pelvis: { baselineY: 280 } } },
    contactTargets: targets,
  } as const

  const first = resolveAnimationFrame(options)
  const second = resolveAnimationFrame(options)
  assert.deepEqual(first, second)
  assert.deepEqual(skeletons, skeletonSnapshot)
  assert.deepEqual(targets, targetSnapshot)
  for (const skeleton of Object.values(first)) {
    assertFinite(skeleton)
    assert.equal(validateSkeletonPose(skeleton).valid, true)
  }
})

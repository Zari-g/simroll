import assert from 'node:assert/strict'
import test from 'node:test'

import { defaultGrapplerAnatomy } from '../src/grappling/anatomy.ts'
import { resolveContactPoint } from '../src/grappling/contactGeometry.ts'
import {
  compileControlsToContacts,
  type ActiveVisualControl,
} from '../src/grappling/controlTargets.ts'
import { groundSkeletonPose } from '../src/grappling/groundedAnchors.ts'
import { skeletonToGrapplerPose } from '../src/grappling/kinematics.ts'
import { validateSkeletonPose } from '../src/grappling/poseValidation.ts'
import { articulatedPositionSkeletons } from '../src/grappling/positionVisuals.ts'
import {
  PAIR_RELATIONAL_PASS_COUNT,
  resolveGrapplerPairFrame,
} from '../src/grappling/resolveGrapplerPairFrame.ts'
import type { GrapplerSkeletonPose } from '../src/grappling/skeleton.ts'

function skeletonPair() {
  return {
    playerA: structuredClone(articulatedPositionSkeletons.closed_guard_bottom.playerA),
    playerB: structuredClone(articulatedPositionSkeletons.closed_guard_bottom.playerB),
  }
}

function target(control: ActiveVisualControl) {
  const compiled = compileControlsToContacts([control])[0]
  assert.ok(compiled)
  return compiled
}

function contactGeometry(
  compiled: ReturnType<typeof target>,
  skeletons: ReturnType<typeof skeletonPair>,
) {
  return resolveContactPoint(compiled.contact, {
    playerA: skeletonToGrapplerPose(skeletons.playerA),
    playerB: skeletonToGrapplerPose(skeletons.playerB),
  }, {
    playerA: defaultGrapplerAnatomy,
    playerB: defaultGrapplerAnatomy,
  })
}

function distance(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
) {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function translate(
  skeleton: GrapplerSkeletonPose,
  x: number,
  y: number,
): GrapplerSkeletonPose {
  return {
    ...skeleton,
    root: {
      ...skeleton.root,
      position: {
        x: skeleton.root.position.x + x,
        y: skeleton.root.position.y + y,
      },
    },
  }
}

test('moving current-frame opponent wrist refreshes a preserved hand target', () => {
  const compiled = target({
    controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', side: 'left',
  })
  const firstInput = skeletonPair()
  const movedInput = skeletonPair()
  movedInput.playerB = translate(movedInput.playerB, 34, -12)

  const first = resolveGrapplerPairFrame({
    skeletons: firstInput,
    progress: 0.5,
    contactTargets: [compiled],
  })
  const moved = resolveGrapplerPairFrame({
    skeletons: movedInput,
    progress: 0.5,
    contactTargets: [compiled],
  })
  const movedGeometry = contactGeometry(compiled, moved)
  const staleGeometry = contactGeometry(compiled, {
    playerA: first.playerA,
    playerB: moved.playerB,
  })

  assert.notDeepEqual(moved.playerA.joints, first.playerA.joints)
  assert.ok(
    distance(movedGeometry.source, movedGeometry.target) <
      distance(staleGeometry.source, staleGeometry.target),
  )
  assert.deepEqual(moved.playerA.root, movedInput.playerA.root)
})

test('moving current-frame opponent thigh refreshes a butterfly-hook target', () => {
  const compiled = target({
    controlId: 'butterfly_hook', controller: 'playerA', opponent: 'playerB', side: 'right',
  })
  const firstInput = skeletonPair()
  const movedInput = skeletonPair()
  for (const pair of [firstInput, movedInput]) {
    pair.playerA.joints.rightHip = {
      ...pair.playerA.joints.rightHip,
      rotation: 20,
    }
    pair.playerA.joints.rightKnee = {
      ...pair.playerA.joints.rightKnee,
      rotation: -35,
    }
  }
  movedInput.playerB = translate(movedInput.playerB, -28, 18)

  const first = resolveGrapplerPairFrame({ skeletons: firstInput, contactTargets: [compiled] })
  const moved = resolveGrapplerPairFrame({ skeletons: movedInput, contactTargets: [compiled] })
  const firstGeometry = contactGeometry(compiled, first)
  const movedGeometry = contactGeometry(compiled, moved)

  assert.notDeepEqual(moved.playerA.joints, first.playerA.joints)
  assert.notDeepEqual(movedGeometry.target, firstGeometry.target)
  assert.notDeepEqual(movedGeometry.source, firstGeometry.source)
  assert.deepEqual(moved.playerA.root, movedInput.playerA.root)
})

test('reverse Player B ownership follows Player A without an A-to-B assumption', () => {
  const compiled = target({
    controlId: 'wrist_control', controller: 'playerB', opponent: 'playerA', side: 'right',
  })
  const firstInput = skeletonPair()
  const movedInput = skeletonPair()
  movedInput.playerA = translate(movedInput.playerA, -30, 14)

  const first = resolveGrapplerPairFrame({ skeletons: firstInput, contactTargets: [compiled] })
  const moved = resolveGrapplerPairFrame({ skeletons: movedInput, contactTargets: [compiled] })

  assert.notDeepEqual(moved.playerB.joints, first.playerB.joints)
  assert.deepEqual(moved.playerB.root, movedInput.playerB.root)
})

test('pair endpoints bypass every solve for both grapplers', () => {
  const source = skeletonPair()
  const destination = {
    playerA: structuredClone(articulatedPositionSkeletons.mount_top.playerA),
    playerB: structuredClone(articulatedPositionSkeletons.mount_top.playerB),
  }
  const compiled = target({
    controlId: 'ankle_control', controller: 'playerA', opponent: 'playerB', side: 'left',
  })

  assert.deepEqual(resolveGrapplerPairFrame({
    skeletons: destination,
    progress: 0,
    sourceSkeletons: source,
    destinationSkeletons: destination,
    grounding: { playerA: { pelvis: { baselineY: 999 } } },
    contactTargets: [compiled],
  }), source)
  assert.deepEqual(resolveGrapplerPairFrame({
    skeletons: source,
    progress: 1,
    sourceSkeletons: source,
    destinationSkeletons: destination,
    contactTargets: [compiled],
  }), destination)
})

test('pair solving is fixed-pass, deterministic, ordered, immutable, finite, and constrained', () => {
  assert.equal(PAIR_RELATIONAL_PASS_COUNT, 2)
  const skeletons = skeletonPair()
  const snapshot = structuredClone(skeletons)
  const wrist = target({
    controlId: 'wrist_control', controller: 'playerA', opponent: 'playerB', side: 'left',
  })
  const hook = target({
    controlId: 'butterfly_hook', controller: 'playerB', opponent: 'playerA', side: 'right',
  })
  const options = {
    skeletons,
    progress: 0.5,
    grounding: { playerA: { pelvis: { baselineY: skeletons.playerA.root.position.y + 8 } } },
    contactTargets: [hook, wrist],
  } as const

  const first = resolveGrapplerPairFrame(options)
  assert.deepEqual(first, resolveGrapplerPairFrame(options))
  assert.deepEqual(
    first,
    resolveGrapplerPairFrame({ ...options, contactTargets: [wrist, hook] }),
  )
  assert.deepEqual(skeletons, snapshot)
  assert.equal(
    first.playerA.root.position.y,
    groundSkeletonPose(skeletons.playerA, options.grounding.playerA).root.position.y,
  )
  for (const pose of Object.values(first)) {
    assert.equal(validateSkeletonPose(pose).valid, true)
    assert.ok(Number.isFinite(pose.root.position.x))
    assert.ok(Number.isFinite(pose.root.position.y))
    assert.ok(Object.values(pose.joints).every((joint) =>
      Number.isFinite(joint.x) && Number.isFinite(joint.y) && Number.isFinite(joint.rotation),
    ))
  }
})

test('pair IK preserves local bone geometry and leaves unsupported controls on fallback', () => {
  const skeletons = skeletonPair()
  const wrist = target({
    controlId: 'sleeve_grip', controller: 'playerA', opponent: 'playerB', side: 'left',
  })
  const underhook = target({
    controlId: 'underhook', controller: 'playerB', opponent: 'playerA', side: 'right',
  })
  assert.equal(underhook.relationalAnchor, undefined)

  const resolved = resolveGrapplerPairFrame({
    skeletons,
    contactTargets: [wrist, underhook],
  })
  for (const jointName of ['leftShoulder', 'leftElbow', 'leftWrist'] as const) {
    assert.equal(resolved.playerA.joints[jointName].x, skeletons.playerA.joints[jointName].x)
    assert.equal(resolved.playerA.joints[jointName].y, skeletons.playerA.joints[jointName].y)
  }
})

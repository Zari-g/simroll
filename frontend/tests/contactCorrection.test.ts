import assert from 'node:assert/strict'
import test from 'node:test'

import { defaultGrapplerAnatomy } from '../src/grappling/anatomy.ts'
import { correctSkeletonContacts } from '../src/grappling/contactCorrection.ts'
import { resolveContactPoint } from '../src/grappling/contactGeometry.ts'
import { compileControlsToContacts } from '../src/grappling/controlTargets.ts'
import {
  offsetPhaseProgress,
  resolveTransitionPoses,
  resolveTransitionSkeletonKeyframes,
} from '../src/grappling/interpolatePose.ts'
import {
  grapplerPoseToSkeleton,
  resolveSkeletonPose,
  skeletonToGrapplerPose,
} from '../src/grappling/kinematics.ts'
import { normalizeAngleDegrees } from '../src/grappling/jointConstraints.ts'
import { constrainSkeletonPose, validateSkeletonPose } from '../src/grappling/poseValidation.ts'
import { getPositionVisual } from '../src/grappling/positionVisuals.ts'
import { resolvePositionContacts } from '../src/grappling/contacts.ts'
import { resolveVisualPose } from '../src/grappling/resolveVisualPose.ts'
import {
  animationRecipeRegistry,
  getAnimationRecipe,
} from '../src/grappling/animationRecipes/registry.ts'
import type { GrapplingContact } from '../src/grappling/types.ts'

const anatomies = {
  playerA: defaultGrapplerAnatomy,
  playerB: defaultGrapplerAnatomy,
} as const

function contactDistance(
  contact: GrapplingContact,
  skeletons: Parameters<typeof correctSkeletonContacts>[0],
) {
  const geometry = resolveContactPoint(contact, {
    playerA: skeletonToGrapplerPose(skeletons.playerA),
    playerB: skeletonToGrapplerPose(skeletons.playerB),
  }, anatomies)
  return Math.hypot(
    geometry.target.x - geometry.source.x,
    geometry.target.y - geometry.source.y,
  )
}

function oldSingleJointCorrection(
  skeletons: Parameters<typeof correctSkeletonContacts>[0],
  contact: GrapplingContact,
  joint: 'leftElbow' | 'rightElbow' | 'leftKnee' | 'rightKnee',
  influence: number,
) {
  const sourceId = contact.source.grapplerId
  const geometry = resolveContactPoint(contact, {
    playerA: skeletonToGrapplerPose(skeletons.playerA),
    playerB: skeletonToGrapplerPose(skeletons.playerB),
  }, anatomies)
  const pivot = resolveSkeletonPose(skeletons[sourceId]).joints[joint]
  const current = Math.atan2(geometry.source.y - pivot.y, geometry.source.x - pivot.x)
  const desired = Math.atan2(geometry.target.y - pivot.y, geometry.target.x - pivot.x)
  const error = normalizeAngleDegrees(((desired - current) * 180) / Math.PI)
  const delta = Math.sign(error) * Math.min(30, Math.abs(error) * influence)
  return {
    ...skeletons,
    [sourceId]: constrainSkeletonPose({
      ...skeletons[sourceId],
      joints: {
        ...skeletons[sourceId].joints,
        [joint]: {
          ...skeletons[sourceId].joints[joint],
          rotation: skeletons[sourceId].joints[joint].rotation + delta,
        },
      },
    }),
  }
}

test('contact correction is bounded, deterministic, immutable, and constraint-valid', () => {
  const visual = getPositionVisual('closed_guard_bottom')
  assert.ok(visual)
  const resolved = resolveVisualPose(visual, ['wrist_control'])
  const contact = resolved.gripContacts[0]
  const skeletons = {
    playerA: constrainSkeletonPose(grapplerPoseToSkeleton(resolved.poses.playerA)),
    playerB: constrainSkeletonPose(grapplerPoseToSkeleton(resolved.poses.playerB)),
  }
  skeletons.playerA = {
    ...skeletons.playerA,
    root: {
      ...skeletons.playerA.root,
      position: { x: skeletons.playerA.root.position.x + 60, y: skeletons.playerA.root.position.y },
    },
  }
  const snapshot = structuredClone(skeletons)
  const targets = [{ contact, strength: 1 }] as const
  const corrected = correctSkeletonContacts(skeletons, targets)

  assert.deepEqual(corrected, correctSkeletonContacts(skeletons, targets))
  assert.deepEqual(skeletons, snapshot)
  assert.ok(contactDistance(contact, corrected) < contactDistance(contact, skeletons))
  assert.ok(Math.hypot(
    corrected.playerA.root.position.x - skeletons.playerA.root.position.x,
    corrected.playerA.root.position.y - skeletons.playerA.root.position.y,
  ) <= 24.000001)
  assert.equal(validateSkeletonPose(corrected.playerA).valid, true)
  assert.equal(validateSkeletonPose(corrected.playerB).valid, true)
})

test('authored correction reduces the highest-value early grip drift', () => {
  const source = getPositionVisual('closed_guard_bottom')
  const destination = getPositionVisual('mount_top')
  assert.ok(source)
  assert.ok(destination)
  const start = resolveVisualPose(source, ['wrist_control'])
  const end = resolveVisualPose(destination, ['underhook'])
  const context = {
    startContacts: [...resolvePositionContacts(source), ...start.gripContacts],
    endContacts: [...resolvePositionContacts(destination), ...end.gripContacts],
  }
  const definition = animationRecipeRegistry.closed_guard_bottom_hip_bump_to_mount_top
  const plain = resolveTransitionSkeletonKeyframes(definition, start.poses, end.poses)
  const corrected = resolveTransitionSkeletonKeyframes(
    definition,
    start.poses,
    end.poses,
    context,
  )
  const grip = start.gripContacts[0]

  assert.deepEqual(resolveTransitionPoses(definition, start.poses, end.poses, 0, context), start.poses)
  assert.deepEqual(resolveTransitionPoses(definition, start.poses, end.poses, 1, context), end.poses)
  assert.ok(contactDistance(grip, corrected[0].skeletons) < contactDistance(grip, plain[0].skeletons))
  for (const frame of corrected) {
    assert.equal(validateSkeletonPose(frame.skeletons.playerA).valid, true)
    assert.equal(validateSkeletonPose(frame.skeletons.playerB).valid, true)
  }
})

function closedGuardSkeletons() {
  const visual = getPositionVisual('closed_guard_bottom')
  assert.ok(visual)
  const resolved = resolveVisualPose(visual, [])
  return {
    playerA: constrainSkeletonPose(grapplerPoseToSkeleton(resolved.poses.playerA)),
    playerB: constrainSkeletonPose(grapplerPoseToSkeleton(resolved.poses.playerB)),
  }
}

const handToChestContact: GrapplingContact = {
  id: 'test-hand-to-chest',
  type: 'grip',
  source: { grapplerId: 'playerA', bodyPart: 'leftHand', anchor: 'center' },
  target: { grapplerId: 'playerB', bodyPart: 'torso', anchor: 'end' },
}

test('relational correction uses the arm chain and leaves the root fixed', () => {
  const skeletons = closedGuardSkeletons()
  const snapshot = structuredClone(skeletons)
  const targets = [
    { contact: handToChestContact, strength: 1, relationalAnchor: 'hand-to-grip-target' as const },
  ]

  const corrected = correctSkeletonContacts(skeletons, targets)

  assert.deepEqual(corrected, correctSkeletonContacts(skeletons, targets))
  assert.deepEqual(skeletons, snapshot)
  assert.ok(
    contactDistance(handToChestContact, corrected) <
      contactDistance(handToChestContact, skeletons),
  )
  assert.deepEqual(corrected.playerA.root, skeletons.playerA.root)
  assert.deepEqual(corrected.playerB, skeletons.playerB)

  for (const jointName of Object.keys(skeletons.playerA.joints) as Array<
    keyof typeof skeletons.playerA.joints
  >) {
    if (jointName === 'leftShoulder' || jointName === 'leftElbow') {
      assert.notEqual(
        corrected.playerA.joints[jointName].rotation,
        skeletons.playerA.joints[jointName].rotation,
      )
    } else {
      assert.deepEqual(
        corrected.playerA.joints[jointName],
        skeletons.playerA.joints[jointName],
      )
    }
  }
  assert.equal(validateSkeletonPose(corrected.playerA).valid, true)
  assert.equal(validateSkeletonPose(corrected.playerB).valid, true)

  const oldCorrection = oldSingleJointCorrection(
    skeletons, handToChestContact, 'leftElbow', 0.82,
  )
  assert.ok(
    contactDistance(handToChestContact, corrected) <
      contactDistance(handToChestContact, oldCorrection),
  )
})

test('relational correction bounds the rotation delta even for a far-away target', () => {
  const skeletons = closedGuardSkeletons()
  const farContact: GrapplingContact = {
    id: 'test-hand-to-far-target',
    type: 'grip',
    source: { grapplerId: 'playerA', bodyPart: 'leftHand', anchor: 'center' },
    target: { grapplerId: 'playerB', bodyPart: 'torso', anchor: 'end', offset: { x: 400, y: -400 } },
  }
  const corrected = correctSkeletonContacts(skeletons, [
    { contact: farContact, strength: 1, relationalAnchor: 'hand-to-grip-target' },
  ], { maxAngleCorrection: 30 })

  const before = skeletons.playerA.joints.leftElbow.rotation
  const after = corrected.playerA.joints.leftElbow.rotation
  const rawDelta = Math.abs(after - before)
  const wrappedDelta = Math.min(rawDelta, 360 - rawDelta)

  assert.ok(wrappedDelta <= 30.000001, `delta was ${wrappedDelta}`)
  assert.equal(validateSkeletonPose(corrected.playerA).valid, true)
})

test('relational correction is skipped when the source body part does not match the anchor pair', () => {
  const skeletons = closedGuardSkeletons()
  const mismatchedContact: GrapplingContact = {
    id: 'test-torso-mismatch',
    type: 'grip',
    source: { grapplerId: 'playerA', bodyPart: 'torso', anchor: 'midpoint' },
    target: { grapplerId: 'playerB', bodyPart: 'torso', anchor: 'end' },
  }
  const corrected = correctSkeletonContacts(skeletons, [
    { contact: mismatchedContact, strength: 1, relationalAnchor: 'hand-to-grip-target' },
  ])

  assert.deepEqual(corrected, skeletons)
})

test('relational correction generalizes to the knee-to-hip-line and foot-to-inner-thigh anchor pairs', () => {
  const skeletons = closedGuardSkeletons()
  const kneeContact: GrapplingContact = {
    id: 'test-knee-to-hip-line',
    type: 'control',
    source: { grapplerId: 'playerA', bodyPart: 'leftThigh', anchor: 'end' },
    target: { grapplerId: 'playerB', bodyPart: 'torso', anchor: 'start' },
  }
  const footContact: GrapplingContact = {
    id: 'test-foot-to-inner-thigh',
    type: 'hook',
    source: { grapplerId: 'playerA', bodyPart: 'leftFoot', anchor: 'center' },
    target: { grapplerId: 'playerB', bodyPart: 'rightThigh', anchor: 'midpoint' },
  }

  const kneeCorrected = correctSkeletonContacts(skeletons, [
    { contact: kneeContact, strength: 1, relationalAnchor: 'knee-to-hip-line' },
  ])
  const footCorrected = correctSkeletonContacts(skeletons, [
    { contact: footContact, strength: 1, relationalAnchor: 'foot-to-inner-thigh' },
  ])

  assert.notEqual(
    kneeCorrected.playerA.joints.leftHip.rotation,
    skeletons.playerA.joints.leftHip.rotation,
  )
  assert.deepEqual(kneeCorrected.playerA.root, skeletons.playerA.root)
  assert.ok(
    contactDistance(kneeContact, kneeCorrected) < contactDistance(kneeContact, skeletons),
  )
  assert.equal(validateSkeletonPose(kneeCorrected.playerA).valid, true)

  assert.notEqual(
    footCorrected.playerA.joints.leftKnee.rotation,
    skeletons.playerA.joints.leftKnee.rotation,
  )
  assert.deepEqual(footCorrected.playerA.root, skeletons.playerA.root)
  assert.ok(
    contactDistance(footContact, footCorrected) < contactDistance(footContact, skeletons),
  )
  assert.equal(validateSkeletonPose(footCorrected.playerA).valid, true)

  for (const skeletonSet of [kneeCorrected, footCorrected]) {
    for (const grapplerId of ['playerA', 'playerB'] as const) {
      for (const joint of Object.values(skeletonSet[grapplerId].joints)) {
        assert.ok(Number.isFinite(joint.x))
        assert.ok(Number.isFinite(joint.y))
        assert.ok(Number.isFinite(joint.rotation))
      }
    }
  }
})

test('production butterfly hook uses leg IK in Open Guard', () => {
  const visual = getPositionVisual('open_guard_bottom')
  assert.ok(visual)
  const resolved = resolveVisualPose(visual, [])
  const skeletons = {
    playerA: constrainSkeletonPose(grapplerPoseToSkeleton(resolved.poses.playerA)),
    playerB: constrainSkeletonPose(grapplerPoseToSkeleton(resolved.poses.playerB)),
  }
  const target = compileControlsToContacts([{
    controlId: 'butterfly_hook',
    controller: 'playerA',
    opponent: 'playerB',
    side: 'left',
  }])[0]
  const corrected = correctSkeletonContacts(skeletons, [target])

  assert.deepEqual(corrected.playerA.root, skeletons.playerA.root)
  assert.notEqual(
    corrected.playerA.joints.leftHip.rotation,
    skeletons.playerA.joints.leftHip.rotation,
  )
  assert.ok(contactDistance(target.contact, corrected) < contactDistance(target.contact, skeletons))
  assert.equal(validateSkeletonPose(corrected.playerA).valid, true)
})

test('a coincident IK target falls back to the bounded 13C joint correction', () => {
  const skeletons = closedGuardSkeletons()
  const sourceRoot = resolveSkeletonPose(skeletons.playerA).joints.leftShoulder
  const contact: GrapplingContact = {
    id: 'test-ik-fallback',
    type: 'grip',
    source: { grapplerId: 'playerA', bodyPart: 'leftHand', anchor: 'center' },
    target: { grapplerId: 'playerB', bodyPart: 'head', anchor: 'center' },
  }
  const targetBefore = resolveContactPoint(contact, {
    playerA: skeletonToGrapplerPose(skeletons.playerA),
    playerB: skeletonToGrapplerPose(skeletons.playerB),
  }, anatomies).target
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
  const corrected = correctSkeletonContacts(skeletons, [{
    contact,
    strength: 1,
    relationalAnchor: 'hand-to-grip-target',
  }])

  assert.equal(
    corrected.playerA.joints.leftShoulder.rotation,
    skeletons.playerA.joints.leftShoulder.rotation,
  )
  assert.notEqual(
    corrected.playerA.joints.leftElbow.rotation,
    skeletons.playerA.joints.leftElbow.rotation,
  )
  assert.deepEqual(corrected.playerA.root, skeletons.playerA.root)
  assert.equal(validateSkeletonPose(corrected.playerA).valid, true)
})

test('whole-root correction still applies by default when relationalAnchor is not set', () => {
  const skeletons = closedGuardSkeletons()
  const corrected = correctSkeletonContacts(skeletons, [
    { contact: handToChestContact, strength: 1 },
  ])

  assert.notDeepEqual(corrected.playerA.root, skeletons.playerA.root)
  assert.deepEqual(corrected.playerA.joints, skeletons.playerA.joints)
})

test('unsupported transitions retain the safe no-choreography path', () => {
  assert.equal(getAnimationRecipe('unsupported_transition'), null)
})

test('phase offsets stagger motion while preserving exact local endpoints', () => {
  assert.equal(offsetPhaseProgress(0, 0.12), 0)
  assert.equal(offsetPhaseProgress(1, -0.12), 1)
  assert.ok(offsetPhaseProgress(0.5, -0.1) > 0.5)
  assert.ok(offsetPhaseProgress(0.5, 0.1) < 0.5)
  assert.equal(offsetPhaseProgress(0.5, 0), 0.5)
})

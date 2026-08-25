import assert from 'node:assert/strict'
import test from 'node:test'

import { defaultGrapplerAnatomy } from '../src/grappling/anatomy.ts'
import { correctSkeletonContacts } from '../src/grappling/contactCorrection.ts'
import { resolveContactPoint } from '../src/grappling/contactGeometry.ts'
import {
  offsetPhaseProgress,
  resolveTransitionPoses,
  resolveTransitionSkeletonKeyframes,
} from '../src/grappling/interpolatePose.ts'
import { grapplerPoseToSkeleton, skeletonToGrapplerPose } from '../src/grappling/kinematics.ts'
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

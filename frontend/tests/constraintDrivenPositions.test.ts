import assert from 'node:assert/strict'
import test from 'node:test'

import { createConstraintDiagnostics } from '../src/grappling/constraintDiagnostics.ts'
import { resolveConstraintDrivenPosition } from '../src/grappling/constraintDrivenPositions.ts'
import { resolveSkeletonPose } from '../src/grappling/kinematics.ts'
import { validateSkeletonPose } from '../src/grappling/poseValidation.ts'
import {
  articulatedPositionSkeletons,
  constraintDrivenPositionIds,
  constraintDrivenPositions,
  corePositionVisualIds,
} from '../src/grappling/positionVisuals.ts'

const grapplerIds = ['playerA', 'playerB'] as const

test('exactly three existing canonical visuals use constraint-driven authoring', () => {
  assert.deepEqual(constraintDrivenPositionIds, [
    'open_guard_bottom',
    'half_guard_bottom',
    'back_control_top',
  ])
  assert.ok(constraintDrivenPositionIds.every((id) => corePositionVisualIds.includes(id)))
  assert.equal(new Set(corePositionVisualIds).size, corePositionVisualIds.length)
})

test('static position resolution is deterministic, immutable, finite, and constrained', () => {
  for (const positionId of constraintDrivenPositionIds) {
    const definition = constraintDrivenPositions[positionId]
    const snapshot = structuredClone(definition)
    const first = resolveConstraintDrivenPosition(definition)
    const second = resolveConstraintDrivenPosition(definition)

    assert.deepEqual(first, second)
    assert.deepEqual(definition, snapshot)
    assert.deepEqual(first, articulatedPositionSkeletons[positionId])
    for (const grapplerId of grapplerIds) {
      assert.equal(validateSkeletonPose(first[grapplerId]).valid, true)
      assert.ok(Number.isFinite(first[grapplerId].root.position.x))
      assert.ok(Number.isFinite(first[grapplerId].root.position.y))
      assert.ok(Object.values(first[grapplerId].joints).every((joint) =>
        Number.isFinite(joint.x) && Number.isFinite(joint.y) && Number.isFinite(joint.rotation)))
    }
  }
})

test('constraint-driven positions preserve authored bone lengths and grounding', () => {
  for (const positionId of constraintDrivenPositionIds) {
    const definition = constraintDrivenPositions[positionId]
    const resolved = articulatedPositionSkeletons[positionId]
    for (const grapplerId of grapplerIds) {
      for (const [joint, transform] of Object.entries(definition.basePose[grapplerId].joints)) {
        const finalTransform = resolved[grapplerId].joints[joint as keyof typeof resolved[typeof grapplerId]['joints']]
        assert.equal(Math.hypot(finalTransform.x, finalTransform.y), Math.hypot(transform.x, transform.y))
      }
    }
    const diagnostics = createConstraintDiagnostics(
      resolved,
      definition.relationships,
      definition.grounding,
    )
    assert.ok(diagnostics.grounding.every((anchor) => anchor.error < 1e-9))
  }
})

test('supported semantic relationships replace endpoint coordinates with bounded targets', () => {
  for (const positionId of constraintDrivenPositionIds) {
    const definition = constraintDrivenPositions[positionId]
    assert.ok((definition.relationships?.length ?? 0) > 0)
    const diagnostics = createConstraintDiagnostics(
      articulatedPositionSkeletons[positionId],
      definition.relationships,
      definition.grounding,
    )
    assert.equal(diagnostics.constraints.length, definition.relationships?.length)
    assert.ok(diagnostics.constraints.every((constraint) => constraint.error < 60))
    assert.ok(definition.relationships?.every(({ contact }) =>
      contact.source.offset === undefined && contact.target.offset === undefined))
  }

  // Open Guard now has two pelvis placements plus semantic feet-to-thigh
  // relationships; no wrist or ankle endpoint has a scene-space coordinate.
  const openGuard = constraintDrivenPositions.open_guard_bottom
  assert.deepEqual(openGuard.basePose.playerA.root.position, { x: 0, y: 0 })
  assert.deepEqual(openGuard.basePose.playerB.root.position, { x: 0, y: 0 })
  assert.equal(openGuard.relationships?.length, 2)
})

test('diagnostics match resolved geometry and never alter simulation output', () => {
  const definition = constraintDrivenPositions.half_guard_bottom
  const skeletons = resolveConstraintDrivenPosition(definition)
  const snapshot = structuredClone(skeletons)
  const diagnostics = createConstraintDiagnostics(
    skeletons,
    definition.relationships,
    definition.grounding,
  )
  const again = resolveConstraintDrivenPosition(definition)

  assert.deepEqual(skeletons, snapshot)
  assert.deepEqual(again, snapshot)
  const resolved = resolveSkeletonPose(skeletons.playerB)
  const pelvis = diagnostics.joints.find((joint) =>
    joint.grapplerId === 'playerB' && joint.joint === 'pelvis')
  assert.deepEqual(pelvis && { x: pelvis.x, y: pelvis.y }, {
    x: resolved.joints.pelvis.x,
    y: resolved.joints.pelvis.y,
  })
  for (const constraint of diagnostics.constraints) {
    assert.equal(
      constraint.error,
      Math.hypot(
        constraint.target.x - constraint.source.x,
        constraint.target.y - constraint.source.y,
      ),
    )
    assert.ok(Number.isFinite(constraint.error))
  }
})

test('diagnostics represent either owner and skip unsupported malformed relationships safely', () => {
  const relationships = [
    ...(constraintDrivenPositions.open_guard_bottom.relationships ?? []),
    ...(constraintDrivenPositions.half_guard_bottom.relationships ?? []),
  ]
  const snapshot = createConstraintDiagnostics(
    articulatedPositionSkeletons.half_guard_bottom,
    relationships,
  )
  assert.ok(snapshot.constraints.some(({ sourceGrapplerId }) => sourceGrapplerId === 'playerA'))
  assert.ok(snapshot.constraints.some(({ sourceGrapplerId }) => sourceGrapplerId === 'playerB'))

  const malformed = [{
    contact: {
      id: 'unsupported',
      type: 'control',
      source: { grapplerId: 'playerA', bodyPart: 'unsupported' },
      target: { grapplerId: 'playerB', bodyPart: 'torso' },
    },
    strength: 1,
  }] as never
  const safe = createConstraintDiagnostics(
    articulatedPositionSkeletons.half_guard_bottom,
    malformed,
  )
  assert.deepEqual(safe.constraints, [])
})

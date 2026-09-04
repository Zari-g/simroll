import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  createAnimationCoverageReport,
  getAnimationAuthoringIssues,
  type AnimationCoverageTransition,
} from '../src/grappling/animationRecipes/coverage.ts'
import { authoredAnimationRecipes } from '../src/grappling/animationRecipes/recipes.ts'
import { resolveTransitionAnimation } from '../src/grappling/animationRecipes/resolver.ts'
import type { AuthoredAnimationRecipe } from '../src/grappling/animationRecipes/types.ts'
import { resolveTransitionPoses } from '../src/grappling/interpolatePose.ts'
import { getPositionVisual } from '../src/grappling/positionVisuals.ts'

interface RuntimeDataset {
  readonly positional_transitions: readonly {
    readonly id: string
    readonly display_name: string
    readonly source_position: string
    readonly destination_position: string
  }[]
}

const dataset = JSON.parse(readFileSync(
  new URL('../../data/generated/simroll_bjj_mvp.normalized.json', import.meta.url),
  'utf8',
)) as RuntimeDataset
const transitions: readonly AnimationCoverageTransition[] = dataset.positional_transitions.map((transition) => ({
  id: transition.id,
  name: transition.display_name,
  sourcePositionId: transition.source_position,
  destinationPositionId: transition.destination_position,
}))

function assertFinite(value: unknown) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value))
  else if (Array.isArray(value)) value.forEach(assertFinite)
  else if (value && typeof value === 'object') Object.values(value).forEach(assertFinite)
}

test('the complete authoritative graph has exactly one safe coverage classification', () => {
  const report = createAnimationCoverageReport(transitions)
  assert.equal(report.total, transitions.length)
  assert.equal(report.total, 65)
  assert.deepEqual(
    {
      explicit: report.explicit,
      family: report.family,
      fallback: report.fallback,
      constraintEnhanced: report.constraintEnhanced,
    },
    { explicit: 1, family: 27, fallback: 37, constraintEnhanced: 3 },
  )
  assert.equal(report.explicit + report.family + report.fallback, report.total)
  assert.equal(new Set(report.transitions.map(({ id }) => id)).size, report.total)
  assert.ok(report.transitions.every(({ coverage }) =>
    coverage === 'explicit' || coverage === 'family' || coverage === 'fallback'))
  assert.deepEqual(getAnimationAuthoringIssues(transitions), [])
})

test('every active transition resolves without throwing to a valid duration and safe endpoints', () => {
  for (const transition of transitions) {
    const resolved = resolveTransitionAnimation(transition.id)
    assert.ok(Number.isFinite(resolved.durationMs) && resolved.durationMs > 0)
    const source = getPositionVisual(transition.sourcePositionId)
    const destination = getPositionVisual(transition.destinationPositionId)
    if (!source || !destination) continue
    const start = { playerA: source.playerAPose, playerB: source.playerBPose }
    const end = { playerA: destination.playerAPose, playerB: destination.playerBPose }
    assert.deepEqual(resolveTransitionPoses(resolved.recipe, start, end, 0), start)
    assert.deepEqual(resolveTransitionPoses(resolved.recipe, start, end, 1), end)
    assertFinite(resolveTransitionPoses(resolved.recipe, start, end, 0.5))
  }
})

test('orphan, duplicate ownership, and invalid family references fail clearly', () => {
  const orphan = {
    transitionId: 'removed_transition', familyId: 'escape.hip',
    params: { side: 'left', escapeDistance: 12 },
  } as const satisfies AuthoredAnimationRecipe
  assert.ok(getAnimationAuthoringIssues(transitions, [orphan])
    .some(({ code }) => code === 'unknown-transition'))

  const active = authoredAnimationRecipes[0]
  assert.ok(getAnimationAuthoringIssues(transitions, [active, active])
    .some(({ code }) => code === 'duplicate-ownership'))

  const badFamily = {
    transitionId: transitions[0].id, familyId: 'missing.family', params: {},
  } as const satisfies AuthoredAnimationRecipe
  assert.ok(getAnimationAuthoringIssues(transitions, [badFamily])
    .some(({ code, message }) => code === 'invalid-definition' && message.includes('Unknown technique family')))
  assert.throws(
    () => createAnimationCoverageReport(transitions, { authoredRecipes: [badFamily] }),
    /Animation authoring validation failed/,
  )
})

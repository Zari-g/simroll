import assert from 'node:assert/strict'
import test from 'node:test'

import { defaultGrapplerAnatomy } from '../src/grappling/anatomy.ts'
import {
  defaultAppearanceThemes,
  resolveGrapplerAppearance,
} from '../src/grappling/appearance.ts'
import { getPositionVisual } from '../src/grappling/positionVisuals.ts'
import type { GrapplingStateResponse } from '../src/types/api.ts'

test('Gi mode resolves jacket, pants, belt, and lapel configuration', () => {
  const appearance = resolveGrapplerAppearance('playerA', 'gi')

  assert.equal(appearance.mode, 'gi')
  assert.equal(appearance.topKind, 'gi_jacket')
  assert.equal(appearance.bottomKind, 'gi_pants')
  assert.equal(appearance.hasBelt, true)
  assert.equal(appearance.hasLapels, true)
  assert.ok(appearance.topSegments.includes('leftForearm'))
  assert.ok(appearance.bottomSegments.includes('leftShin'))
})

test('No-Gi mode resolves rashguard and shorts with exposed lower limbs', () => {
  const appearance = resolveGrapplerAppearance('playerA', 'no_gi')

  assert.equal(appearance.mode, 'no_gi')
  assert.equal(appearance.topKind, 'rashguard')
  assert.equal(appearance.bottomKind, 'shorts')
  assert.equal(appearance.hasBelt, false)
  assert.equal(appearance.hasLapels, false)
  assert.equal(appearance.topSegments.includes('leftForearm'), false)
  assert.equal(appearance.bottomSegments.includes('leftShin'), false)
})

test('players resolve distinct reusable appearance themes', () => {
  const playerA = resolveGrapplerAppearance('playerA', 'gi')
  const playerB = resolveGrapplerAppearance('playerB', 'gi')

  assert.strictEqual(playerA.theme, defaultAppearanceThemes.playerA)
  assert.strictEqual(playerB.theme, defaultAppearanceThemes.playerB)
  assert.notEqual(playerA.theme.id, playerB.theme.id)
  assert.notEqual(playerA.theme.className, playerB.theme.className)
})

test('appearance resolution is deterministic and does not mutate anatomy or pose', () => {
  const visual = getPositionVisual('closed_guard_bottom')
  assert.ok(visual)
  const anatomySnapshot = structuredClone(defaultGrapplerAnatomy)
  const poseSnapshot = structuredClone(visual.playerAPose)

  const first = resolveGrapplerAppearance('playerB', 'no_gi')
  const second = resolveGrapplerAppearance('playerB', 'no_gi')

  assert.deepEqual(first, second)
  assert.deepEqual(defaultGrapplerAnatomy, anatomySnapshot)
  assert.deepEqual(visual.playerAPose, poseSnapshot)
})

test('recorded historical mode resolves the matching apparel', () => {
  const historicalState: GrapplingStateResponse = {
    position_id: 'mount_top',
    mode: 'no_gi',
    active_grips: [],
  }

  const appearance = resolveGrapplerAppearance(
    'playerA',
    historicalState.mode,
  )

  assert.equal(appearance.mode, 'no_gi')
  assert.equal(appearance.topKind, 'rashguard')
})

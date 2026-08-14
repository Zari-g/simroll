import type { TransitionVisualDefinition } from './types'

export const transitionVisuals: Readonly<
  Record<string, TransitionVisualDefinition>
> = {
  hip_bump_sweep: {
    transitionId: 'hip_bump_sweep',
    durationMs: 950,
    keyframes: [
      {
        progress: 0.3,
        playerA: {
          head: { x: 500, y: 330 },
          segments: {
            torso: { x: 500, y: 390, rotation: -75, length: 115 },
            rightUpperArm: { rotation: -82, length: 86 },
            rightForearm: { x: 530, y: 225, rotation: -55, length: 78 },
          },
        },
      },
      {
        progress: 0.62,
        playerA: {
          head: { x: 545, y: 280 },
          segments: {
            torso: { x: 530, y: 365, rotation: -55, length: 120 },
            leftThigh: { rotation: -105 },
            rightThigh: { rotation: -20 },
          },
        },
        playerB: {
          head: { x: 610, y: 230 },
          segments: {
            torso: { x: 565, y: 320, rotation: -35, length: 118 },
            leftUpperArm: { rotation: 112 },
            rightUpperArm: { rotation: 62 },
          },
        },
      },
      {
        progress: 0.82,
        playerA: {
          head: { x: 520, y: 225 },
          segments: {
            torso: { x: 515, y: 350, rotation: -78, length: 116 },
          },
        },
        playerB: {
          head: { x: 535, y: 190 },
          segments: {
            torso: { x: 520, y: 340, rotation: -72, length: 132 },
          },
        },
      },
    ],
  },
}

export function getTransitionVisual(transitionId: string) {
  return transitionVisuals[transitionId] ?? null
}

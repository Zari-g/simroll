import type { GrapplingMode } from '../types/api'
import type { GrapplerId, GrapplerSegmentName } from './types'

export type GrapplerApparelMode = GrapplingMode
export type GrapplerTopKind = 'gi_jacket' | 'rashguard'
export type GrapplerBottomKind = 'gi_pants' | 'shorts'

export interface GrapplerAppearanceTheme {
  readonly id: 'blue' | 'light'
  readonly className: 'grappler-theme--blue' | 'grappler-theme--light'
}

export interface GrapplerAppearance {
  readonly mode: GrapplerApparelMode
  readonly topKind: GrapplerTopKind
  readonly bottomKind: GrapplerBottomKind
  readonly topSegments: readonly GrapplerSegmentName[]
  readonly bottomSegments: readonly GrapplerSegmentName[]
  readonly hasBelt: boolean
  readonly hasLapels: boolean
  readonly theme: GrapplerAppearanceTheme
}

export const defaultAppearanceThemes: Readonly<
  Record<GrapplerId, GrapplerAppearanceTheme>
> = {
  playerA: {
    id: 'blue',
    className: 'grappler-theme--blue',
  },
  playerB: {
    id: 'light',
    className: 'grappler-theme--light',
  },
}

const topSegments = {
  gi: [
    'torso',
    'leftUpperArm',
    'leftForearm',
    'rightUpperArm',
    'rightForearm',
  ],
  no_gi: ['torso', 'leftUpperArm', 'rightUpperArm'],
} as const satisfies Record<GrapplerApparelMode, readonly GrapplerSegmentName[]>

const bottomSegments = {
  gi: ['leftThigh', 'leftShin', 'rightThigh', 'rightShin'],
  no_gi: ['leftThigh', 'rightThigh'],
} as const satisfies Record<GrapplerApparelMode, readonly GrapplerSegmentName[]>

const modeAppearance = {
  gi: {
    mode: 'gi',
    topKind: 'gi_jacket',
    bottomKind: 'gi_pants',
    topSegments: topSegments.gi,
    bottomSegments: bottomSegments.gi,
    hasBelt: true,
    hasLapels: true,
  },
  no_gi: {
    mode: 'no_gi',
    topKind: 'rashguard',
    bottomKind: 'shorts',
    topSegments: topSegments.no_gi,
    bottomSegments: bottomSegments.no_gi,
    hasBelt: false,
    hasLapels: false,
  },
} as const satisfies Record<
  GrapplerApparelMode,
  Omit<GrapplerAppearance, 'theme'>
>

export function resolveGrapplerAppearance(
  grapplerId: GrapplerId,
  mode: GrapplerApparelMode,
): GrapplerAppearance {
  return {
    ...modeAppearance[mode],
    theme: defaultAppearanceThemes[grapplerId],
  }
}

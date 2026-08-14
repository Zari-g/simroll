import type {
  GrapplerId,
  GrapplerSegmentName,
  PointPose,
  SegmentPose,
} from './types'
import { calculateSegmentEndpoint } from './kinematics.ts'

export type SegmentAnatomyRegion =
  | 'torso'
  | 'upperArm'
  | 'forearm'
  | 'thigh'
  | 'shin'

export interface SegmentAnatomy {
  readonly width: number
  readonly jointRadius: number
  readonly endpointRadius: number
  readonly taper: number
  readonly layerHint: number
}

export interface HeadAnatomy {
  readonly radius: number
  readonly layerHint: number
}

export interface ExtremityAnatomy {
  readonly length: number
  readonly width: number
  readonly endpointRadius: number
  readonly taper: number
  readonly layerHint: number
}

export interface GrapplerAnatomy {
  readonly head: HeadAnatomy
  readonly torso: SegmentAnatomy
  readonly upperArm: SegmentAnatomy
  readonly forearm: SegmentAnatomy
  readonly hand: ExtremityAnatomy
  readonly thigh: SegmentAnatomy
  readonly shin: SegmentAnatomy
  readonly foot: ExtremityAnatomy
}

export interface DerivedExtremityGeometry extends PointPose {
  readonly rotation: number
  readonly length: number
  readonly width: number
}

export type GrapplerAnatomyOverrides = Partial<
  Readonly<Record<GrapplerId, GrapplerAnatomy>>
>

export const defaultGrapplerAnatomy: GrapplerAnatomy = {
  head: {
    radius: 30,
    layerHint: 30,
  },
  torso: {
    width: 60,
    jointRadius: 24,
    endpointRadius: 22,
    taper: 0.82,
    layerHint: 20,
  },
  upperArm: {
    width: 32,
    jointRadius: 15,
    endpointRadius: 12,
    taper: 0.86,
    layerHint: 21,
  },
  forearm: {
    width: 27,
    jointRadius: 12,
    endpointRadius: 9,
    taper: 0.78,
    layerHint: 22,
  },
  hand: {
    length: 24,
    width: 17,
    endpointRadius: 6,
    taper: 0.72,
    layerHint: 23,
  },
  thigh: {
    width: 40,
    jointRadius: 19,
    endpointRadius: 14,
    taper: 0.84,
    layerHint: 10,
  },
  shin: {
    width: 32,
    jointRadius: 14,
    endpointRadius: 10,
    taper: 0.76,
    layerHint: 11,
  },
  foot: {
    length: 32,
    width: 20,
    endpointRadius: 7,
    taper: 0.7,
    layerHint: 12,
  },
}

export const defaultPlayerAnatomies: Readonly<
  Record<GrapplerId, GrapplerAnatomy>
> = {
  playerA: defaultGrapplerAnatomy,
  playerB: defaultGrapplerAnatomy,
}

const segmentAnatomyRegions: Readonly<
  Record<GrapplerSegmentName, SegmentAnatomyRegion>
> = {
  torso: 'torso',
  leftUpperArm: 'upperArm',
  leftForearm: 'forearm',
  rightUpperArm: 'upperArm',
  rightForearm: 'forearm',
  leftThigh: 'thigh',
  leftShin: 'shin',
  rightThigh: 'thigh',
  rightShin: 'shin',
}

export function resolveGrapplerAnatomy(
  grapplerId: GrapplerId,
  overrides: GrapplerAnatomyOverrides = {},
): GrapplerAnatomy {
  return overrides[grapplerId] ?? defaultPlayerAnatomies[grapplerId]
}

export function resolveSegmentAnatomy(
  anatomy: GrapplerAnatomy,
  segmentName: GrapplerSegmentName,
): SegmentAnatomy {
  return anatomy[segmentAnatomyRegions[segmentName]]
}

export function getSegmentEndpoint(segment: SegmentPose): PointPose {
  return calculateSegmentEndpoint(segment)
}

function deriveExtremityGeometry(
  segment: SegmentPose,
  extremity: ExtremityAnatomy,
): DerivedExtremityGeometry {
  return {
    ...getSegmentEndpoint(segment),
    rotation: segment.rotation,
    length: extremity.length,
    width: extremity.width,
  }
}

export function deriveHandGeometry(
  forearm: SegmentPose,
  anatomy: GrapplerAnatomy,
): DerivedExtremityGeometry {
  return deriveExtremityGeometry(forearm, anatomy.hand)
}

export function deriveFootGeometry(
  shin: SegmentPose,
  anatomy: GrapplerAnatomy,
): DerivedExtremityGeometry {
  return deriveExtremityGeometry(shin, anatomy.foot)
}

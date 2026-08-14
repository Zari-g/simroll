import {
  getSegmentEndpoint,
  type GrapplerAnatomy,
} from './anatomy.ts'
import type {
  GrapplerSegmentName,
  PointPose,
  SegmentPose,
} from './types'

export type GrapplerBodyPartName =
  | GrapplerSegmentName
  | 'leftHand'
  | 'rightHand'
  | 'leftFoot'
  | 'rightFoot'
  | 'head'

export interface TaperedSegmentGeometry {
  readonly length: number
  readonly startWidth: number
  readonly endWidth: number
  readonly path: string
}

const bodyPartNames: readonly GrapplerBodyPartName[] = [
  'leftThigh',
  'leftShin',
  'leftFoot',
  'rightThigh',
  'rightShin',
  'rightFoot',
  'torso',
  'leftUpperArm',
  'leftForearm',
  'leftHand',
  'rightUpperArm',
  'rightForearm',
  'rightHand',
  'head',
]

function formatSvgNumber(value: number): string {
  return Number(value.toFixed(3)).toString()
}

export function createTaperedSegmentGeometry(
  length: number,
  width: number,
  taper: number,
  widerAtStart = true,
): TaperedSegmentGeometry {
  const taperedWidth = width * taper
  const startWidth = widerAtStart ? width : taperedWidth
  const endWidth = widerAtStart ? taperedWidth : width
  const startRadius = startWidth / 2
  const endRadius = endWidth / 2
  const localLength = formatSvgNumber(length)
  const localStartRadius = formatSvgNumber(startRadius)
  const localEndRadius = formatSvgNumber(endRadius)

  return {
    length,
    startWidth,
    endWidth,
    path: [
      `M 0 -${localStartRadius}`,
      `L ${localLength} -${localEndRadius}`,
      `A ${localEndRadius} ${localEndRadius} 0 0 1 ${localLength} ${localEndRadius}`,
      `L 0 ${localStartRadius}`,
      `A ${localStartRadius} ${localStartRadius} 0 0 1 0 -${localStartRadius}`,
      'Z',
    ].join(' '),
  }
}

function squaredDistance(a: PointPose, b: PointPose): number {
  const xDistance = a.x - b.x
  const yDistance = a.y - b.y

  return xDistance * xDistance + yDistance * yDistance
}

export function torsoShouldersAreAtStart(
  torso: SegmentPose,
  head: PointPose,
): boolean {
  return (
    squaredDistance(torso, head) <=
    squaredDistance(getSegmentEndpoint(torso), head)
  )
}

export function createTorsoGeometry(
  torso: SegmentPose,
  head: PointPose,
  anatomy: GrapplerAnatomy,
): TaperedSegmentGeometry {
  return createTaperedSegmentGeometry(
    torso.length,
    anatomy.torso.width,
    anatomy.torso.taper,
    torsoShouldersAreAtStart(torso, head),
  )
}

function getLayerHint(
  bodyPartName: GrapplerBodyPartName,
  anatomy: GrapplerAnatomy,
): number {
  switch (bodyPartName) {
    case 'torso':
      return anatomy.torso.layerHint
    case 'leftUpperArm':
    case 'rightUpperArm':
      return anatomy.upperArm.layerHint
    case 'leftForearm':
    case 'rightForearm':
      return anatomy.forearm.layerHint
    case 'leftHand':
    case 'rightHand':
      return anatomy.hand.layerHint
    case 'leftThigh':
    case 'rightThigh':
      return anatomy.thigh.layerHint
    case 'leftShin':
    case 'rightShin':
      return anatomy.shin.layerHint
    case 'leftFoot':
    case 'rightFoot':
      return anatomy.foot.layerHint
    case 'head':
      return anatomy.head.layerHint
  }
}

export function resolveBodyPartLayerOrder(
  anatomy: GrapplerAnatomy,
): readonly GrapplerBodyPartName[] {
  return [...bodyPartNames].sort(
    (left, right) => getLayerHint(left, anatomy) - getLayerHint(right, anatomy),
  )
}

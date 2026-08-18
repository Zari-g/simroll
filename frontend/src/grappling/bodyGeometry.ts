import {
  getSegmentEndpoint,
  type GrapplerAnatomy,
} from './anatomy.ts'
import type {
  GrapplerBodyPartName,
  GrapplerCorePose,
  PointPose,
  SegmentPose,
} from './types'

export type { GrapplerBodyPartName } from './types'

export interface TaperedSegmentGeometry {
  readonly length: number
  readonly startWidth: number
  readonly endWidth: number
  readonly path: string
}

export interface TorsoCrossSection {
  readonly center: PointPose
  readonly left: PointPose
  readonly right: PointPose
}

export interface TorsoGeometry extends TaperedSegmentGeometry {
  readonly waist: TorsoCrossSection
  readonly midsection: TorsoCrossSection
  readonly shoulders: TorsoCrossSection
  readonly centerlinePath: string
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

function pointInSegmentSpace(
  point: PointPose,
  segment: SegmentPose,
): PointPose {
  const radians = (-segment.rotation * Math.PI) / 180
  const x = point.x - segment.x
  const y = point.y - segment.y

  return {
    x: x * Math.cos(radians) - y * Math.sin(radians),
    y: x * Math.sin(radians) + y * Math.cos(radians),
  }
}

function createCrossSection(
  center: PointPose,
  tangentStart: PointPose,
  tangentEnd: PointPose,
  width: number,
): TorsoCrossSection {
  const x = tangentEnd.x - tangentStart.x
  const y = tangentEnd.y - tangentStart.y
  const length = Math.hypot(x, y) || 1
  const radius = width / 2
  const normal = { x: y / length, y: -x / length }

  return {
    center,
    left: {
      x: center.x + normal.x * radius,
      y: center.y + normal.y * radius,
    },
    right: {
      x: center.x - normal.x * radius,
      y: center.y - normal.y * radius,
    },
  }
}

function quadraticControl(
  start: PointPose,
  through: PointPose,
  end: PointPose,
): PointPose {
  return {
    x: 2 * through.x - (start.x + end.x) / 2,
    y: 2 * through.y - (start.y + end.y) / 2,
  }
}

function svgPoint(point: PointPose): string {
  return `${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`
}

function createCoreTorsoGeometry(
  torso: SegmentPose,
  core: GrapplerCorePose,
  anatomy: GrapplerAnatomy,
): TorsoGeometry {
  const pelvis = pointInSegmentSpace(core.pelvis, torso)
  const spine = pointInSegmentSpace(core.spine, torso)
  const chest = pointInSegmentSpace(core.chest, torso)
  const waistWidth = anatomy.torso.width * anatomy.torso.taper
  const shoulderWidth = anatomy.torso.width
  const midsectionWidth = (waistWidth + shoulderWidth) / 2
  const waist = createCrossSection(pelvis, pelvis, spine, waistWidth)
  const midsection = createCrossSection(
    spine,
    pelvis,
    chest,
    midsectionWidth,
  )
  const shoulders = createCrossSection(chest, spine, chest, shoulderWidth)
  const leftControl = quadraticControl(
    waist.left,
    midsection.left,
    shoulders.left,
  )
  const rightControl = quadraticControl(
    shoulders.right,
    midsection.right,
    waist.right,
  )
  const centerControl = quadraticControl(pelvis, spine, chest)

  return {
    length: torso.length,
    startWidth: waistWidth,
    endWidth: shoulderWidth,
    waist,
    midsection,
    shoulders,
    centerlinePath: `M ${svgPoint(pelvis)} Q ${svgPoint(centerControl)} ${svgPoint(chest)}`,
    path: [
      `M ${svgPoint(waist.left)}`,
      `Q ${svgPoint(leftControl)} ${svgPoint(shoulders.left)}`,
      `A ${formatSvgNumber(shoulderWidth / 2)} ${formatSvgNumber(shoulderWidth / 2)} 0 0 1 ${svgPoint(shoulders.right)}`,
      `Q ${svgPoint(rightControl)} ${svgPoint(waist.right)}`,
      `A ${formatSvgNumber(waistWidth / 2)} ${formatSvgNumber(waistWidth / 2)} 0 0 1 ${svgPoint(waist.left)}`,
      'Z',
    ].join(' '),
  }
}

function createLegacyTorsoGeometry(
  torso: SegmentPose,
  head: PointPose,
  anatomy: GrapplerAnatomy,
): TorsoGeometry {
  const shouldersAtStart = torsoShouldersAreAtStart(torso, head)
  const tapered = createTaperedSegmentGeometry(
    torso.length,
    anatomy.torso.width,
    anatomy.torso.taper,
    shouldersAtStart,
  )
  const start = createCrossSection(
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: torso.length, y: 0 },
    tapered.startWidth,
  )
  const end = createCrossSection(
    { x: torso.length, y: 0 },
    { x: 0, y: 0 },
    { x: torso.length, y: 0 },
    tapered.endWidth,
  )
  const midpoint = createCrossSection(
    { x: torso.length / 2, y: 0 },
    { x: 0, y: 0 },
    { x: torso.length, y: 0 },
    (tapered.startWidth + tapered.endWidth) / 2,
  )

  return {
    ...tapered,
    waist: shouldersAtStart ? end : start,
    midsection: midpoint,
    shoulders: shouldersAtStart ? start : end,
    centerlinePath: `M 0 0 L ${formatSvgNumber(torso.length)} 0`,
  }
}

export function createTorsoGeometry(
  torso: SegmentPose,
  head: PointPose,
  anatomy: GrapplerAnatomy,
  core?: GrapplerCorePose,
): TorsoGeometry {
  return core
    ? createCoreTorsoGeometry(torso, core, anatomy)
    : createLegacyTorsoGeometry(torso, head, anatomy)
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

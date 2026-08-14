import {
  deriveFootGeometry,
  deriveHandGeometry,
  getSegmentEndpoint,
  type GrapplerAnatomy,
} from './anatomy.ts'
import type {
  ContactAnchor,
  ContactAnchorName,
  GrapplerBodyPartName,
  GrapplerId,
  GrapplerPose,
  GrapplerSegmentName,
  GripContact,
  PointPose,
  PositionContact,
  SegmentPose,
} from './types'

export type GrapplerPosePair = Readonly<Record<GrapplerId, GrapplerPose>>
export type GrapplerAnatomyPair = Readonly<
  Record<GrapplerId, GrapplerAnatomy>
>

export interface ResolvedContactGeometry {
  source: PointPose
  target: PointPose
  point: PointPose
  angle: number
}

const segmentNames = new Set<GrapplerBodyPartName>([
  'torso',
  'leftUpperArm',
  'leftForearm',
  'rightUpperArm',
  'rightForearm',
  'leftThigh',
  'leftShin',
  'rightThigh',
  'rightShin',
])

function isSegmentName(
  bodyPart: GrapplerBodyPartName,
): bodyPart is GrapplerSegmentName {
  return segmentNames.has(bodyPart)
}

function pointAlongSegment(
  segment: SegmentPose,
  anchor: ContactAnchorName,
): PointPose {
  if (anchor === 'start') {
    return { x: segment.x, y: segment.y }
  }

  const endpoint = getSegmentEndpoint(segment)
  if (anchor === 'end') {
    return endpoint
  }

  return {
    x: (segment.x + endpoint.x) / 2,
    y: (segment.y + endpoint.y) / 2,
  }
}

function getExtremitySegment(
  pose: GrapplerPose,
  anatomy: GrapplerAnatomy,
  bodyPart: 'leftHand' | 'rightHand' | 'leftFoot' | 'rightFoot',
): SegmentPose {
  const geometry = bodyPart.endsWith('Hand')
    ? deriveHandGeometry(
        pose.segments[bodyPart === 'leftHand' ? 'leftForearm' : 'rightForearm'],
        anatomy,
      )
    : deriveFootGeometry(
        pose.segments[bodyPart === 'leftFoot' ? 'leftShin' : 'rightShin'],
        anatomy,
      )

  return geometry
}

export function getBodyPartAnchor(
  pose: GrapplerPose,
  anatomy: GrapplerAnatomy,
  bodyPart: GrapplerBodyPartName,
  anchor: ContactAnchorName = 'center',
): PointPose {
  if (bodyPart === 'head') {
    return { ...pose.head }
  }

  if (isSegmentName(bodyPart)) {
    return pointAlongSegment(pose.segments[bodyPart], anchor)
  }

  return pointAlongSegment(
    getExtremitySegment(pose, anatomy, bodyPart),
    anchor,
  )
}

function resolveAnchor(
  reference: ContactAnchor,
  poses: GrapplerPosePair,
  anatomies: GrapplerAnatomyPair,
): PointPose {
  const point = getBodyPartAnchor(
    poses[reference.grapplerId],
    anatomies[reference.grapplerId],
    reference.bodyPart,
    reference.anchor,
  )

  return {
    x: point.x + (reference.offset?.x ?? 0),
    y: point.y + (reference.offset?.y ?? 0),
  }
}

export function resolveContactPoint(
  contact: PositionContact | GripContact,
  poses: GrapplerPosePair,
  anatomies: GrapplerAnatomyPair,
): ResolvedContactGeometry {
  const source = resolveAnchor(contact.source, poses, anatomies)
  const target = resolveAnchor(contact.target, poses, anatomies)

  return {
    source,
    target,
    point: {
      x: (source.x + target.x) / 2,
      y: (source.y + target.y) / 2,
    },
    angle: (Math.atan2(target.y - source.y, target.x - source.x) * 180) / Math.PI,
  }
}

import { useMemo } from 'react'

import {
  deriveFootGeometry,
  deriveHandGeometry,
  resolveSegmentAnatomy,
  type GrapplerAnatomy,
} from '../../grappling/anatomy'
import {
  resolveBodyPartLayerOrder,
  type GrapplerBodyPartName,
} from '../../grappling/bodyGeometry'
import type {
  GrapplerId,
  GrapplerPose,
  GrapplerSegmentName,
} from '../../grappling/types'
import { ExtremityShape, HeadShape, SegmentShape } from './BodyShape'

interface GrapplerRigProps {
  grapplerId: GrapplerId
  pose: GrapplerPose
  anatomy: GrapplerAnatomy
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
  bodyPartName: GrapplerBodyPartName,
): bodyPartName is GrapplerSegmentName {
  return segmentNames.has(bodyPartName)
}

export function GrapplerRig({ grapplerId, pose, anatomy }: GrapplerRigProps) {
  const bodyPartOrder = useMemo(
    () => resolveBodyPartLayerOrder(anatomy),
    [anatomy],
  )
  const extremityGeometry = {
    leftHand: deriveHandGeometry(pose.segments.leftForearm, anatomy),
    rightHand: deriveHandGeometry(pose.segments.rightForearm, anatomy),
    leftFoot: deriveFootGeometry(pose.segments.leftShin, anatomy),
    rightFoot: deriveFootGeometry(pose.segments.rightShin, anatomy),
  }

  function renderBodyPart(bodyPartName: GrapplerBodyPartName) {
    if (bodyPartName === 'head') {
      return <HeadShape pose={pose.head} anatomy={anatomy.head} />
    }

    if (isSegmentName(bodyPartName)) {
      return (
        <SegmentShape
          name={bodyPartName}
          pose={pose.segments[bodyPartName]}
          anatomy={resolveSegmentAnatomy(anatomy, bodyPartName)}
          head={bodyPartName === 'torso' ? pose.head : undefined}
          grapplerAnatomy={bodyPartName === 'torso' ? anatomy : undefined}
        />
      )
    }

    const isHand = bodyPartName === 'leftHand' || bodyPartName === 'rightHand'

    return (
      <ExtremityShape
        name={bodyPartName}
        geometry={extremityGeometry[bodyPartName]}
        anatomy={isHand ? anatomy.hand : anatomy.foot}
      />
    )
  }

  return (
    <g className={`grappler-rig grappler-rig--${grapplerId}`} aria-hidden="true">
      {bodyPartOrder.map((bodyPartName) => (
        <g key={bodyPartName}>{renderBodyPart(bodyPartName)}</g>
      ))}
    </g>
  )
}

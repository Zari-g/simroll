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
import type { GrapplerAppearance } from '../../grappling/appearance'
import type {
  GrapplerId,
  GrapplerPose,
  GrapplerSegmentName,
} from '../../grappling/types'
import { ExtremityShape, HeadShape, SegmentShape } from './BodyShape'
import { GrapplerApparel } from './GrapplerApparel'

interface GrapplerRigProps {
  grapplerId: GrapplerId
  pose: GrapplerPose
  anatomy: GrapplerAnatomy
  appearance: GrapplerAppearance
}

interface GrapplerBodyPartProps extends GrapplerRigProps {
  bodyPartName: GrapplerBodyPartName
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

export function GrapplerBodyPart({
  grapplerId,
  pose,
  anatomy,
  appearance,
  bodyPartName,
}: GrapplerBodyPartProps) {
  const extremityGeometry = {
    leftHand: deriveHandGeometry(pose.segments.leftForearm, anatomy),
    rightHand: deriveHandGeometry(pose.segments.rightForearm, anatomy),
    leftFoot: deriveFootGeometry(pose.segments.leftShin, anatomy),
    rightFoot: deriveFootGeometry(pose.segments.rightShin, anatomy),
  }

  let bodyPart
  if (bodyPartName === 'head') {
    bodyPart = <HeadShape pose={pose.head} anatomy={anatomy.head} />
  } else if (isSegmentName(bodyPartName)) {
    const segmentAnatomy = resolveSegmentAnatomy(anatomy, bodyPartName)

    bodyPart = (
      <>
        <SegmentShape
          name={bodyPartName}
          pose={pose.segments[bodyPartName]}
          anatomy={segmentAnatomy}
          head={bodyPartName === 'torso' ? pose.head : undefined}
          grapplerAnatomy={bodyPartName === 'torso' ? anatomy : undefined}
        />
        <GrapplerApparel
          appearance={appearance}
          name={bodyPartName}
          pose={pose.segments[bodyPartName]}
          anatomy={segmentAnatomy}
          head={bodyPartName === 'torso' ? pose.head : undefined}
          grapplerAnatomy={bodyPartName === 'torso' ? anatomy : undefined}
        />
      </>
    )
  } else {
    const isHand = bodyPartName === 'leftHand' || bodyPartName === 'rightHand'

    bodyPart = (
      <ExtremityShape
        name={bodyPartName}
        geometry={extremityGeometry[bodyPartName]}
        anatomy={isHand ? anatomy.hand : anatomy.foot}
      />
    )
  }

  return (
    <g
      className={`grappler-rig grappler-rig--${grapplerId} grappler-rig--${appearance.mode.replace('_', '-')} ${appearance.theme.className}`}
      data-grappler-id={grapplerId}
      data-scene-body-part={bodyPartName}
      aria-hidden="true"
    >
      {bodyPart}
    </g>
  )
}

export function GrapplerRig(props: GrapplerRigProps) {
  const bodyPartOrder = useMemo(
    () => resolveBodyPartLayerOrder(props.anatomy),
    [props.anatomy],
  )

  return (
    <g aria-hidden="true">
      {bodyPartOrder.map((bodyPartName) => (
        <GrapplerBodyPart
          {...props}
          bodyPartName={bodyPartName}
          key={bodyPartName}
        />
      ))}
    </g>
  )
}

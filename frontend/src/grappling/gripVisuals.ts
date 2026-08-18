import type {
  GripPositionVisualModifier,
  GripVisualDefinition,
} from './types'

/*
 * Grip state does not currently identify its owner or a left/right hand. These
 * visual definitions therefore use a presentation-only convention: Player A
 * owns the shown grip and each definition chooses a consistent arm. This is
 * not authoritative grappling data and can be replaced if the domain model
 * gains ownership/side semantics later.
 */
export const gripVisuals: Readonly<Record<string, GripVisualDefinition>> = {
  sleeve_grip: {
    gripId: 'sleeve_grip',
    positionModifiers: [
      {
        positionId: 'closed_guard_bottom',
        appliesTo: 'playerA',
        priority: 10,
        segmentOverrides: {
          rightUpperArm: { rotation: -78.599, length: 82 },
          rightForearm: {
            x: 514.212,
            y: 364.574,
            rotation: -94.313,
            length: 82,
          },
        },
        contact: {
          id: 'sleeve-grip-contact',
          type: 'grip',
          source: {
            grapplerId: 'playerA',
            bodyPart: 'rightHand',
            anchor: 'start',
          },
          target: {
            grapplerId: 'playerB',
            bodyPart: 'leftForearm',
            anchor: 'midpoint',
          },
        },
      },
    ],
  },
  wrist_control: {
    gripId: 'wrist_control',
    positionModifiers: [
      {
        positionId: 'closed_guard_bottom',
        appliesTo: 'playerA',
        priority: 20,
        segmentOverrides: {
          leftUpperArm: { rotation: -90.051, length: 84 },
          leftForearm: {
            x: 531.09,
            y: 338.588,
            rotation: -76.184,
            length: 84,
          },
        },
        contact: {
          id: 'wrist-control-contact',
          type: 'grip',
          source: {
            grapplerId: 'playerA',
            bodyPart: 'leftHand',
            anchor: 'start',
          },
          target: {
            grapplerId: 'playerB',
            bodyPart: 'rightForearm',
            anchor: 'start',
          },
        },
      },
    ],
  },
  underhook: {
    gripId: 'underhook',
    positionModifiers: [
      {
        positionId: 'mount_top',
        appliesTo: 'playerA',
        priority: 30,
        segmentOverrides: {
          leftUpperArm: { rotation: -168.933, length: 50 },
          leftForearm: {
            x: 464.691,
            y: 182.535,
            rotation: 93.619,
            length: 50,
          },
        },
        contact: {
          id: 'underhook-contact',
          type: 'grip',
          source: {
            grapplerId: 'playerA',
            bodyPart: 'leftHand',
            anchor: 'start',
          },
          target: {
            grapplerId: 'playerB',
            bodyPart: 'torso',
            anchor: 'end',
            offset: { x: -30, y: 5 },
          },
        },
      },
    ],
  },
}

export function getGripVisualModifier(
  gripId: string,
  positionId: string,
): GripPositionVisualModifier | null {
  return (
    gripVisuals[gripId]?.positionModifiers.find(
      (modifier) => modifier.positionId === positionId,
    ) ?? null
  )
}

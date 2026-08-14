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
          rightUpperArm: { rotation: -122, length: 72 },
          rightForearm: {
            x: 480,
            y: 250,
            rotation: -150,
            length: 40,
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
          leftUpperArm: { rotation: -47, length: 82 },
          leftForearm: {
            x: 537,
            y: 250,
            rotation: -37,
            length: 53,
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
          leftUpperArm: { rotation: -164, length: 73 },
          leftForearm: {
            x: 410,
            y: 230,
            rotation: -18,
            length: 63,
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

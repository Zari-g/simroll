export interface Position {
  id: string
  name: string
  category: string
  player_role: string
  gi_allowed: boolean
  no_gi_allowed: boolean
  tags: string[]
  description: string
}

export type GrapplingMode = 'gi' | 'no_gi'

export interface Grip {
  id: string
  name: string
  grip_type: string
  gi_required: boolean
  control_target: string
  dominant_hand: string
  tags: string[]
}

export interface Transition {
  id: string
  name: string
  from_position: string
  to_position: string
  transition_type: string
  required_grips: string[]
  created_grips: string[]
  removed_grips: string[]
  gi_allowed: boolean
  no_gi_allowed: boolean
  difficulty: string
  tags: string[]
  notes: string
}

export interface AvailableTransitionsRequest {
  position_id: string
  mode: GrapplingMode
  active_grips: string[]
}

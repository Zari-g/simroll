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
export type PlayerId = 'player_a' | 'player_b'

export interface ActiveControl {
  control_id: string
  owner: PlayerId
  target: PlayerId
}

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
  action_type: 'transition'
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
  active_controls: ActiveControl[]
}

export interface ControlChange {
  id: string
  name: string
  action_type: 'control_change'
  template_id: string
  position_id: string
  mode: GrapplingMode
  actor_player: PlayerId
  required_controls: ActiveControl[]
  created_controls: ActiveControl[]
  removed_controls: ActiveControl[]
}

export type RollAction = Transition | ControlChange

export interface GrapplingStatePayload {
  position_id: string
  mode: GrapplingMode
  active_controls: ActiveControl[]
}

export interface ShortestPathRequest {
  start_state: GrapplingStatePayload
  target_position_id: string
  difficulties: string[] | null
  transition_types: string[] | null
  max_depth: number | null
}

export interface PathsRequest {
  start_state: GrapplingStatePayload
  target_position_id: string
  difficulties: string[] | null
  transition_types: string[] | null
  max_paths: number
  max_depth: number
}

export interface GrapplingStateResponse {
  position_id: string
  mode: GrapplingMode
  active_controls: ActiveControl[]
}

export interface RollAvailableRequest {
  state: GrapplingStatePayload
}

export interface RollStepRequest {
  state: GrapplingStatePayload
  action_id: string | null
}

export interface RollStepResponse {
  transition: RollAction | null
  next_state: GrapplingStateResponse | null
}

export type RollSimulationStopReason =
  | 'max_steps'
  | 'no_available_transitions'

export interface RollSimulationRequest {
  start_state: GrapplingStatePayload
  max_steps: number
}

export interface GrapplingPath {
  states: GrapplingStateResponse[]
  transition_ids: string[]
  step_count: number
}

export interface RollSimulationPath {
  states: GrapplingStateResponse[]
  actions: RollAction[]
  action_ids: string[]
  positional_steps: number
  control_actions: number
  total_events: number
  transition_ids: string[]
  step_count: number
}

export interface RollSimulationResponse {
  path: RollSimulationPath
  stop_reason: RollSimulationStopReason
}

export interface ShortestPathResponse {
  path: GrapplingPath | null
}

export interface PathsResponse {
  paths: GrapplingPath[]
}

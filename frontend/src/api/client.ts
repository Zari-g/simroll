import type {
  AvailableTransitionsRequest,
  Grip,
  PathsRequest,
  PathsResponse,
  Position,
  RollAvailableRequest,
  RollSimulationRequest,
  RollSimulationResponse,
  RollStepRequest,
  RollStepResponse,
  ShortestPathRequest,
  ShortestPathResponse,
  Transition,
} from '../types/api'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(
  /\/$/,
  '',
)

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function requestJson<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options)

  if (!response.ok) {
    let detail: string | null = null

    try {
      const body = (await response.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      // A non-JSON error response still receives a useful HTTP fallback.
    }

    throw new ApiError(
      detail ?? `${response.status} ${response.statusText}`,
      response.status,
    )
  }

  return (await response.json()) as T
}

export function getPositions(signal?: AbortSignal): Promise<Position[]> {
  return requestJson<Position[]>('/positions', { signal })
}

export function getPosition(
  positionId: string,
  signal?: AbortSignal,
): Promise<Position> {
  return requestJson<Position>(
    `/positions/${encodeURIComponent(positionId)}`,
    { signal },
  )
}

export function getPositionTransitions(
  positionId: string,
  signal?: AbortSignal,
): Promise<Transition[]> {
  return requestJson<Transition[]>(
    `/positions/${encodeURIComponent(positionId)}/transitions`,
    { signal },
  )
}

export function getTransitions(signal?: AbortSignal): Promise<Transition[]> {
  return requestJson<Transition[]>('/transitions', { signal })
}

export function getGrips(signal?: AbortSignal): Promise<Grip[]> {
  return requestJson<Grip[]>('/grips', { signal })
}

export function getAvailableTransitions(
  request: AvailableTransitionsRequest,
  signal?: AbortSignal,
): Promise<Transition[]> {
  return requestJson<Transition[]>('/transitions/available', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  })
}

export function getRollAvailableTransitions(
  request: RollAvailableRequest,
  signal?: AbortSignal,
): Promise<Transition[]> {
  return requestJson<Transition[]>('/rolls/available', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  })
}

export function performRollStep(
  request: RollStepRequest,
  signal?: AbortSignal,
): Promise<RollStepResponse> {
  return requestJson<RollStepResponse>('/rolls/step', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  })
}

export function simulateRoll(
  request: RollSimulationRequest,
  signal?: AbortSignal,
): Promise<RollSimulationResponse> {
  return requestJson<RollSimulationResponse>('/rolls/simulate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  })
}

export function findShortestPath(
  request: ShortestPathRequest,
  signal?: AbortSignal,
): Promise<ShortestPathResponse> {
  return requestJson<ShortestPathResponse>('/paths/shortest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  })
}

export function findPaths(
  request: PathsRequest,
  signal?: AbortSignal,
): Promise<PathsResponse> {
  return requestJson<PathsResponse>('/paths', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  })
}

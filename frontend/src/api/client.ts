import type {
  AvailableTransitionsRequest,
  Grip,
  Position,
  Transition,
} from '../types/api'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(
  /\/$/,
  '',
)

async function requestJson<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options)

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
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

import type { Position } from '../types/api'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(
  /\/$/,
  '',
)

export async function getPositions(): Promise<Position[]> {
  const response = await fetch(`${API_BASE_URL}/positions`)

  if (!response.ok) {
    throw new Error(
      `Failed to load positions: ${response.status} ${response.statusText}`,
    )
  }

  return (await response.json()) as Position[]
}

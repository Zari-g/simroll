import { useCallback, useEffect, useRef, useState } from 'react'
import {
  resolveTransitionPoses,
  type GrapplerPosePair,
} from '../grappling/interpolatePose'
import { getTransitionVisual } from '../grappling/transitionVisuals'

interface PlayPoseAnimationOptions {
  transitionId: string
  transitionName: string
  startPoses: GrapplerPosePair
  endPoses: GrapplerPosePair
}

interface PoseAnimationDisplay {
  poses: GrapplerPosePair
  transitionName: string
}

export function usePoseAnimation() {
  const [display, setDisplay] = useState<PoseAnimationDisplay | null>(null)
  const frameId = useRef<number | null>(null)
  const generation = useRef(0)
  const pendingResolution = useRef<((completed: boolean) => void) | null>(null)

  const cancel = useCallback(() => {
    generation.current += 1
    if (frameId.current !== null) {
      cancelAnimationFrame(frameId.current)
      frameId.current = null
    }
    pendingResolution.current?.(false)
    pendingResolution.current = null
    setDisplay(null)
  }, [])

  const play = useCallback(
    ({
      transitionId,
      transitionName,
      startPoses,
      endPoses,
    }: PlayPoseAnimationOptions): Promise<boolean> => {
      const definition = getTransitionVisual(transitionId)
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      if (!definition || reduceMotion) {
        return Promise.resolve(false)
      }

      cancel()
      const animationGeneration = generation.current

      return new Promise((resolve) => {
        pendingResolution.current = resolve
        const startTime = performance.now()

        const renderFrame = (timestamp: number) => {
          if (animationGeneration !== generation.current) return

          const progress = Math.min(
            (timestamp - startTime) / definition.durationMs,
            1,
          )
          setDisplay({
            poses: resolveTransitionPoses(
              definition,
              startPoses,
              endPoses,
              progress,
            ),
            transitionName,
          })

          if (progress < 1) {
            frameId.current = requestAnimationFrame(renderFrame)
          } else {
            pendingResolution.current = null
            resolve(true)
            // Keep the exact final frame mounted while the awaiting caller
            // commits the authoritative destination state. Clear it on the
            // next frame so the underlying destination pose is already ready.
            frameId.current = requestAnimationFrame(() => {
              if (animationGeneration === generation.current) {
                frameId.current = null
                setDisplay(null)
              }
            })
          }
        }

        frameId.current = requestAnimationFrame(renderFrame)
      })
    },
    [cancel],
  )

  useEffect(() => cancel, [cancel])

  return {
    display,
    isAnimating: display !== null,
    play,
    cancel,
  }
}

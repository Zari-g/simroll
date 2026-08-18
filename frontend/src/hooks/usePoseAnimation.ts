import { useCallback, useEffect, useRef, useState } from 'react'
import {
  resolveTransitionPoses,
  type GrapplerPosePair,
} from '../grappling/interpolatePose'
import {
  resolveTransitionDisplayState,
  type GrapplingDisplayState,
} from '../grappling/displayState'
import { getTransitionVisual } from '../grappling/transitionVisuals'
import type { GrapplingContact } from '../grappling/types'

interface PlayPoseAnimationOptions {
  transitionId: string
  transitionName: string
  startPoses: GrapplerPosePair
  endPoses: GrapplerPosePair
  startState: GrapplingDisplayState
  endState: GrapplingDisplayState
  startContacts: readonly GrapplingContact[]
  endContacts: readonly GrapplingContact[]
}

interface PoseAnimationDisplay {
  poses: GrapplerPosePair
  state: GrapplingDisplayState
  progress: number
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
      startState,
      endState,
      startContacts,
      endContacts,
    }: PlayPoseAnimationOptions): Promise<boolean> => {
      const definition = getTransitionVisual(transitionId)
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      if (!definition || reduceMotion) {
        cancel()
        return Promise.resolve(false)
      }

      cancel()
      const animationGeneration = generation.current
      const contactContext = { startContacts, endContacts }

      return new Promise((resolve) => {
        pendingResolution.current = resolve
        const startTime = performance.now()

        setDisplay({
          poses: resolveTransitionPoses(
            definition,
            startPoses,
            endPoses,
            0,
            contactContext,
          ),
          state: startState,
          progress: 0,
          transitionName,
        })

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
              contactContext,
            ),
            state: resolveTransitionDisplayState(
              startState,
              endState,
              progress,
            ),
            progress,
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

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  resolveTransitionPoses,
  type GrapplerPosePair,
} from '../grappling/interpolatePose'
import {
  resolveTransitionDisplayState,
  type GrapplingDisplayState,
} from '../grappling/displayState'
import { getAnimationRecipe } from '../grappling/animationRecipes/registry'
import type { GrapplingContact } from '../grappling/types'
import type { ActiveVisualControl } from '../grappling/controlTargets'

interface PlayPoseAnimationOptions {
  transitionId: string
  transitionName: string
  startPoses: GrapplerPosePair
  endPoses: GrapplerPosePair
  startState: GrapplingDisplayState
  endState: GrapplingDisplayState
  startContacts: readonly GrapplingContact[]
  endContacts: readonly GrapplingContact[]
  startControls: readonly ActiveVisualControl[]
  endControls: readonly ActiveVisualControl[]
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
      startControls,
      endControls,
    }: PlayPoseAnimationOptions): Promise<boolean> => {
      const recipe = getAnimationRecipe(transitionId)
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      if (reduceMotion) {
        cancel()
        return Promise.resolve(false)
      }

      cancel()
      const animationGeneration = generation.current
      const contactContext = {
        startContacts,
        endContacts,
        startControls,
        endControls,
      }

      return new Promise((resolve) => {
        pendingResolution.current = resolve
        const startTime = performance.now()

        setDisplay({
          poses: resolveTransitionPoses(
            recipe,
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
            (timestamp - startTime) / (recipe?.durationMs ?? 300),
            1,
          )
          setDisplay({
            poses: resolveTransitionPoses(
              recipe,
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

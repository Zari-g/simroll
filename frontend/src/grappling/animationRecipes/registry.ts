import { authoredAnimationRecipes } from './recipes.ts'
import type { AnimationRecipe } from './types.ts'
import { validateAnimationRecipe } from './validation.ts'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value)) deepFreeze(nested)
  }
  return value
}

function createRegistry(
  recipes: readonly AnimationRecipe[],
): Readonly<Record<string, AnimationRecipe>> {
  const registry: Record<string, AnimationRecipe> = Object.create(null)
  for (const recipe of recipes) {
    validateAnimationRecipe(recipe)
    if (registry[recipe.transitionId]) {
      throw new Error(`Duplicate animation recipe for transition "${recipe.transitionId}"`)
    }
    registry[recipe.transitionId] = deepFreeze(recipe)
  }
  deepFreeze(recipes)
  return Object.freeze(registry)
}

/** The sole authoring lookup boundary between semantic transitions and visuals. */
export const animationRecipeRegistry = createRegistry(authoredAnimationRecipes)

export function getAnimationRecipe(transitionId: string): AnimationRecipe | null {
  return animationRecipeRegistry[transitionId] ?? null
}

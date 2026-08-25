import { authoredAnimationRecipes } from './recipes.ts'
import { compileFamilyRecipe } from './familyRegistry.ts'
import type { AnimationRecipe, AuthoredAnimationRecipe } from './types.ts'
import { validateAnimationRecipe } from './validation.ts'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value)) deepFreeze(nested)
  }
  return value
}

function createRegistry(
  authoredRecipes: readonly AuthoredAnimationRecipe[],
): Readonly<Record<string, AnimationRecipe>> {
  const registry: Record<string, AnimationRecipe> = Object.create(null)
  for (const authoring of authoredRecipes) {
    const recipe = 'familyId' in authoring ? compileFamilyRecipe(authoring) : authoring
    validateAnimationRecipe(recipe)
    if (registry[recipe.transitionId]) {
      throw new Error(`Duplicate animation recipe for transition "${recipe.transitionId}"`)
    }
    registry[recipe.transitionId] = deepFreeze(recipe)
  }
  deepFreeze(authoredRecipes)
  return Object.freeze(registry)
}

/** The sole authoring lookup boundary between semantic transitions and visuals. */
export const animationRecipeRegistry = createRegistry(authoredAnimationRecipes)

export function getAnimationRecipe(transitionId: string): AnimationRecipe | null {
  return animationRecipeRegistry[transitionId] ?? null
}

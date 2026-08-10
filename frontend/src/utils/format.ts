export function formatReadable(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toLocaleUpperCase())
}

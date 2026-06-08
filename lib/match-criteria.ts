/** Returns true when every criterion appears in the searchable text (case-insensitive). */
export function matchesAllCriteria(searchable: string, criteria: string[]) {
  if (criteria.length === 0) return true
  const haystack = searchable.toLowerCase()
  return criteria.every((c) => haystack.includes(c.trim().toLowerCase()))
}

export function slugify(input) {
  if (!input) {
    return ''
  }

  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function ensureSlug(value, fallback) {
  const slug = slugify(value)
  if (slug) {
    return slug
  }
  const base = typeof fallback === 'string' && fallback ? fallback : 'dossier'
  return slugify(base) || 'dossier'
}

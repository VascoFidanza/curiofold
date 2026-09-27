const labels: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'design-history': {
    en: 'Design history',
    'pt-PT': 'História do design',
  },
}

/** Category keys are editorial identifiers; public labels are locale-aware. */
export function categoryLabel(key: string, locale: string): string {
  return (
    labels[key]?.[locale] ??
    key
      .split('-')
      .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
      .join(' ')
  )
}

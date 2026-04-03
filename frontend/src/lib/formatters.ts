export function formatCurrency(value: number | string, suffix = 'EUR') {
  const numeric = typeof value === 'number' ? value : Number(value)
  return `${numeric.toFixed(2)} ${suffix}`
}

export function formatPercent(value: number | string) {
  const numeric = typeof value === 'number' ? value : Number(value)
  return `${numeric.toFixed(0)}%`
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatTime(value: string) {
  const [hours = '00', minutes = '00'] = value.split(':')
  return `${hours}:${minutes}`
}

export function titleCase(value: string) {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

export function formatAed(value: number): string {
  return `${Math.round(value).toLocaleString('en-US')} AED`;
}

export function formatCompact(value: number): string {
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

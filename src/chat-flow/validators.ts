/** Shared step validators — previously duplicated verbatim across every domain's flowConfig.ts. */

export function requiredText(label: string) {
  return (value: unknown) => (typeof value === 'string' && value.trim().length > 0 ? null : `Enter ${label}.`);
}

export function nonNegativeAmount(value: unknown) {
  return typeof value === 'number' && !Number.isNaN(value) && value >= 0 ? null : 'Enter a valid amount.';
}

export function requiredChoice(label: string) {
  return (value: unknown) => (value ? null : `Choose ${label}.`);
}

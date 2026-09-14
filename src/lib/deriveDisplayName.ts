/** Shared by every page's AppHeader identity block — capitalized local-part of the email, falling back to "there". */
export function deriveDisplayName(email: string | undefined): string {
  if (!email) return 'there';
  const local = email.split('@')[0] ?? email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

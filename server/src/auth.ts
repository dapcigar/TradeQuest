export function getBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1];
  if (token.length === 0 || token.length > 8192) return null;
  return token;
}

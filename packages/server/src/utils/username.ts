/**
 * Username validation and normalization utilities
 */

/**
 * Username rules:
 * - Length: 3-32 characters
 * - Characters: alphanumeric (a-z, A-Z, 0-9), underscore (_), dash (-)
 * - Must start with a letter or number
 * - Case-insensitive (stored as lowercase)
 * - No consecutive special characters (__, --, _-, -_)
 */

const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,30}[a-zA-Z0-9]$/;
const CONSECUTIVE_SPECIAL_REGEX = /(__)|(--)|(_{2,})|(-{2,})|(_-)|(-_)/;

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Validate and normalize a username
 */
export function validateUsername(username: string): UsernameValidationResult {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();

  // Check length
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  if (trimmed.length > 32) {
    return { valid: false, error: 'Username must be at most 32 characters' };
  }

  // Check format
  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Username must start and end with a letter or number, and contain only letters, numbers, underscores, or dashes',
    };
  }

  // Check for consecutive special characters
  if (CONSECUTIVE_SPECIAL_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Username cannot contain consecutive special characters',
    };
  }

  // Normalize: lowercase for case-insensitive uniqueness
  const normalized = trimmed.toLowerCase();

  return { valid: true, normalized };
}

/**
 * Check if username is available (not taken)
 */
export async function isUsernameAvailable(
  prisma: any,
  username: string,
  excludeUserId?: bigint
): Promise<boolean> {
  const validation = validateUsername(username);
  if (!validation.valid || !validation.normalized) {
    return false;
  }

  const existingUser = await prisma.users.findFirst({
    where: {
      username: validation.normalized,
      ...(excludeUserId && { id: { not: excludeUserId } }),
    },
  });

  return !existingUser;
}

/**
 * Suggest alternative usernames if taken
 */
export async function suggestUsernames(
  prisma: any,
  baseUsername: string,
  count: number = 3
): Promise<string[]> {
  const validation = validateUsername(baseUsername);
  if (!validation.valid || !validation.normalized) {
    return [];
  }

  const suggestions: string[] = [];
  const base = validation.normalized;

  // Try with numbers
  for (let i = 1; i <= count * 2; i++) {
    const suggestion = `${base}${i}`;
    const available = await isUsernameAvailable(prisma, suggestion);
    if (available) {
      suggestions.push(suggestion);
      if (suggestions.length >= count) break;
    }
  }

  return suggestions;
}

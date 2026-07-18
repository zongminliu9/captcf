import bcrypt from "bcryptjs";

const ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Basic strength gate used at registration. */
export function passwordIssues(pw: string): string[] {
  const issues: string[] = [];
  if (pw.length < 8) issues.push("min_length");
  if (!/[a-zA-Z]/.test(pw)) issues.push("needs_letter");
  if (!/[0-9]/.test(pw)) issues.push("needs_number");
  return issues;
}

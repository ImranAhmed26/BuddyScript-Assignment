// Password hashing helpers used by auth signup/login flows.
import bcrypt from 'bcryptjs';

// Cost factor 12: balances brute-force resistance with interactive login speed.
const SALT_ROUNDS = 12;

/** Hashes a plaintext password for storage. */
export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS);

/** Compares a plaintext password against a stored hash (constant-time). */
export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

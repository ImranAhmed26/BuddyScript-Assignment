// Password hashing helpers used by auth signup/login flows.
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12; // higher is slower to brute-force but also slower for real logins

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

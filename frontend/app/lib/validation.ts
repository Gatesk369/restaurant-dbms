/** Client-side rules, ported from the mock-ups. The database re-checks them. */

export const CREDENTIALS_ERROR =
  "Error: enter your username and a password of at least 4 characters.";

/** Sign-in: a username and a password of at least 4 characters. */
export function canSignIn(username: string, password: string): boolean {
  return username.trim() !== "" && password.length >= 4;
}

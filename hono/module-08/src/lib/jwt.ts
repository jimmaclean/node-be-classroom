import jwt from "jsonwebtoken";

// ─── Token payload types ──────────────────────────────────

export interface AccessTokenPayload {
  sub: number;   // "subject" — the user's ID (standard JWT claim)
  email: string;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: number;
  type: "refresh";
}

// ─── Token creation ───────────────────────────────────────

export function signAccessToken(userId: number, email: string): string {
  const payload: AccessTokenPayload = { sub: userId, email, type: "access" };

  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m") as jwt.SignOptions["expiresIn"] }
  );
}

export function signRefreshToken(userId: number): string {
  const payload: RefreshTokenPayload = { sub: userId, type: "refresh" };

  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"] }
  );
}

// ─── Token verification ───────────────────────────────────

export function verifyAccessToken(token: string): AccessTokenPayload {
  // jwt.verify throws if:
  //   - signature is invalid (token was tampered)
  //   - token has expired (exp claim is in the past)
  //   - wrong secret used
  const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string);
  return payload as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string);
  return payload as RefreshTokenPayload;
}

// ─── Token inspection (without verification) ─────────────

// Useful for debugging — DO NOT use the result for auth decisions
export function decodeToken(token: string): jwt.JwtPayload | null {
  return jwt.decode(token) as jwt.JwtPayload | null;
}

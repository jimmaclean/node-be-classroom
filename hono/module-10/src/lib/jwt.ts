import jwt from "jsonwebtoken";

export interface AccessTokenPayload {
  sub: number;
  email: string;
  type: "access";
}

export function signAccessToken(userId: number, email: string): string {
  return jwt.sign(
    { sub: userId, email, type: "access" },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m") as jwt.SignOptions["expiresIn"] }
  );
}

export function signRefreshToken(userId: number): string {
  return jwt.sign(
    { sub: userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"] }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { sub: number } {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { sub: number };
}

export interface TokenPayload {
  sub: string;
  full_name?: string;
  role?: string;
  type: "access" | "refresh" | "verify" | "reset";
  device: string;
}
export interface TokenEntity extends TokenPayload {
  exp: string;
  iat: string;
  aud: string;
  jti: string;
}

export interface AuthEntity {
  email: string;
  password: string;
  role?: string;
  full_name?: string;
}

export type UserRole = "admin" | "manager" | "editor" | "viewer";

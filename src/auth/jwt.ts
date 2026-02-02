import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import type { TokenPayload } from "./types";

export async function signToken({
  payload,
  time,
  secret,
}: {
  payload: TokenPayload;
  time: number | StringValue | undefined;
  secret: string;
}) {
  return jwt.sign(payload, secret, { expiresIn: time });
}

export async function verifyToken({
  token,
  secret,
}: {
  token: string;
  secret: string;
}) {
  return jwt.verify(token, secret);
}

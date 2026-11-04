import { SignJWT, jwtVerify } from "jose";
import type { Session, TokenService } from "../../application/ports/Auth";

export class JoseTokenService implements TokenService {
  private readonly key: Uint8Array;

  constructor(secret: string) {
    this.key = new TextEncoder().encode(secret);
  }

  async sign(session: Session, ttlSeconds: number): Promise<string> {
    return new SignJWT({ name: session.name, guest: session.guest })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(session.sub)
      .setIssuedAt()
      .setExpirationTime(`${ttlSeconds}s`)
      .sign(this.key);
  }

  async verify(token: string): Promise<Session> {
    const { payload } = await jwtVerify(token, this.key, { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.name !== "string") throw new Error("Invalid token");
    return { sub: payload.sub, name: payload.name, guest: payload.guest === true };
  }
}
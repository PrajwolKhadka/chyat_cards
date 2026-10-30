import { SignJWT, createRemoteJWKSet, jwtVerify } from "jose";
import type {
  GoogleProfile,
  GoogleVerifier,
  Session,
  TokenService,
} from "../../application/ports/Auth";

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

const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export class JoseGoogleVerifier implements GoogleVerifier {
  constructor(private readonly clientId: string) {}

  async verify(idToken: string): Promise<GoogleProfile> {
    const { payload } = await jwtVerify(idToken, GOOGLE_KEYS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: this.clientId,
    });
    if (!payload.sub) throw new Error("Missing subject");

    const name =
      typeof payload.name === "string"
        ? payload.name
        : typeof payload.email === "string"
          ? payload.email.split("@")[0]
          : "Player";

    return {
      googleId: payload.sub,
      name,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
    };
  }
}
export type Session = {
  sub: string; // user id for Google users, generated id for guests
  name: string;
  guest: boolean;
};

export interface TokenService {
  sign(session: Session, ttlSeconds: number): Promise<string>;
  verify(token: string): Promise<Session>;
}

export type GoogleProfile = {
  googleId: string;
  name: string;
  picture?: string;
};

export interface GoogleVerifier {
  verify(idToken: string): Promise<GoogleProfile>;
}
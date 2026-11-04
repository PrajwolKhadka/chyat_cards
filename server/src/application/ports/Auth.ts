export type Session = {
  sub: string; // generated guest id
  name: string;
  guest: boolean;
};

export interface TokenService {
  sign(session: Session, ttlSeconds: number): Promise<string>;
  verify(token: string): Promise<Session>;
}
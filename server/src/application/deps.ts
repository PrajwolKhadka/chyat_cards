import type { Rng } from "../domain/deck";
import type { RoomRepository } from "./ports/RoomRepository";

export type Deps = {
  rooms: RoomRepository;
  rng: Rng;
  now: () => number;
};
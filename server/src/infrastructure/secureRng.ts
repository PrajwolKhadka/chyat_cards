import { randomInt } from "node:crypto";
import type { Rng } from "../domain/deck";

export const secureRng: Rng = (maxExclusive) => randomInt(maxExclusive);
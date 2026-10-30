import { describe, expect, it } from "vitest";
import { addSeat, newRoom, startRoomGame } from "../../domain/room";
import { viewFor } from "./presenter";

const rng = (max: number) => Math.floor(Math.random() * max);

function startedRoom() {
  let room = newRoom("ABCDE", { playerId: "a", name: "Asha", isGuest: false }, 0);
  room = addSeat(room, { playerId: "b", name: "Bikash", isGuest: true });
  room = addSeat(room, { playerId: "c", name: "Chandra", isGuest: true });
  return startRoomGame(room, "a", rng);
}

describe("viewFor", () => {
  it("shows a player only their own hand", () => {
    const room = startedRoom();
    const view = viewFor(room, "a", null);
    const json = JSON.stringify(view);

    expect(view.game?.hand).toHaveLength(7);

    const others = room.game!.players.filter((p) => p.id !== "a").flatMap((p) => p.hand);
    for (const card of others) expect(json).not.toContain(`"${card.id}"`);
  });

  it("shows card counts for the other players", () => {
    const view = viewFor(startedRoom(), "a", null);
    expect(view.seats.find((s) => s.playerId === "b")?.cardCount).toBe(7);
  });

  it("never exposes the draw pile contents", () => {
    const room = startedRoom();
    const json = JSON.stringify(viewFor(room, "a", null));
    for (const card of room.game!.drawPile) expect(json).not.toContain(`"${card.id}"`);
  });

  it("never exposes whether a wild draw four was a bluff", () => {
    const room = startedRoom();
    const game = {
      ...room.game!,
      pendingDraw4: { playedBy: "a", victimId: "b", hadMatchingColor: true, resumeIndex: 2 },
      current: 1,
    };
    const json = JSON.stringify(viewFor({ ...room, game }, "b", null));
    expect(json).not.toContain("hadMatchingColor");
    expect(json).not.toContain("resumeIndex");
  });

  it("has no game before the host starts", () => {
    const room = newRoom("ABCDE", { playerId: "a", name: "Asha", isGuest: false }, 0);
    expect(viewFor(room, "a", null).game).toBeNull();
  });
});
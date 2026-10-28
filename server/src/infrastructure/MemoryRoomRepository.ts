import { RoomRepository } from "../application/ports/RoomRepository";
import { Room } from "../domain/room";

export class MemoryRoomRepository implements RoomRepository {
  private rooms = new Map<string, Room>();

  async get(code: string): Promise<Room | undefined> {
    return this.rooms.get(code);
  }

  async save(room: Room): Promise<void> {
    this.rooms.set(room.code, room);
  }

  async delete(code: string): Promise<void> {
    this.rooms.delete(code);
  }

  async exists(code: string): Promise<boolean> {
    return this.rooms.has(code);
  }
}
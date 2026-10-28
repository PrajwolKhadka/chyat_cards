import type { Room } from "../../domain/room";

export interface RoomRepository {
    get(code: string): Promise<Room | undefined>;
    save(room: Room): Promise<void>;
    delete(code: string): Promise<void>;
    exists(code: string): Promise<boolean>;
};
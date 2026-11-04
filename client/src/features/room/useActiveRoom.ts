
"use client";

import { useEffect, useState } from "react";
import { getActiveRoomCode, getSocket } from "@/lib/socket";

// Returns the code of the room the player is already in,
// so home can offer a way back.
export function useActiveRoom(): string | null {
  const [code, setCode] = useState<string | null>(
    () => getActiveRoomCode()
  );

  useEffect(() => {
    const socket = getSocket();

    const onState = (room: { code: string }) => {
      setCode(room.code);
    };

    // Listen for room state updates
    socket.on("room:state", onState);

    // Connect if the socket is disconnected
    if (!socket.connected) {
      socket.connect();
    }

    // Clean up listener on unmount
    return () => {
      socket.off("room:state", onState);
    };
  }, []);

  return code;
}

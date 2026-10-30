import { describe, expect, it } from "vitest";
import { KeyedMutex } from "./KeyedMutex";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("KeyedMutex", () => {
  it("runs tasks for the same key one at a time, in order", async () => {
    const lock = new KeyedMutex();
    const order: string[] = [];

    const first = lock.run("room", async () => {
      order.push("first start");
      await sleep(20);
      order.push("first end");
    });
    const second = lock.run("room", async () => {
      order.push("second start");
      order.push("second end");
    });

    await Promise.all([first, second]);
    expect(order).toEqual(["first start", "first end", "second start", "second end"]);
  });

  it("does not make different keys wait for each other", async () => {
    const lock = new KeyedMutex();
    const order: string[] = [];

    const slow = lock.run("one", async () => {
      await sleep(20);
      order.push("slow");
    });
    const fast = lock.run("two", async () => {
      order.push("fast");
    });

    await Promise.all([slow, fast]);
    expect(order).toEqual(["fast", "slow"]);
  });

  it("keeps going after a task fails", async () => {
    const lock = new KeyedMutex();
    await expect(lock.run("room", async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(await lock.run("room", async () => "still works")).toBe("still works");
  });
});
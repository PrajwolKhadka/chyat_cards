import {describe, expect, it} from "vitest";
import { buildDeck, shuffle } from "./deck";

describe("builDock", () => {
    const deck = buildDeck();

    it("has 108 cards", ()=>{
        expect(deck).toHaveLength(108);
    });

    it("has unique id",()=>{
        expect(new Set(deck.map((c)=>c.id)).size).toBe(108);
    });

    it("has 25 cards per color",()=>{
        for(const color of ["red","yellow","green","blue"]){
            expect(deck.filter((c) => c.kind !== "wild" && c.color === color)).toHaveLength(25);
        }
    });

    it("has 8 wild cards", ()=>{
        expect(deck.filter((c)=>c.kind === "wild")).toHaveLength(8);
    });

    describe("shuffle", () => {
        it("keeps every card and does not change the input",()=>{
            const deck = buildDeck();
            const shuffled = shuffle(deck,(max) => Math.floor(Math.random() * max));
            expect(shuffled).toHaveLength(108);
            expect(new Set(shuffled.map((c)=>c.id)).size).toBe(108);
            expect(deck[0].id).toBe("red_0_a");
        });
    });
});

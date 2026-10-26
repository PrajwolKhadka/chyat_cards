export const COLORS = ["red","yellow", "green", "blue"] as const;
export type Color = (typeof COLORS)[number];

export const ACTIONS = ["skip","reverse","draw2"] as const;
export type ActionValue = (typeof ACTIONS)[number];

export type WildValue = "wild" | "draw4";

export type Card = 
    | {id : string; kind: "number"; color:Color; value: number}
    | {id : string; kind: "action"; color:Color; value: ActionValue}
    | {id : string; kind: "wild"; value: WildValue};


// Satirical president "skins". Each one is a fictional composite archetype,
// not a real historical figure, so the AI can lampoon a *type* of politician
// freely. Everything here is plain data — swap in real historical names and
// tune the numbers if you want a more pointed roster; nothing else in the
// codebase needs to change.
export type MovementBias = "flee" | "wander" | "bold" | "stubborn";

export interface PresidentProfile {
  id: string;
  name: string;
  archetype: string;
  tagline: string;
  bias: MovementBias;
  // 0 = never volunteers a move, 1 = always moves when a move is available.
  moveEagerness: number;
  flavor: {
    move: string[];
    danger: string[];
    escape: string[];
    captured: string[];
  };
}

export const PRESIDENTS: PresidentProfile[] = [
  {
    id: "showman",
    name: "President Rex Marlowe",
    archetype: "The Showman",
    tagline: "Never met a crowd he didn't walk straight into.",
    bias: "bold",
    moveEagerness: 0.9,
    flavor: {
      move: [
        "\"Everybody's watching, might as well give them a show!\"",
        "Marlowe strides toward the cameras, waving.",
        "\"Nobody protects the president better than the president!\"",
      ],
      danger: [
        "\"They love me, they're not really going to hurt me.\"",
        "Marlowe poses for a photo, oblivious to the crowd closing in.",
      ],
      escape: [
        "\"The motorcade waited for me. Of course it did.\"",
      ],
      captured: [
        "\"This is going to make an incredible memoir chapter.\"",
      ],
    },
  },
  {
    id: "statesman",
    name: "President Eleanor Voss",
    archetype: "The Statesman",
    tagline: "Calm, calculating, always three moves ahead.",
    bias: "flee",
    moveEagerness: 0.8,
    flavor: {
      move: [
        "Voss calmly repositions, eyes already on the exits.",
        "\"Prudence is not the same thing as cowardice.\"",
        "Voss lets the detail clear a path first.",
      ],
      danger: [
        "\"Noted. Recalculating.\"",
        "Voss's jaw tightens, but the pace stays measured.",
      ],
      escape: [
        "\"As planned,\" Voss says, stepping into the car.",
      ],
      captured: [
        "\"Well. That was a miscalculation.\"",
      ],
    },
  },
  {
    id: "wildcard",
    name: "President Chip Halloway",
    archetype: "The Wildcard",
    tagline: "Nobody, least of all Halloway, knows what happens next.",
    bias: "wander",
    moveEagerness: 0.7,
    flavor: {
      move: [
        "Halloway wanders off mid-sentence.",
        "\"Wait, why is everyone running?\"",
        "Halloway takes a completely unnecessary detour.",
      ],
      danger: [
        "\"Is that guy a fan or...?\"",
        "Halloway seems more confused than afraid.",
      ],
      escape: [
        "\"Wait, we're leaving? Okay, bye!\"",
      ],
      captured: [
        "\"How did THAT happen?\"",
      ],
    },
  },
  {
    id: "isolationist",
    name: "President Walter Graves",
    archetype: "The Isolationist",
    tagline: "Would very much prefer to stay right here, thanks.",
    bias: "stubborn",
    moveEagerness: 0.3,
    flavor: {
      move: [
        "Graves grudgingly shuffles a few feet.",
        "\"I don't see why I have to be the one who moves.\"",
      ],
      danger: [
        "\"I'm not going anywhere,\" Graves mutters, not moving.",
        "Graves digs in and folds his arms.",
      ],
      escape: [
        "\"Fine. FINE. I'm going,\" Graves grumbles, climbing in.",
      ],
      captured: [
        "\"I told you people I wanted to stay inside today.\"",
      ],
    },
  },
];

export function pickLine(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

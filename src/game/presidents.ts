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
  // Baseline (unescorted) willingness to move on its own: 0 = never
  // volunteers, 1 = always moves when possible. Deliberately kept low
  // across the roster — the President isn't supposed to make real
  // progress alone. It's overridden entirely (always moves, no personality)
  // while escort-boosted; see presidentAI.decidePresidentMove.
  moveEagerness: number;
  flavor: {
    move: string[];
    danger: string[];
    escape: string[];
    captured: string[];
    // Said the moment an agent gets in close and personality briefly
    // gives way to actually listening to the detail.
    escorted: string[];
  };
}

export const PRESIDENTS: PresidentProfile[] = [
  {
    id: "showman",
    name: "President Rex Marlowe",
    archetype: "The Showman",
    tagline: "Never met a crowd he didn't walk straight into.",
    bias: "bold",
    moveEagerness: 0.35,
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
      escorted: [
        "\"Alright, alright, I hear you,\" Marlowe mutters, finally moving with purpose.",
        "For once, Marlowe actually listens to the detail.",
      ],
    },
  },
  {
    id: "statesman",
    name: "President Eleanor Voss",
    archetype: "The Statesman",
    tagline: "Calm, calculating, always three moves ahead.",
    bias: "flee",
    moveEagerness: 0.5,
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
      escorted: [
        "\"Good. Direct pressure, direct response,\" Voss says, picking up the pace.",
        "Voss falls into step with the agent, all business now.",
      ],
    },
  },
  {
    id: "wildcard",
    name: "President Chip Halloway",
    archetype: "The Wildcard",
    tagline: "Nobody, least of all Halloway, knows what happens next.",
    bias: "wander",
    moveEagerness: 0.3,
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
      escorted: [
        "\"Oh, we're doing the fast walk now? Okay, fast walk it is!\"",
        "Halloway suddenly, briefly, seems to know exactly where he's going.",
      ],
    },
  },
  {
    id: "isolationist",
    name: "President Walter Graves",
    archetype: "The Isolationist",
    tagline: "Would very much prefer to stay right here, thanks.",
    bias: "stubborn",
    moveEagerness: 0.1,
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
      escorted: [
        "\"Fine, FINE, I'm moving,\" Graves grumbles, actually moving.",
        "Graves lets himself be steered, grudgingly.",
      ],
    },
  },
];

export function pickLine(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

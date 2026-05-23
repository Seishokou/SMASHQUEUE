import { Activity, CourtWithPlayers, Player, QueueEntryWithPlayer } from "../hooks/useSmashQueue";

const now = Date.now();

export const demoCourts: CourtWithPlayers[] = [
  {
    id: 1,
    court_number: 1,
    status: "playing",
    active_players: ["Player A", "Player B", "Player C", "Player D"]
  },
  { id: 2, court_number: 2, status: "available", active_players: [] },
  { id: 3, court_number: 3, status: "available", active_players: [] },
  { id: 4, court_number: 4, status: "playing", active_players: ["Mika", "Ren"] }
];

export const demoQueue: QueueEntryWithPlayer[] = [
  {
    id: "queue-1",
    joined_at: new Date(now - 6 * 60000).toISOString(),
    player: { id: "p1", name: "Player X", skill_level: "Int", current_status: "waiting" }
  },
  {
    id: "queue-2",
    joined_at: new Date(now - 4 * 60000).toISOString(),
    player: { id: "p2", name: "Player Y", skill_level: "Beg", current_status: "waiting" }
  },
  {
    id: "queue-3",
    joined_at: new Date(now - 2 * 60000).toISOString(),
    player: { id: "p3", name: "Player Z", skill_level: "Adv", current_status: "waiting" }
  }
];

export const demoPlayers: Player[] = [
  ...demoQueue.map((entry) => entry.player),
  { id: "p4", name: "Player A", skill_level: "Adv", current_status: "playing" },
  { id: "p5", name: "Player B", skill_level: "Int", current_status: "playing" },
  { id: "p6", name: "Mika Santos", skill_level: "Beg", current_status: "playing" }
];

export const demoActivities: Activity[] = [
  { id: "a1", message: "Player A and Player B started on Court 1" },
  { id: "a2", message: "Court 2 is ready for the next match" },
  { id: "a3", message: "Player X joined the live queue" }
];

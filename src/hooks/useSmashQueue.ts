import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { demoActivities, demoCourts, demoPlayers, demoQueue } from "../data/demo";
import { isSupabaseConfigured, supabase } from "../../supabase/supabaseConfig";

export type SkillLevel = "Beg" | "Int" | "Adv";
export type PlayerStatus = "waiting" | "playing" | "idle" | "done";
export type CourtStatus = "available" | "open" | "playing" | "Available" | "Occupied";

export type Player = {
  id: string;
  name: string;
  skill_level: SkillLevel;
  current_status: PlayerStatus;
  joined_at?: string;
};

export type QueueEntryWithPlayer = {
  id: string;
  joined_at: string;
  status?: "waiting" | "playing" | "done" | "assigned" | "cancelled";
  player_name?: string;
  skill_level?: SkillLevel;
  player: Player;
};

export type CourtWithPlayers = {
  id: number;
  court_number: number;
  status: CourtStatus;
  active_players: string[];
  assigned_player_names?: string[];
  match_started_at?: string | null;
};

export type Activity = {
  id: string;
  message: string;
};

type PlayerRow = {
  id: string;
  name: string;
  skill_level: SkillLevel;
  current_status: PlayerStatus;
};

type QueueRow = {
  id: string;
  joined_at: string;
  players: PlayerRow | PlayerRow[] | null;
};

type PlayersQueueRow = {
  id: string;
  player_name: string;
  skill_level: SkillLevel;
  status: "waiting" | "playing" | "done";
  created_at: string;
  assigned_at?: string | null;
  finished_at?: string | null;
};

type CourtRow = {
  id: number;
  court_number: number;
  status: CourtStatus;
  assigned_player_ids?: string[] | null;
  assigned_player_names?: string[] | null;
  match_started_at?: string | null;
};

type AssignmentRow = {
  id: string;
  court_id: number;
  status: "playing" | "completed";
  assignment_players: { players: Pick<PlayerRow, "name"> | Pick<PlayerRow, "name">[] | null }[];
};

type ActivityRow = {
  id: string;
  message: string;
};

export function useSmashQueue() {
  const channelNameRef = useRef(`smashqueue-live-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [players, setPlayers] = useState<Player[]>(isSupabaseConfigured ? [] : demoPlayers);
  const [queue, setQueue] = useState<QueueEntryWithPlayer[]>(isSupabaseConfigured ? [] : demoQueue);
  const [courts, setCourts] = useState<CourtWithPlayers[]>(isSupabaseConfigured ? [] : demoCourts);
  const [activities, setActivities] = useState<Activity[]>(
    isSupabaseConfigured ? [] : demoActivities
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);
    setError(null);

    try {
      const [
        playersResponse,
        queueResponse,
        playersQueueResponse,
        courtsResponse,
        assignmentsResponse,
        activitiesResponse
      ] =
        await Promise.all([
          supabase
            .from("players")
            .select("id,name,skill_level,current_status")
            .order("created_at", { ascending: false }),
          supabase
            .from("queue_entries")
            .select("id,joined_at,players(id,name,skill_level,current_status)")
            .eq("status", "waiting")
            .order("joined_at", { ascending: true }),
          supabase
            .from("players_queue")
            .select("id,player_name,skill_level,status,created_at,assigned_at,finished_at")
            .order("created_at", { ascending: true }),
          supabase
            .from("courts")
            .select("id,court_number,status,assigned_player_ids,assigned_player_names,match_started_at")
            .order("court_number"),
          supabase
            .from("court_assignments")
            .select("id,court_id,status,assignment_players(players(name))")
            .eq("status", "playing"),
          supabase
            .from("activity_log")
            .select("id,message")
            .order("created_at", { ascending: false })
            .limit(10)
        ]);

      if (playersResponse.error) throw playersResponse.error;
      if (queueResponse.error) throw queueResponse.error;
      if (playersQueueResponse.error) throw playersQueueResponse.error;
      if (courtsResponse.error) throw courtsResponse.error;
      if (assignmentsResponse.error) throw assignmentsResponse.error;
      if (activitiesResponse.error) throw activitiesResponse.error;

      const assignmentByCourt = new Map<number, string[]>();

      ((assignmentsResponse.data ?? []) as AssignmentRow[]).forEach((assignment) => {
        const names = assignment.assignment_players
          .flatMap((assignmentPlayer) => normalizeMaybeArray(assignmentPlayer.players))
          .map((player) => player.name);

        assignmentByCourt.set(assignment.court_id, names);
      });

      const courtRows = (courtsResponse.data ?? []) as CourtRow[];
      const activeCourtPlayerNames = new Set(
        courtRows
          .filter((court) => isCourtOccupied(court))
          .flatMap((court) => court.assigned_player_names ?? [])
          .map((name) => name.trim().toLowerCase())
      );
      const rawPlayersQueueRows = (playersQueueResponse.data ?? []) as PlayersQueueRow[];
      const playersQueueRows: PlayersQueueRow[] = rawPlayersQueueRows.map((entry) => {
        if (!isStalePlayingEntry(entry, activeCourtPlayerNames)) return entry;
        return {
          ...entry,
          status: "done" as const,
          finished_at: entry.finished_at ?? new Date().toISOString()
        };
      });
      const stalePlayingIds = playersQueueRows
        .filter((entry) => entry.status === "done" && rawPlayersQueueRows
          .some((rawEntry) => rawEntry.id === entry.id && rawEntry.status === "playing"))
        .map((entry) => entry.id);

      if (stalePlayingIds.length) {
        await supabase
          .from("players_queue")
          .update({ status: "done", finished_at: new Date().toISOString() })
          .in("id", stalePlayingIds);
      }

      const queuePlayers = playersQueueRows
        .slice()
        .sort((first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime())
        .map((entry) => ({
          id: entry.id,
          name: entry.player_name,
          skill_level: entry.skill_level,
          current_status: toPlayerStatus(entry.status),
          joined_at: entry.created_at
        }));

      setPlayers(queuePlayers.length ? queuePlayers : ((playersResponse.data ?? []) as PlayerRow[]).map(toPlayer));

      const bookQueue: QueueEntryWithPlayer[] = playersQueueRows
      .filter((entry) => entry.status === "waiting")
      .map((entry) => {
        const currentStatus = toPlayerStatus(entry.status);
        return {
          id: entry.id,
          joined_at: entry.created_at,
          status: entry.status,
          player_name: entry.player_name,
          skill_level: entry.skill_level,
          player: {
            id: entry.id,
            name: entry.player_name,
            skill_level: entry.skill_level,
            current_status: currentStatus
          }
        };
      });

      const legacyQueue = (((queueResponse.data ?? []) as QueueRow[])
          .map((entry) => {
            const player = normalizeMaybeArray(entry.players)[0];
            if (!player) return null;
            return {
              id: entry.id,
              joined_at: entry.joined_at,
              status: "waiting" as const,
              player_name: player.name,
              skill_level: player.skill_level,
              player: toPlayer(player)
            };
          })
          .filter(Boolean)) as QueueEntryWithPlayer[];

      setQueue(playersQueueRows.length || isSupabaseConfigured ? bookQueue : legacyQueue);
      setCourts(
        courtRows.map((court) => {
          const assignedPlayerNames = court.assigned_player_names ?? [];
          return {
            ...court,
            assigned_player_names: assignedPlayerNames,
            active_players: assignedPlayerNames.length
              ? assignedPlayerNames
              : assignmentByCourt.get(court.id) ?? [],
            match_started_at: court.match_started_at ?? null
          };
        })
      );
      setActivities((activitiesResponse.data ?? []) as ActivityRow[]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const channel = client
      .channel(channelNameRef.current)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        () => void fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        () => void fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players_queue" },
        () => void fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "courts" },
        () => void fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "court_assignments" },
        () => void fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignment_players" },
        () => void fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_log" },
        () => void fetchAll()
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchAll]);

  const joinQueue = useCallback(
    async (name: string, skillLevel: SkillLevel) => {
      setJoining(true);
      setError(null);

      try {
        if (!supabase) {
          const player: Player = {
            id: `local-${Date.now()}`,
            name,
            skill_level: skillLevel,
            current_status: "waiting"
          };

          setPlayers((current) => [player, ...current]);
          setQueue((current) => [
            ...current,
            {
              id: `queue-${Date.now()}`,
              joined_at: new Date().toISOString(),
              player
            }
          ]);
          setActivities((current) => [
            { id: `activity-${Date.now()}`, message: `${name} joined the live queue` },
            ...current
          ]);
          return;
        }

        const { data: existingPlayer, error: findError } = await supabase
          .from("players")
          .select("id")
          .ilike("name", name)
          .maybeSingle();

        if (findError) throw findError;

        let playerId = existingPlayer?.id as string | undefined;

        if (!playerId) {
          const { data: createdPlayer, error: createError } = await supabase
            .from("players")
            .insert({
              name,
              skill_level: skillLevel,
              current_status: "waiting"
            })
            .select("id")
            .single();

          if (createError) throw createError;
          playerId = createdPlayer.id;
        } else {
          const { error: updateError } = await supabase
            .from("players")
            .update({ skill_level: skillLevel, current_status: "waiting" })
            .eq("id", playerId);

          if (updateError) throw updateError;
        }

        const { error: queueError } = await supabase.from("queue_entries").insert({
          player_id: playerId,
          status: "waiting"
        });

        if (queueError) throw queueError;

        await logActivity(`${name} joined the live queue`);
        await fetchAll();
      } finally {
        setJoining(false);
      }
    },
    [fetchAll]
  );

  const assignNextGroupToCourt = useCallback(
    async (courtId: number) => {
      const group = queue.slice(0, 4);
      if (group.length < 2) {
        throw new Error("At least two players are needed to start a court.");
      }

      if (!supabase) {
        const names = group.map((entry) => entry.player.name);

        setQueue((current) => current.slice(group.length));
        setPlayers((current) =>
          current.map((player) =>
            names.includes(player.name) ? { ...player, current_status: "playing" } : player
          )
        );
        setCourts((current) =>
          current.map((court) =>
            court.id === courtId
              ? { ...court, status: "Occupied", active_players: names }
              : court
          )
        );
        setActivities((current) => [
          {
            id: `activity-${Date.now()}`,
            message: `${names.join(", ")} started on Court ${courtId}`
          },
          ...current
        ]);
        return;
      }

      const { data: assignment, error: assignmentError } = await supabase
        .from("court_assignments")
        .insert({ court_id: courtId, status: "playing" })
        .select("id")
        .single();

      if (assignmentError) throw assignmentError;

      const assignmentPlayers = group.map((entry) => ({
        assignment_id: assignment.id,
        player_id: entry.player.id
      }));

      const { error: linkError } = await supabase.from("assignment_players").insert(assignmentPlayers);
      if (linkError) throw linkError;

      const playerIds = group.map((entry) => entry.player.id);
      const queueIds = group.map((entry) => entry.id);

      const [courtResponse, playerResponse, queueResponse] = await Promise.all([
        supabase.from("courts").update({ status: "Occupied" }).eq("id", courtId),
        supabase.from("players").update({ current_status: "playing" }).in("id", playerIds),
        supabase
          .from("queue_entries")
          .update({ status: "assigned", assigned_at: new Date().toISOString() })
          .in("id", queueIds)
      ]);

      if (courtResponse.error) throw courtResponse.error;
      if (playerResponse.error) throw playerResponse.error;
      if (queueResponse.error) throw queueResponse.error;

      await logActivity(
        `${group.map((entry) => entry.player.name).join(", ")} started on Court ${courtId}`
      );
      await fetchAll();
    },
    [fetchAll, queue]
  );

  const clearCourt = useCallback(
    async (courtId: number) => {
      if (!supabase) {
        const court = courts.find((current) => current.id === courtId);
        const names = court?.active_players ?? [];
        const nextEntry = queue[0];

        setCourts((current) =>
          current.map((courtItem) =>
            courtItem.id === courtId
              ? nextEntry
                ? {
                    ...courtItem,
                    status: "Occupied",
                    active_players: [nextEntry.player.name]
                  }
                : { ...courtItem, status: "Available", active_players: [] }
              : courtItem
          )
        );
        setQueue((current) => current.slice(nextEntry ? 1 : 0));
        setPlayers((current) =>
          current.map((player) =>
            names.includes(player.name)
              ? { ...player, current_status: "idle" }
              : nextEntry?.player.id === player.id
                ? { ...player, current_status: "playing" }
                : player
          )
        );
        setActivities((current) => [
          {
            id: `activity-${Date.now()}`,
            message: nextEntry
              ? `${nextEntry.player.name} was automatically assigned to Court ${courtId}`
              : `Court ${courtId} is available`
          },
          ...current
        ]);
        return;
      }

      const { data: activeAssignment, error: activeError } = await supabase
        .from("court_assignments")
        .select("id,assignment_players(player_id)")
        .eq("court_id", courtId)
        .eq("status", "playing")
        .maybeSingle();

      if (activeError) throw activeError;

      const playerIds =
        activeAssignment?.assignment_players?.map(
          (assignmentPlayer: { player_id: string }) => assignmentPlayer.player_id
        ) ?? [];

      if (activeAssignment) {
        const { error: assignmentError } = await supabase
          .from("court_assignments")
          .update({ status: "completed", ended_at: new Date().toISOString() })
          .eq("id", activeAssignment.id);

        if (assignmentError) throw assignmentError;
      }

      if (playerIds.length) {
        const { error: playerError } = await supabase
          .from("players")
          .update({ current_status: "idle" })
          .in("id", playerIds);

        if (playerError) throw playerError;
      }

      const { error: courtError } = await supabase
        .from("courts")
        .update({ status: "Available" })
        .eq("id", courtId);

      if (courtError) throw courtError;

      await logActivity(`Court ${courtId} was set to available`);
      await fetchAll();
    },
    [courts, fetchAll, queue]
  );

  const value = useMemo(
    () => ({
      courts,
      queue,
      players,
      activities,
      loading,
      error,
      joining,
      joinQueue,
      assignNextGroupToCourt,
      clearCourt,
      refresh: fetchAll
    }),
    [
      activities,
      assignNextGroupToCourt,
      clearCourt,
      courts,
      error,
      fetchAll,
      joinQueue,
      joining,
      loading,
      players,
      queue
    ]
  );

  return value;
}

async function logActivity(message: string) {
  if (!supabase) return;
  await supabase.from("activity_log").insert({ message });
}

function normalizeMaybeArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toPlayer(player: PlayerRow): Player {
  return {
    id: player.id,
    name: player.name,
    skill_level: player.skill_level,
    current_status: player.current_status
  };
}

function toPlayerStatus(status: PlayersQueueRow["status"]): PlayerStatus {
  if (status === "done") return "done";
  if (status === "playing") return "playing";
  return "waiting";
}

function isCourtOccupied(court: CourtRow) {
  return ["Occupied", "playing"].includes(String(court.status));
}

function isStalePlayingEntry(entry: PlayersQueueRow, activeCourtPlayerNames: Set<string>) {
  if (entry.status !== "playing") return false;

  const playerName = entry.player_name.trim().toLowerCase();
  if (activeCourtPlayerNames.has(playerName)) return false;

  if (!entry.assigned_at) return true;

  const assignedAt = new Date(entry.assigned_at).getTime();
  if (Number.isNaN(assignedAt)) return true;

  return Date.now() - assignedAt > 30_000;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong while loading SmashQueue.";
}

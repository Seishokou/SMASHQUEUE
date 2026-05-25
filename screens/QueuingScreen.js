import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useIsFocused } from '@react-navigation/native';
import { CircleCheck, Clock3, History, Plus, Swords, Trash2, Trophy, X } from 'lucide-react-native';

import { isSupabaseConfigured, supabase } from '../supabase/supabaseConfig';
import AnimatedActionButton from './AnimatedActionButton';
import BackgroundShuttle from './BackgroundShuttle';

const skills = ['Beg', 'Int', 'Adv'];
const courtNumbers = [1, 2, 3, 4];
const matchDurationMinutes = 1;
const initialDemoQueue = [
  { id: 'demo-1', player_name: 'Cleric', skill_level: 'Adv', status: 'waiting', created_at: new Date().toISOString() },
  { id: 'demo-2', player_name: 'Nicole', skill_level: 'Beg', status: 'waiting', created_at: new Date().toISOString() },
  { id: 'demo-3', player_name: 'Khyle', skill_level: 'Beg', status: 'waiting', created_at: new Date().toISOString() },
  { id: 'demo-4', player_name: 'Janna', skill_level: 'Beg', status: 'waiting', created_at: new Date().toISOString() },
  { id: 'demo-5', player_name: 'Al', skill_level: 'Beg', status: 'waiting', created_at: new Date().toISOString() },
];
const initialDemoCourts = courtNumbers.map((courtNumber) => ({
  id: courtNumber,
  court_number: courtNumber,
  status: 'Available',
  assigned_player_ids: [],
  assigned_player_names: [],
  match_duration_minutes: matchDurationMinutes,
  match_started_at: null,
}));

export default function QueuingScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [playerName, setPlayerName] = useState('');
  const [skillLevel, setSkillLevel] = useState('Beg');
  const [queue, setQueue] = useState(isSupabaseConfigured ? [] : initialDemoQueue);
  const [courts, setCourts] = useState(isSupabaseConfigured ? [] : initialDemoCourts);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [joining, setJoining] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [teamAScore, setTeamAScore] = useState('');
  const [teamBScore, setTeamBScore] = useState('');
  const [clearedAt, setClearedAt] = useState(null);
  const [deletingQueueId, setDeletingQueueId] = useState(null);
  const [now, setNow] = useState(Date.now());
  const channelNameRef = useRef(`book-court-live-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const assigningRef = useRef(false);
  const hasLoadedRef = useRef(!isSupabaseConfigured);
  const refreshTimerRef = useRef(null);

  const waitingQueue = useMemo(
    () => queue.filter((player) => player.status === 'waiting'),
    [queue]
  );

  const orderedCourts = useMemo(() => {
    const byCourtNumber = new Map(courts.map((court) => [court.court_number, court]));
    return courtNumbers.map((courtNumber) => (
      byCourtNumber.get(courtNumber) ?? {
        id: courtNumber,
        court_number: courtNumber,
        status: 'Available',
        assigned_player_ids: [],
        assigned_player_names: [],
        match_duration_minutes: matchDurationMinutes,
        match_started_at: null,
      }
    ));
  }, [courts]);

  const fetchBookData = useCallback(async ({ showLoader = false } = {}) => {
    if (!supabase) return;

    if (showLoader || !hasLoadedRef.current) {
      setLoading(true);
    }

    try {
      const [queueResponse, courtsResponse] = await Promise.all([
        supabase
          .from('players_queue')
          .select('id,player_name,skill_level,status,court_id,match_group_id,created_at,assigned_at,finished_at')
          .eq('status', 'waiting')
          .order('created_at', { ascending: true }),
        supabase
          .from('courts')
          .select('id,court_number,status,assigned_player_ids,assigned_player_names,match_started_at,match_duration_minutes')
          .order('court_number', { ascending: true }),
      ]);

      if (queueResponse.error) throw queueResponse.error;
      if (courtsResponse.error) throw courtsResponse.error;

      setQueue((current) => {
        const pendingPlayers = current.filter((player) => player.is_pending);
        const remotePlayers = queueResponse.data ?? [];
        const pendingNotSynced = pendingPlayers.filter(
          (pendingPlayer) =>
            !remotePlayers.some(
              (remotePlayer) =>
                remotePlayer.player_name === pendingPlayer.player_name &&
                remotePlayer.skill_level === pendingPlayer.skill_level
            )
        );

        return [...remotePlayers, ...pendingNotSynced].sort(
          (first, second) => new Date(first.created_at).getTime() - new Date(second.created_at).getTime()
        );
      });
      setCourts(courtsResponse.data ?? []);
      hasLoadedRef.current = true;
    } catch (error) {
      Alert.alert('Could not load Book Court', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookData({ showLoader: true });
  }, [fetchBookData]);

  useEffect(() => {
    if (!supabase) return;

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        void fetchBookData();
      }, 180);
    };

    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players_queue' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courts' },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [fetchBookData]);

  useEffect(() => {
    if (!isFocused) return undefined;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isFocused]);

  useEffect(() => {
    const firstAvailableCourt = orderedCourts.find((court) => isCourtAvailable(court));
    const nextSkillGroup = findNextSkillMatchedGroup(waitingQueue);

    if (!firstAvailableCourt || !nextSkillGroup || assigningRef.current) {
      return;
    }

    assigningRef.current = true;
    void autoAssignCourt(firstAvailableCourt, nextSkillGroup).finally(() => {
      assigningRef.current = false;
    });
  }, [orderedCourts, waitingQueue]);

  function openHistoryScreen() {
    if (navigation?.navigate) {
      navigation.navigate('MatchHistory');
      return;
    }

    navigation?.getParent?.()?.navigate?.('MatchHistory');
  }

  async function handleJoinQueue() {
    const trimmedName = playerName.trim();

    if (!trimmedName) {
      Alert.alert('Player name required', 'Enter a player name before joining the queue.');
      return;
    }

    const createdAt = new Date().toISOString();
    const optimisticPlayer = {
      id: `pending-${Date.now()}`,
      player_name: trimmedName,
      skill_level: skillLevel,
      status: 'waiting',
      created_at: createdAt,
      is_pending: true,
    };

    setJoining(true);
    setPlayerName('');

    try {
      if (!supabase) {
        setQueue((current) => [
          ...current,
          {
            id: `local-${Date.now()}`,
            player_name: trimmedName,
            skill_level: skillLevel,
            status: 'waiting',
            created_at: createdAt,
          },
        ]);
        return;
      }

      setQueue((current) => [...current, optimisticPlayer]);

      const { data, error } = await supabase
        .from('players_queue')
        .insert({
          player_name: trimmedName,
          skill_level: skillLevel,
          status: 'waiting',
        })
        .select('id,player_name,skill_level,status,court_id,match_group_id,created_at,assigned_at,finished_at')
        .single();

      if (error) throw error;

      if (data) {
        setQueue((current) =>
          current
            .map((player) => (player.id === optimisticPlayer.id ? data : player))
            .sort((first, second) => new Date(first.created_at).getTime() - new Date(second.created_at).getTime())
        );
      }

      void fetchBookData();
    } catch (error) {
      setQueue((current) => current.filter((player) => player.id !== optimisticPlayer.id));
      setPlayerName(trimmedName);
      Alert.alert('Could not join queue', getErrorMessage(error));
    } finally {
      setJoining(false);
    }
  }

  function confirmDeleteQueuePlayer(player) {
    Alert.alert(
      'Remove player?',
      `Delete ${player.player_name} from the waiting queue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteQueuePlayer(player),
        },
      ]
    );
  }

  async function deleteQueuePlayer(player) {
    setDeletingQueueId(player.id);

    try {
      setQueue((current) => current.filter((queuePlayer) => queuePlayer.id !== player.id));

      if (!supabase || player.is_pending) {
        return;
      }

      const { error } = await supabase
        .from('players_queue')
        .delete()
        .eq('id', player.id)
        .eq('status', 'waiting');

      if (error) throw error;

      void fetchBookData();
    } catch (error) {
      void fetchBookData();
      Alert.alert('Could not delete player', getErrorMessage(error));
    } finally {
      setDeletingQueueId(null);
    }
  }

  async function autoAssignCourt(court, players) {
    const groupSkill = players[0]?.skill_level;
    const hasMixedSkill = players.some((player) => player.skill_level !== groupSkill);

    if (!groupSkill || players.length !== 4 || hasMixedSkill) {
      return;
    }

    if (players.some((player) => player.is_pending)) {
      return;
    }

    const matchGroupId = createLocalUuid();
    const duration = randomDurationMinutes();
    const startedAt = new Date().toISOString();
    const playerIds = players.map((player) => player.id);
    const playerNames = players.map((player) => player.player_name);

    try {
      setQueue((current) =>
        current.map((player) =>
          playerIds.includes(player.id)
            ? {
                ...player,
                status: 'playing',
                court_id: court.id,
                match_group_id: matchGroupId,
                assigned_at: startedAt,
              }
            : player
        )
      );
      setCourts((current) =>
        current.map((courtItem) =>
          courtItem.id === court.id || courtItem.court_number === court.court_number
            ? {
                ...courtItem,
                status: 'Occupied',
                assigned_player_ids: playerIds,
                assigned_player_names: playerNames,
                match_started_at: startedAt,
                match_duration_minutes: duration,
              }
            : courtItem
        )
      );

      if (!supabase) {
        return;
      }

      const [playersResponse, courtResponse] = await Promise.all([
        supabase
          .from('players_queue')
          .update({
            status: 'playing',
            court_id: court.id,
            match_group_id: matchGroupId,
            assigned_at: startedAt,
          })
          .in('id', playerIds),
        supabase
          .from('courts')
          .update({
            status: 'Occupied',
            assigned_player_ids: playerIds,
            assigned_player_names: playerNames,
            match_started_at: startedAt,
            match_duration_minutes: duration,
          })
          .eq('id', court.id),
      ]);

      if (playersResponse.error) throw playersResponse.error;
      if (courtResponse.error) throw courtResponse.error;

      void fetchBookData();
    } catch (error) {
      void fetchBookData();
      Alert.alert('Auto-assign failed', getErrorMessage(error));
    }
  }

  function openScoreModal(court) {
    if (isCourtAvailable(court)) return;
    setTeamAScore('');
    setTeamBScore('');
    setClearedAt(new Date().toISOString());
    setSelectedCourt(court);
  }

  async function submitScore() {
    if (!selectedCourt) return;

    if (!teamAScore.trim() || !teamBScore.trim()) {
      Alert.alert('Score required', 'Enter final scores for both teams.');
      return;
    }

    const scoreA = Number(teamAScore);
    const scoreB = Number(teamBScore);

    if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
      Alert.alert('Invalid score', 'Enter valid whole-number scores for both teams.');
      return;
    }

    const playerIds = selectedCourt.assigned_player_ids ?? [];
    const playerNames = selectedCourt.assigned_player_names ?? [];
    const teamAPlayers = playerNames.slice(0, 2);
    const teamBPlayers = playerNames.slice(2, 4);
    const matchEndedAt = clearedAt ?? new Date().toISOString();
    const matchStartedAt = selectedCourt.match_started_at ?? matchEndedAt;
    const winner = getWinnerLabel(scoreA, scoreB);
    const matchDate = toLocalDateString(matchEndedAt);

    try {
      if (!supabase) {
        setQueue((current) =>
          current.map((player) =>
            playerIds.includes(player.id)
              ? { ...player, status: 'done', finished_at: matchEndedAt }
              : player
          )
        );
        setCourts((current) =>
          current.map((court) =>
            court.id === selectedCourt.id
              ? {
                  ...court,
                  status: 'Available',
                  assigned_player_ids: [],
                  assigned_player_names: [],
                  match_started_at: null,
                  match_duration_minutes: matchDurationMinutes,
                }
              : court
          )
        );
        setSelectedCourt(null);
        setClearedAt(null);
        openHistoryScreen();
        return;
      }

      const [historyResponse, playersResponse, courtResponse] = await Promise.all([
        supabase.from('match_history').insert({
          court_id: selectedCourt.id,
          court_number: selectedCourt.court_number,
          team_a_players: teamAPlayers,
          team_b_players: teamBPlayers,
          team_a_score: scoreA,
          team_b_score: scoreB,
          winner,
          match_date: matchDate,
          match_started_at: matchStartedAt,
          match_ended_at: matchEndedAt,
          played_at: matchEndedAt,
        }),
        supabase
          .from('players_queue')
          .update({ status: 'done', finished_at: matchEndedAt })
          .in('id', playerIds),
        supabase
          .from('courts')
          .update({
            status: 'Available',
            assigned_player_ids: [],
            assigned_player_names: [],
            match_started_at: null,
            match_duration_minutes: matchDurationMinutes,
          })
          .eq('id', selectedCourt.id),
      ]);

      if (historyResponse.error) throw historyResponse.error;
      if (playersResponse.error) throw playersResponse.error;
      if (courtResponse.error) throw courtResponse.error;

      setSelectedCourt(null);
      setClearedAt(null);
      await fetchBookData();
      openHistoryScreen();
    } catch (error) {
      Alert.alert('Could not submit score', getErrorMessage(error));
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.safeArea}
      >
        <View style={styles.glowGold} />
        <View style={styles.glowGreen} />
        <BackgroundShuttle style={styles.bookBackgroundShuttle} />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Book Court</Text>

          {!isSupabaseConfigured ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>Demo mode: add Supabase keys to .env for live data.</Text>
            </View>
          ) : null}

          <BlurView intensity={28} tint="dark" style={styles.glassPanel}>
            <Text style={styles.sectionTitle}>Join Waiting List</Text>

            <TextInput
              autoCapitalize="words"
              onChangeText={setPlayerName}
              placeholder="Player name"
              placeholderTextColor="#A7A7A7"
              style={styles.input}
              value={playerName}
            />

            <View style={styles.skillRow}>
              {skills.map((item) => {
                const selected = skillLevel === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setSkillLevel(item)}
                    style={[styles.skillButton, selected && styles.skillButtonActive]}
                  >
                    <Text style={[styles.skillText, selected && styles.skillTextActive]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>

            <AnimatedActionButton
              disabled={joining}
              onPress={handleJoinQueue}
              style={styles.joinButton}
              variant="gold"
            >
              {joining ? (
                <ActivityIndicator color="#121212" />
              ) : (
                <>
                  <Plus color="#121212" size={24} strokeWidth={2.6} />
                  <Text style={styles.joinButtonText}>Join Queue</Text>
                </>
              )}
            </AnimatedActionButton>
          </BlurView>

          <BlurView intensity={22} tint="dark" style={styles.glassPanel}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Players in Queue</Text>
              <Text style={styles.counter}>{waitingQueue.length} waiting</Text>
            </View>

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#E7D773" />
                <Text style={styles.emptyText}>Loading queue...</Text>
              </View>
            ) : (
              <FlatList
                data={waitingQueue}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <QueueRow
                    deleting={deletingQueueId === item.id}
                    item={item}
                    onDelete={() => confirmDeleteQueuePlayer(item)}
                    rank={index + 1}
                  />
                )}
                scrollEnabled={false}
                ListEmptyComponent={<Text style={styles.emptyText}>No players are waiting.</Text>}
              />
            )}
          </BlurView>

          <BlurView intensity={22} tint="dark" style={styles.glassPanel}>
            <View style={styles.courtHeader}>
              <View>
                <Text style={styles.sectionTitle}>Court Status</Text>
                <Text style={styles.courtHint}>auto-assigns next</Text>
              </View>

              <Pressable onPress={openHistoryScreen} style={styles.historyButton}>
                <History color="#E7D773" size={16} />
                <Text style={styles.historyButtonText}>History</Text>
              </Pressable>
            </View>

            {orderedCourts.map((court) => (
              <CourtRow
                court={court}
                key={court.id || court.court_number}
                now={now}
                onClear={() => openScoreModal(court)}
              />
            ))}
          </BlurView>
        </ScrollView>

        <ScoreModal
          court={selectedCourt}
          onClose={() => setSelectedCourt(null)}
          onSubmit={submitScore}
          setTeamAScore={setTeamAScore}
          setTeamBScore={setTeamBScore}
          teamAScore={teamAScore}
          teamBScore={teamBScore}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function QueueRow({ deleting, item, onDelete, rank }) {
  return (
    <View style={styles.queueRow}>
      <View style={styles.rankBubble}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>

      <View style={styles.queueCopy}>
        <Text style={styles.playerName}>{item.player_name}</Text>
        <Text style={styles.playerMeta}>{item.skill_level}</Text>
      </View>

      <View style={styles.queueActions}>
        <View style={styles.waitBadge}>
          <Swords color="#E7D773" size={17} />
          <Text style={styles.waitBadgeText}>Wait</Text>
        </View>

        <Pressable
          accessibilityLabel={`Delete ${item.player_name} from queue`}
          disabled={deleting}
          onPress={onDelete}
          style={[styles.deleteQueueButton, deleting && styles.deleteQueueButtonDisabled]}
        >
          {deleting ? (
            <ActivityIndicator color="#FF8B96" size="small" />
          ) : (
            <Trash2 color="#FF8B96" size={18} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function CourtRow({ court, now, onClear }) {
  const available = isCourtAvailable(court);
  const names = court.assigned_player_names ?? [];
  const countdown = getCountdown(court, now);

  return (
    <View style={styles.courtRow}>
      <View style={styles.courtLeft}>
        <View style={[styles.statusDot, available ? styles.availableDot : styles.occupiedDot]} />
        <View style={styles.courtCopy}>
          <Text style={styles.courtName}>Court {court.court_number}</Text>
          <Text style={styles.courtStatus}>{available ? 'Available' : names.join(', ') || 'Occupied'}</Text>
          {!available ? (
            <View style={styles.timerRow}>
              <Clock3 color="#E7D773" size={13} />
              <Text style={styles.timerText}>{countdown}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Pressable
        disabled={available}
        onPress={onClear}
        style={[styles.clearButton, available && styles.clearButtonDisabled]}
      >
        <CircleCheck color={available ? '#777777' : '#121212'} size={17} />
        <Text style={[styles.clearButtonText, available && styles.clearButtonTextDisabled]}>
          Clear
        </Text>
      </Pressable>
    </View>
  );
}

function ScoreModal({
  court,
  onClose,
  onSubmit,
  setTeamAScore,
  setTeamBScore,
  teamAScore,
  teamBScore,
}) {
  const names = court?.assigned_player_names ?? [];
  const teamA = names.slice(0, 2);
  const teamB = names.slice(2, 4);
  const parsedScoreA = teamAScore.trim() === '' ? null : Number(teamAScore);
  const parsedScoreB = teamBScore.trim() === '' ? null : Number(teamBScore);
  const hasValidPreview =
    Number.isInteger(parsedScoreA) &&
    Number.isInteger(parsedScoreB) &&
    parsedScoreA >= 0 &&
    parsedScoreB >= 0;
  const previewWinner = hasValidPreview ? getWinnerLabel(parsedScoreA, parsedScoreB) : null;
  const teamAWins = previewWinner === 'Team A';
  const teamBWins = previewWinner === 'Team B';

  return (
    <Modal animationType="fade" transparent visible={Boolean(court)} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={35} tint="dark" style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Final Score</Text>
              <Text style={styles.modalSubtitle}>Court {court?.court_number}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color="#FFFFFF" size={20} />
            </Pressable>
          </View>

          <View style={styles.scoreTeams}>
            <View style={[styles.teamBox, teamAWins && styles.teamWinnerBox]}>
              <Trophy color="#E7D773" size={20} />
              <Text style={styles.teamLabel}>Team A</Text>
              {teamAWins ? <Text style={styles.winnerChip}>Winner</Text> : null}
              <Text style={styles.teamNames}>{teamA.join(' / ') || 'Player 1 / Player 2'}</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setTeamAScore}
                placeholder="0"
                placeholderTextColor="#777777"
                style={styles.scoreInput}
                value={teamAScore}
              />
            </View>

            <View style={[styles.teamBox, teamBWins && styles.teamWinnerBox]}>
              <Trophy color="#E7D773" size={20} />
              <Text style={styles.teamLabel}>Team B</Text>
              {teamBWins ? <Text style={styles.winnerChip}>Winner</Text> : null}
              <Text style={styles.teamNames}>{teamB.join(' / ') || 'Player 3 / Player 4'}</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setTeamBScore}
                placeholder="0"
                placeholderTextColor="#777777"
                style={styles.scoreInput}
                value={teamBScore}
              />
            </View>
          </View>

          {previewWinner ? (
            <View style={styles.winnerPreview}>
              <Trophy color="#121212" size={17} />
              <Text style={styles.winnerPreviewText}>
                {previewWinner === 'Draw' ? 'Result: Draw' : `${previewWinner} wins`}
              </Text>
            </View>
          ) : null}

          <Pressable onPress={onSubmit} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Submit Match</Text>
          </Pressable>
        </BlurView>
      </View>
    </Modal>
  );
}

function isCourtAvailable(court) {
  return ['available', 'Available', 'open', 'Open'].includes(court.status);
}

function findNextSkillMatchedGroup(players) {
  const completeGroups = skills
    .map((skill) => {
      const group = players.filter((player) => player.skill_level === skill).slice(0, 4);
      return group.length === 4 ? group : null;
    })
    .filter(Boolean);

  if (!completeGroups.length) return null;

  return completeGroups.sort((firstGroup, secondGroup) => {
    const firstCompletedAt = new Date(firstGroup[3].created_at).getTime();
    const secondCompletedAt = new Date(secondGroup[3].created_at).getTime();

    if (firstCompletedAt !== secondCompletedAt) {
      return firstCompletedAt - secondCompletedAt;
    }

    return skills.indexOf(firstGroup[0].skill_level) - skills.indexOf(secondGroup[0].skill_level);
  })[0];
}

function getCountdown(court, now) {
  if (!court.match_started_at) return `${court.match_duration_minutes ?? matchDurationMinutes}:00`;

  const startedAt = new Date(court.match_started_at).getTime();
  const durationMs = (court.match_duration_minutes ?? matchDurationMinutes) * 60 * 1000;
  const remainingMs = Math.max(0, startedAt + durationMs - now);
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function randomDurationMinutes() {
  return matchDurationMinutes;
}

function getWinnerLabel(scoreA, scoreB) {
  if (scoreA === scoreB) return 'Draw';
  return scoreA > scoreB ? 'Team A' : 'Team B';
}

function toLocalDateString(isoString) {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createLocalUuid() {
  if (global.crypto?.randomUUID) return global.crypto.randomUUID();
  return `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
}

function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (error?.message) return String(error.message);
  return 'Please check your Supabase connection and try again.';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  glowGold: {
    backgroundColor: 'rgba(231,215,115,0.14)',
    borderRadius: 120,
    height: 240,
    position: 'absolute',
    right: -120,
    top: 80,
    width: 240,
  },
  glowGreen: {
    backgroundColor: 'rgba(31,198,86,0.1)',
    borderRadius: 110,
    bottom: 160,
    height: 220,
    left: -130,
    position: 'absolute',
    width: 220,
  },
  content: {
    gap: 16,
    paddingHorizontal: 22,
    paddingBottom: 110,
    paddingTop: 22,
  },
  bookBackgroundShuttle: {
    top: 112,
  },
  title: {
    color: '#F5F5F5',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8,
  },
  notice: {
    backgroundColor: 'rgba(231,215,115,0.12)',
    borderColor: 'rgba(231,215,115,0.26)',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: {
    color: '#E7D773',
    fontSize: 13,
    fontWeight: '700',
  },
  glassPanel: {
    backgroundColor: 'rgba(33,33,33,0.74)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  courtHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  courtHint: {
    color: '#C9C9C9',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  historyButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(231,215,115,0.12)',
    borderColor: 'rgba(231,215,115,0.28)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  historyButtonText: {
    color: '#E7D773',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
  counter: {
    color: '#C9C9C9',
    fontSize: 15,
    fontWeight: '900',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 18,
    minHeight: 64,
    paddingHorizontal: 16,
  },
  skillRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },
  skillButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 17,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
  },
  skillButtonActive: {
    backgroundColor: '#E7D773',
  },
  skillText: {
    color: '#D0D0D0',
    fontSize: 18,
    fontWeight: '900',
  },
  skillTextActive: {
    color: '#121212',
  },
  joinButton: {
    marginTop: 16,
    minHeight: 64,
  },
  joinButtonDisabled: {
    opacity: 0.72,
  },
  joinButtonText: {
    color: '#121212',
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
  },
  emptyText: {
    color: '#B8B8B8',
    fontSize: 14,
    paddingVertical: 10,
  },
  queueRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 13,
    marginTop: 10,
    minHeight: 76,
    paddingHorizontal: 14,
  },
  rankBubble: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  queueCopy: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '900',
  },
  playerMeta: {
    color: '#C8C8C8',
    fontSize: 16,
    marginTop: 3,
  },
  waitBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 10,
  },
  waitBadgeText: {
    color: '#F2F2F2',
    fontSize: 14,
    fontWeight: '900',
  },
  queueActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteQueueButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,139,150,0.13)',
    borderColor: 'rgba(255,139,150,0.28)',
    borderRadius: 17,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  deleteQueueButtonDisabled: {
    opacity: 0.62,
  },
  courtRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    minHeight: 78,
    padding: 14,
  },
  courtLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    paddingRight: 10,
  },
  courtCopy: {
    flex: 1,
  },
  statusDot: {
    borderRadius: 12,
    height: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 12,
    width: 24,
  },
  availableDot: {
    backgroundColor: '#20D66B',
    shadowColor: '#20D66B',
  },
  occupiedDot: {
    backgroundColor: '#E01E37',
    shadowColor: '#E01E37',
  },
  courtName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  courtStatus: {
    color: '#C8C8C8',
    fontSize: 15,
    marginTop: 3,
  },
  timerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 5,
  },
  timerText: {
    color: '#E7D773',
    fontSize: 12,
    fontWeight: '900',
  },
  clearButton: {
    alignItems: 'center',
    backgroundColor: '#E7D773',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 13,
  },
  clearButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  clearButtonText: {
    color: '#121212',
    fontSize: 15,
    fontWeight: '900',
  },
  clearButtonTextDisabled: {
    color: '#777777',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.68)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: 'rgba(33,33,33,0.9)',
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: '#B8B8B8',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  scoreTeams: {
    gap: 12,
  },
  teamBox: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  teamWinnerBox: {
    backgroundColor: 'rgba(231,215,115,0.12)',
    borderColor: 'rgba(231,215,115,0.42)',
  },
  teamLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  winnerChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#E7D773',
    borderRadius: 999,
    color: '#121212',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  teamNames: {
    color: '#C8C8C8',
    fontSize: 14,
    marginTop: 4,
  },
  scoreInput: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 10,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  winnerPreview: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E7D773',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  winnerPreviewText: {
    color: '#121212',
    fontSize: 13,
    fontWeight: '900',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#E7D773',
    borderRadius: 18,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 54,
  },
  submitButtonText: {
    color: '#121212',
    fontSize: 17,
    fontWeight: '900',
  },
});

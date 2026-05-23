import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { CalendarDays, Clock3, Trash2, Trophy } from 'lucide-react-native';

import { isSupabaseConfigured, supabase } from '../supabase/supabaseConfig';
import AnimatedActionButton from './AnimatedActionButton';
import BackgroundShuttle from './BackgroundShuttle';

const demoHistory = [
  {
    id: 'demo-history-1',
    court_number: 1,
    team_a_players: ['Al', 'Khyle'],
    team_b_players: ['Janna', 'Nicole'],
    team_a_score: 21,
    team_b_score: 18,
    winner: 'Team A',
    match_date: toLocalDateString(new Date().toISOString()),
    match_started_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    match_ended_at: new Date().toISOString(),
    played_at: new Date().toISOString(),
  },
];

export default function MatchHistoryScreen({ navigation }) {
  const channelNameRef = useRef(`match-history-live-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [matches, setMatches] = useState(isSupabaseConfigured ? [] : demoHistory);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [deletingId, setDeletingId] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('match_history')
        .select(
          'id,court_id,court_number,team_a_players,team_b_players,team_a_score,team_b_score,winner,match_date,match_started_at,match_ended_at,played_at'
        )
        .order('played_at', { ascending: false });

      if (error) throw error;
      setMatches(data ?? []);
    } catch (error) {
      Alert.alert('Could not load history', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_history' },
        () => void fetchHistory()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchHistory]);

  function confirmDeleteMatch(match) {
    Alert.alert(
      'Delete match?',
      `Remove Court ${match.court_number ?? match.court_id} from Match History?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteMatch(match.id),
        },
      ]
    );
  }

  async function deleteMatch(matchId) {
    setDeletingId(matchId);

    try {
      if (!supabase) {
        setMatches((current) => current.filter((match) => match.id !== matchId));
        return;
      }

      const { error } = await supabase
        .from('match_history')
        .delete()
        .eq('id', matchId);

      if (error) throw error;

      setMatches((current) => current.filter((match) => match.id !== matchId));
    } catch (error) {
      Alert.alert('Could not delete match', getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.glowGold} />
      <View style={styles.glowGreen} />
      <BackgroundShuttle style={styles.historyBackgroundShuttle} />

      <FlatList
        contentContainerStyle={styles.content}
        data={matches}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <MatchHistoryLogo size={52} />

              <View style={styles.headerCopy}>
                <Text style={styles.title}>Match History</Text>
                <Text style={styles.subtitle}>Real-time calendar results</Text>
              </View>
            </View>

            {!isSupabaseConfigured ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>Demo mode: connect Supabase to show live history.</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <BlurView intensity={22} tint="dark" style={styles.emptyCard}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#E7D773" />
                <Text style={styles.emptyText}>Loading match history...</Text>
              </View>
            ) : (
              <Text style={styles.emptyText}>No completed matches yet.</Text>
            )}
          </BlurView>
        }
        renderItem={({ item }) => (
          <MatchCard
            deleting={deletingId === item.id}
            item={item}
            onDelete={() => confirmDeleteMatch(item)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

export function MatchHistoryTabIcon({ color, focused, size = 24 }) {
  return (
    <MatchHistoryLogo
      active={focused}
      color={color}
      size={Math.max(26, size + 6)}
      tabMode
    />
  );
}

function MatchHistoryLogo({ active = true, color = '#E7D773', size = 52, tabMode = false }) {
  const shellSize = size;
  const cardWidth = shellSize * 0.62;
  const cardHeight = shellSize * 0.72;
  const lineWidth = cardWidth * 0.52;
  const accentColor = active ? color : '#AFAFAF';

  return (
    <View
      style={[
        styles.logoShell,
        {
          borderColor: active ? 'rgba(231,215,115,0.42)' : 'rgba(255,255,255,0.18)',
          height: shellSize,
          width: shellSize,
        },
        tabMode && styles.logoShellTab,
      ]}
    >
      <View
        style={[
          styles.logoCard,
          {
            borderColor: accentColor,
            height: cardHeight,
            width: cardWidth,
          },
        ]}
      >
        <View style={[styles.logoHeaderLine, { backgroundColor: accentColor, width: lineWidth }]} />
        <View style={[styles.logoScoreLine, { backgroundColor: accentColor, width: lineWidth * 0.8 }]} />
        <View style={[styles.logoScoreLine, { backgroundColor: accentColor, width: lineWidth * 0.58 }]} />
      </View>
      <View
        style={[
          styles.logoClock,
          {
            borderColor: accentColor,
            height: shellSize * 0.34,
            width: shellSize * 0.34,
          },
        ]}
      >
        <View style={[styles.logoClockHandTall, { backgroundColor: accentColor }]} />
        <View style={[styles.logoClockHandWide, { backgroundColor: accentColor }]} />
      </View>
    </View>
  );
}

function MatchCard({ deleting, item, onDelete }) {
  const winner = item.winner ?? getWinnerLabel(item.team_a_score, item.team_b_score);
  const teamAWins = winner === 'Team A';
  const teamBWins = winner === 'Team B';

  return (
    <BlurView intensity={24} tint="dark" style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <View>
          <Text style={styles.courtLabel}>Court {item.court_number ?? item.court_id}</Text>
          <View style={styles.dateRow}>
            <CalendarDays color="#E7D773" size={14} />
            <Text style={styles.dateText}>{item.match_date ?? toLocalDateString(item.played_at)}</Text>
          </View>
        </View>

        <View style={styles.actionColumn}>
          <View style={styles.winnerBadge}>
            <Trophy color="#121212" size={16} />
            <Text style={styles.winnerBadgeText}>{winner}</Text>
          </View>

          <AnimatedActionButton
            compact
            disabled={deleting}
            onPress={onDelete}
            reflect={false}
            variant="danger"
          >
            {deleting ? (
              <ActivityIndicator color="#FF8B96" size="small" />
            ) : (
              <Trash2 color="#FFFFFF" size={16} />
            )}
            <Text style={styles.deleteButtonText}>Delete</Text>
          </AnimatedActionButton>
        </View>
      </View>

      <View style={styles.scoreBoard}>
        <TeamScore
          label="Team A"
          names={item.team_a_players}
          score={item.team_a_score}
          winner={teamAWins}
        />
        <TeamScore
          label="Team B"
          names={item.team_b_players}
          score={item.team_b_score}
          winner={teamBWins}
        />
      </View>

      <View style={styles.timePanel}>
        <View style={styles.timeRow}>
          <Clock3 color="#E7D773" size={14} />
          <Text style={styles.timeLabel}>Started</Text>
          <Text style={styles.timeValue}>{formatTimestamp(item.match_started_at)}</Text>
        </View>
        <View style={styles.timeRow}>
          <Clock3 color="#E7D773" size={14} />
          <Text style={styles.timeLabel}>Ended</Text>
          <Text style={styles.timeValue}>{formatTimestamp(item.match_ended_at)}</Text>
        </View>
      </View>
    </BlurView>
  );
}

function TeamScore({ label, names = [], score, winner }) {
  return (
    <View style={[styles.teamRow, winner && styles.teamWinnerRow]}>
      <View style={styles.teamCopy}>
        <Text style={styles.teamLabel}>{label}</Text>
        <Text style={styles.teamNames}>{names.join(' / ') || 'Players unavailable'}</Text>
      </View>
      <Text style={styles.scoreText}>{score}</Text>
    </View>
  );
}

function getWinnerLabel(scoreA, scoreB) {
  if (scoreA === scoreB) return 'Draw';
  return scoreA > scoreB ? 'Team A' : 'Team B';
}

function toLocalDateString(isoString) {
  const date = isoString ? new Date(isoString) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimestamp(value) {
  if (!value) return 'Not recorded';

  const date = new Date(value);
  const datePart = toLocalDateString(value);
  const timePart = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return `${datePart} ${timePart}`;
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
    right: -130,
    top: 70,
    width: 240,
  },
  glowGreen: {
    backgroundColor: 'rgba(31,198,86,0.1)',
    borderRadius: 115,
    bottom: 110,
    height: 230,
    left: -140,
    position: 'absolute',
    width: 230,
  },
  content: {
    gap: 14,
    paddingBottom: 112,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  historyBackgroundShuttle: {
    top: 112,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  logoShell: {
    alignItems: 'center',
    backgroundColor: 'rgba(231,215,115,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'visible',
  },
  logoShellTab: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  logoCard: {
    backgroundColor: 'rgba(33,33,33,0.9)',
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    paddingLeft: 5,
  },
  logoHeaderLine: {
    borderRadius: 999,
    height: 3,
    marginBottom: 5,
  },
  logoScoreLine: {
    borderRadius: 999,
    height: 2,
    marginTop: 3,
    opacity: 0.82,
  },
  logoClock: {
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 999,
    borderWidth: 2,
    bottom: 7,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
  },
  logoClockHandTall: {
    borderRadius: 999,
    height: 7,
    position: 'absolute',
    width: 2,
  },
  logoClockHandWide: {
    borderRadius: 999,
    height: 2,
    right: 4,
    top: 8,
    position: 'absolute',
    width: 7,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: '#BDBDBD',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  notice: {
    backgroundColor: 'rgba(231,215,115,0.12)',
    borderColor: 'rgba(231,215,115,0.26)',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12,
  },
  noticeText: {
    color: '#E7D773',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: 'rgba(33,33,33,0.74)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  emptyText: {
    color: '#B8B8B8',
    fontSize: 14,
    fontWeight: '700',
  },
  matchCard: {
    backgroundColor: 'rgba(33,33,33,0.74)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    padding: 18,
  },
  matchHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionColumn: {
    alignItems: 'flex-end',
    gap: 9,
  },
  courtLabel: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  dateText: {
    color: '#C8C8C8',
    fontSize: 13,
    fontWeight: '800',
  },
  winnerBadge: {
    alignItems: 'center',
    backgroundColor: '#E7D773',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  winnerBadgeText: {
    color: '#121212',
    fontSize: 12,
    fontWeight: '900',
  },
  deleteButtonDisabled: {
    opacity: 0.65,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  scoreBoard: {
    gap: 10,
    marginTop: 16,
  },
  teamRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 70,
    paddingHorizontal: 14,
  },
  teamWinnerRow: {
    backgroundColor: 'rgba(231,215,115,0.12)',
    borderColor: 'rgba(231,215,115,0.42)',
  },
  teamCopy: {
    flex: 1,
    paddingRight: 10,
  },
  teamLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  teamNames: {
    color: '#C8C8C8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  scoreText: {
    color: '#E7D773',
    fontSize: 28,
    fontWeight: '900',
  },
  timePanel: {
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderRadius: 18,
    gap: 8,
    marginTop: 14,
    padding: 12,
  },
  timeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timeLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    width: 52,
  },
  timeValue: {
    color: '#C8C8C8',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
});

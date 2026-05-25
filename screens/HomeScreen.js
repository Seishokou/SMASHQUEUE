import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useIsFocused } from '@react-navigation/native';
import { Clock3, Flame, UsersRound } from 'lucide-react-native';

import BackgroundShuttle from './BackgroundShuttle';

const sampleCourts = [
  { id: 1, court_number: 1, status: 'available', active_players: [] },
  { id: 2, court_number: 2, status: 'available', active_players: [] },
  { id: 3, court_number: 3, status: 'available', active_players: [] },
  { id: 4, court_number: 4, status: 'available', active_players: [] },
];

export default function HomeScreen({ smashQueueData }) {
  const isFocused = useIsFocused();
  const { courts: liveCourts = [], queue = [] } = smashQueueData ?? {};
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isFocused) return undefined;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isFocused]);

  const waitingPlayers = useMemo(
    () => queue.filter((entry) => entry.status === 'waiting' || entry.player?.current_status === 'waiting'),
    [queue]
  );

  const waitingPlayersCount = waitingPlayers.length;
  const currentWaitTime =
    waitingPlayersCount >= 4 ? `${Math.floor(waitingPlayersCount / 4) * 20} min` : '0 min';
  const courts = liveCourts.length ? getOrderedCourts(liveCourts) : sampleCourts;
  const openCourts = courts.filter((court) => isCourtAvailable(court)).length;
  const firstAvailableCourt = courts.find((court) => isCourtAvailable(court));
  const nextUpNames = waitingPlayers.slice(0, 4).map(getQueuePlayerName);
  const nextUpReady = nextUpNames.length >= 4;
  const waitingAfterNextGroup = Math.max(0, waitingPlayersCount - 4);
  const nextUpText = getNextUpText(nextUpNames);
  const nextUpMeta = getNextUpMeta({
    firstAvailableCourt,
    nextUpReady,
    openCourts,
    waitingAfterNextGroup,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.glowGold} />
      <View style={styles.glowGreen} />
      <BackgroundShuttle />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SmashQ</Text>
          <Text style={styles.title}>Dashboard</Text>
        </View>

        <View style={styles.metricsRow}>
          <GlassCard style={styles.metricCard}>
            <Clock3 color="#8EC5FF" size={28} />
            <Text style={styles.metricValue}>{currentWaitTime}</Text>
            <Text style={styles.muted}>Current wait time</Text>
          </GlassCard>

          <GlassCard style={styles.metricCard}>
            <UsersRound color="#E7D773" size={28} />
            <Text style={styles.metricValue}>{waitingPlayersCount}</Text>
            <Text style={styles.muted}>Players waiting</Text>
          </GlassCard>
        </View>

        <BlurView intensity={28} tint="dark" style={styles.nextUpCard}>
          <View style={styles.nextUpHeader}>
            <View style={styles.nextUpIcon}>
              <Flame color="#121212" fill="#E7D773" size={18} />
            </View>
            <Text style={styles.nextUpTitle}>NEXT UP</Text>
          </View>
          <Text style={styles.nextUpMeta}>{nextUpMeta}</Text>
          <Text style={styles.nextUpText}>{nextUpText}</Text>
        </BlurView>

        <GlassCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Courts</Text>
            <Text style={styles.muted}>{openCourts} open</Text>
          </View>

          {courts.map((court) => {
            const isOpen = isCourtAvailable(court);
            const activePlayers = getCourtPlayers(court);
            const activeLabel = getCourtRightLabel(court, activePlayers, now);
            return (
              <View key={court.id || court.court_number} style={styles.courtRow}>
                <View style={styles.courtLeft}>
                  <View style={[styles.statusDot, isOpen ? styles.openDot : styles.playingDot]} />
                  <View style={styles.courtCopy}>
                    <Text style={styles.courtName}>Court {court.court_number}</Text>
                    <Text style={styles.courtSubText} numberOfLines={1}>
                      {isOpen ? 'Ready for next group' : activePlayers.join(', ') || 'Match in progress'}
                    </Text>
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.statusText, isOpen ? styles.openText : styles.playingText]}
                >
                  {isOpen ? 'Available' : activeLabel}
                </Text>
              </View>
            );
          })}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function isCourtAvailable(court) {
  return ['available', 'open', 'Available'].includes(court.status);
}

function getOrderedCourts(courts) {
  const byCourtNumber = new Map(courts.map((court) => [court.court_number, court]));
  return [1, 2, 3, 4].map((courtNumber) => (
    byCourtNumber.get(courtNumber) ?? {
      id: courtNumber,
      court_number: courtNumber,
      status: 'Available',
      active_players: [],
    }
  ));
}

function getQueuePlayerName(entry) {
  return entry.player_name || entry.player?.name || 'Player';
}

function getNextUpText(nextUpNames) {
  if (nextUpNames.length >= 4) return nextUpNames.join(', ');

  if (nextUpNames.length > 0) {
    const missingCount = 4 - nextUpNames.length;
    const playerWord = missingCount === 1 ? 'player' : 'players';
    return `${nextUpNames.join(', ')} waiting for ${missingCount} more ${playerWord}...`;
  }

  return 'No players are waiting right now.';
}

function getNextUpMeta({ firstAvailableCourt, nextUpReady, openCourts, waitingAfterNextGroup }) {
  if (!nextUpReady) return 'Need 4 waiting players to form the next doubles match';

  const waitingSuffix =
    waitingAfterNextGroup > 0
      ? ` - ${waitingAfterNextGroup} still waiting after this group`
      : '';

  if (firstAvailableCourt) {
    return `Ready for Court ${firstAvailableCourt.court_number}${waitingSuffix}`;
  }

  if (openCourts === 0) {
    return `All courts occupied - waiting for the next cleared court${waitingSuffix}`;
  }

  return `Ready for the next available court${waitingSuffix}`;
}

function getCourtPlayers(court) {
  return court.assigned_player_names?.length ? court.assigned_player_names : court.active_players ?? [];
}

function getCourtRightLabel(court, activePlayers, now) {
  if (court.match_started_at) return formatActiveDuration(court.match_started_at, now);
  return activePlayers.length ? activePlayers.join(', ') : 'Occupied';
}

function formatActiveDuration(startedAt, now) {
  const elapsedMs = Math.max(0, now - new Date(startedAt).getTime());
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function GlassCard({ children, style }) {
  return (
    <BlurView intensity={26} tint="dark" style={[styles.glassCard, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  glowGold: {
    backgroundColor: 'rgba(231,215,115,0.13)',
    borderRadius: 120,
    height: 240,
    position: 'absolute',
    right: -120,
    top: 86,
    width: 240,
  },
  glowGreen: {
    backgroundColor: 'rgba(31,198,86,0.09)',
    borderRadius: 110,
    bottom: 150,
    height: 220,
    left: -130,
    position: 'absolute',
    width: 220,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 112,
  },
  header: {
    gap: 4,
    paddingTop: 8,
  },
  eyebrow: {
    color: '#9D9D9D',
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: '#F5F5F5',
    fontSize: 31,
    fontWeight: '900',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  glassCard: {
    backgroundColor: 'rgba(33,33,33,0.62)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
  metricCard: {
    flex: 1,
    minHeight: 138,
    justifyContent: 'space-between',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  muted: {
    color: '#B8B8B8',
    fontSize: 13,
    fontWeight: '600',
  },
  nextUpCard: {
    backgroundColor: 'rgba(231,215,115,0.1)',
    borderColor: '#E7D773',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
  nextUpHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginBottom: 8,
  },
  nextUpIcon: {
    alignItems: 'center',
    backgroundColor: '#E7D773',
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  nextUpTitle: {
    color: '#E7D773',
    fontSize: 15,
    fontWeight: '900',
  },
  nextUpMeta: {
    color: '#D6CC85',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
    marginBottom: 8,
  },
  nextUpText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#F4F4F4',
    fontSize: 20,
    fontWeight: '900',
  },
  courtRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  courtLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingRight: 10,
  },
  courtCopy: {
    flex: 1,
  },
  statusDot: {
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  openDot: {
    backgroundColor: '#19C653',
  },
  playingDot: {
    backgroundColor: '#E01E37',
  },
  courtName: {
    color: '#F1F1F1',
    fontSize: 15,
    fontWeight: '800',
  },
  courtSubText: {
    color: '#AFAFAF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '900',
    maxWidth: 128,
    textAlign: 'right',
  },
  openText: {
    color: '#6DEF91',
  },
  playingText: {
    color: '#E7D773',
  },
});

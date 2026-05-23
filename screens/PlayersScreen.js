import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Search } from 'lucide-react-native';
import BackgroundShuttle from './BackgroundShuttle';

const samplePlayers = [
  { id: '1', name: 'Player X', skill_level: 'Int', current_status: 'playing' },
  { id: '2', name: 'Player Y', skill_level: 'Beg', current_status: 'waiting' },
  { id: '3', name: 'Player Z', skill_level: 'Adv', current_status: 'waiting' },
  { id: '4', name: 'Player W', skill_level: 'Int', current_status: 'idle' },
];

export default function PlayersScreen({ players = samplePlayers }) {
  const [search, setSearch] = useState('');

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return players;

    return players.filter((player) => {
      const name = player.name ?? player.player_name ?? '';
      const status = player.current_status ?? player.status ?? '';
      const skill = player.skill_level ?? '';
      const joinedAt = player.joined_at ? formatJoinedDateTime(player.joined_at) : '';
      return `${name} ${status} ${skill} ${joinedAt}`.toLowerCase().includes(query);
    });
  }, [players, search]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.glowGold} />
      <View style={styles.glowGreen} />
      <BackgroundShuttle />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>All Players</Text>
          <Text style={styles.muted}>{players.length} joined queue</Text>
        </View>

        <BlurView intensity={24} tint="dark" style={styles.searchBox}>
          <Search color="#AFAFAF" size={18} />
          <TextInput
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor="#8D8D8D"
            style={styles.searchInput}
            value={search}
          />
        </BlurView>

        <BlurView intensity={26} tint="dark" style={styles.glassPanel}>
          {filteredPlayers.length ? (
            filteredPlayers.map((player) => {
              const playerName = player.name ?? player.player_name ?? 'Player';
              const status = player.current_status ?? player.status ?? 'waiting';
              return (
                <View key={player.id || `${playerName}-${player.joined_at}`} style={styles.playerRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{playerName.charAt(0).toUpperCase()}</Text>
                  </View>

                  <View style={styles.playerCopy}>
                    <Text style={styles.playerName}>{playerName}</Text>
                    <View style={styles.playerMetaRow}>
                      <Text style={[styles.statusText, statusStyle(status)]}>{formatStatus(status)}</Text>
                      {player.joined_at ? (
                        <Text style={styles.joinedText}>Joined {formatJoinedDateTime(player.joined_at)}</Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={[styles.badge, badgeStyle(player.skill_level)]}>
                    <Text style={styles.badgeText}>{player.skill_level}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No players found.</Text>
          )}
        </BlurView>
      </ScrollView>
    </SafeAreaView>
  );
}

function badgeStyle(skill) {
  if (skill === 'Adv') return styles.advancedBadge;
  if (skill === 'Int') return styles.intermediateBadge;
  return styles.beginnerBadge;
}

function statusStyle(status) {
  if (status === 'playing') return styles.playingStatus;
  if (status === 'done') return styles.doneStatus;
  return styles.waitingStatus;
}

function formatStatus(status) {
  if (status === 'done') return 'Done';
  if (status === 'playing') return 'Playing';
  return 'Waiting';
}

function formatJoinedDateTime(value) {
  const date = new Date(value);
  const datePart = date.toLocaleDateString([], {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${datePart} - ${timePart}`;
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
    right: -130,
    top: 90,
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
  title: {
    color: '#F5F5F5',
    fontSize: 31,
    fontWeight: '900',
  },
  muted: {
    color: '#B8B8B8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(33,33,33,0.62)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 50,
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  searchInput: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 16,
  },
  glassPanel: {
    backgroundColor: 'rgba(33,33,33,0.64)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 10,
  },
  playerRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    marginVertical: 5,
    minHeight: 68,
    padding: 10,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#8EC5FF',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 23,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  avatarText: {
    color: '#13243A',
    fontSize: 18,
    fontWeight: '900',
  },
  playerCopy: {
    flex: 1,
  },
  playerName: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '900',
  },
  playerMetaRow: {
    gap: 4,
    marginTop: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  waitingStatus: {
    color: '#E7D773',
  },
  playingStatus: {
    color: '#FF8B96',
  },
  doneStatus: {
    color: '#8EC5FF',
  },
  joinedText: {
    color: '#929292',
    fontSize: 11,
    fontWeight: '700',
  },
  badge: {
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  beginnerBadge: {
    backgroundColor: 'rgba(25,198,83,0.22)',
  },
  intermediateBadge: {
    backgroundColor: 'rgba(142,197,255,0.24)',
  },
  advancedBadge: {
    backgroundColor: 'rgba(231,215,115,0.24)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  emptyText: {
    color: '#B8B8B8',
    fontSize: 14,
    fontWeight: '700',
    padding: 12,
  },
});

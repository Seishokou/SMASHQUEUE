import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { Lock, LogOut, Pencil, UserRound } from 'lucide-react-native';

import { supabase } from '../supabase/supabaseConfig';
import AnimatedActionButton from './AnimatedActionButton';

const genderOptions = ['Male', 'Female', 'Other'];

export default function ProfileScreen({ navigation, user }) {
  const metadata = user?.user_metadata ?? {};
  const displayName = metadata.name || metadata.display_name || user?.email || 'Guest Player';
  const [avatarUri, setAvatarUri] = useState(metadata.avatar_url || metadata.avatar_uri || '');
  const [phoneNumber, setPhoneNumber] = useState(metadata.phone_number || '');
  const [dateOfBirth, setDateOfBirth] = useState(metadata.date_of_birth || '');
  const [gender, setGender] = useState(metadata.gender || 'Other');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAvatarUri(metadata.avatar_url || metadata.avatar_uri || '');
    setPhoneNumber(metadata.phone_number || '');
    setDateOfBirth(metadata.date_of_birth || '');
    setGender(metadata.gender || 'Other');
  }, [metadata.avatar_url, metadata.avatar_uri, metadata.date_of_birth, metadata.gender, metadata.phone_number]);

  const email = user?.email || 'Not signed in';
  const canUpdate = Boolean(user && supabase);

  const avatarInitial = useMemo(() => {
    const source = displayName || email || 'S';
    return source.charAt(0).toUpperCase();
  }, [displayName, email]);

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Gallery permission needed', 'Allow photo access so you can choose a profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const nextUri = result.assets[0].uri;
    setAvatarUri(nextUri);

    if (canUpdate) {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          avatar_uri: nextUri,
        },
      });

      if (error) {
        Alert.alert('Avatar selected locally', 'The image is showing now, but Supabase did not save it.');
      }
    }
  }

  async function updateProfile() {
    if (!canUpdate) {
      Alert.alert('Sign in required', 'Sign in before updating your profile.');
      return;
    }

    if (dateOfBirth.trim() && !isValidDateInput(dateOfBirth.trim())) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format for Date of Birth.');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          avatar_uri: avatarUri || null,
          phone_number: phoneNumber.trim(),
          date_of_birth: dateOfBirth.trim(),
          gender,
        },
      });

      if (error) throw error;

      Alert.alert('Profile updated', 'Your profile details were saved.');
    } catch (error) {
      Alert.alert('Could not update profile', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BlurView intensity={28} tint="dark" style={styles.card}>
          <Pressable style={styles.avatarButton} onPress={pickAvatar}>
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <>
                  <UserRound color="#FFFFFF" size={38} />
                  <Text style={styles.avatarInitial}>{avatarInitial}</Text>
                </>
              )}
            </View>
            <View style={styles.editBadge}>
              <Pencil color="#121212" size={15} strokeWidth={2.6} />
            </View>
          </Pressable>

          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.muted}>{email}</Text>

          <View style={styles.statsRow}>
            <Stat label="Skill" value="Int" />
            <Stat label="Matches" value="12" />
            <Stat label="Status" value="Ready" />
          </View>

          <BlurView intensity={20} tint="dark" style={styles.formCard}>
            <ProfileInput
              editable={false}
              icon={<Lock color="#E7D773" size={16} />}
              label="Email"
              value={email}
            />

            <ProfileInput
              keyboardType="phone-pad"
              label="Phone Number"
              onChangeText={setPhoneNumber}
              placeholder="09XXXXXXXXX"
              value={phoneNumber}
            />

            <ProfileInput
              keyboardType="numbers-and-punctuation"
              label="Date of Birth"
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD"
              value={dateOfBirth}
            />

            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.segmentRow}>
              {genderOptions.map((option) => {
                const selected = gender === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setGender(option)}
                    style={[styles.segmentButton, selected && styles.segmentButtonActive]}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </BlurView>

          <AnimatedActionButton
            disabled={saving || !user}
            onPress={updateProfile}
            style={styles.updateButton}
            variant="gold"
          >
            {saving ? (
              <ActivityIndicator color="#121212" />
            ) : (
              <Text style={styles.updateButtonText}>Update Profile</Text>
            )}
          </AnimatedActionButton>

          {user ? (
            <AnimatedActionButton
              onPress={() => supabase?.auth.signOut()}
              reflect={false}
              style={styles.signOutButton}
              variant="gold"
            >
              <LogOut color="#121212" size={18} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </AnimatedActionButton>
          ) : (
            <>
              <Pressable style={styles.signOutButton} onPress={() => navigation?.navigate?.('Login')}>
                <Text style={styles.signOutText}>Sign In</Text>
              </Pressable>
              <Pressable style={styles.createButton} onPress={() => navigation?.navigate?.('Register')}>
                <Text style={styles.createButtonText}>Create Account</Text>
              </Pressable>
            </>
          )}
        </BlurView>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileInput({ icon, label, style, ...props }) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.labelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {icon}
      </View>
      <TextInput
        editable={props.editable}
        placeholderTextColor="#777777"
        style={[styles.input, props.editable === false && styles.lockedInput, style]}
        {...props}
      />
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function isValidDateInput(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
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
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 112,
    paddingTop: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(33,33,33,0.68)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 24,
  },
  avatarButton: {
    marginBottom: 16,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 48,
    borderWidth: 1,
    height: 96,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 96,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarInitial: {
    color: 'rgba(255,255,255,0.22)',
    fontSize: 16,
    fontWeight: '900',
    marginTop: -8,
  },
  editBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(231,215,115,0.9)',
    borderColor: 'rgba(18,18,18,0.55)',
    borderRadius: 16,
    borderWidth: 2,
    bottom: 1,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 32,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  muted: {
    color: '#B8B8B8',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 22,
    width: '100%',
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    flex: 1,
    minHeight: 74,
    justifyContent: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    color: '#AFAFAF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: 'rgba(33,33,33,0.76)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 14,
    width: '100%',
  },
  fieldBlock: {
    marginBottom: 13,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  inputLabel: {
    color: '#E7D773',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  lockedInput: {
    color: '#AFAFAF',
    opacity: 0.9,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  segmentButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  segmentButtonActive: {
    backgroundColor: '#E7D773',
    borderColor: '#E7D773',
  },
  segmentText: {
    color: '#CFCFCF',
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#121212',
  },
  updateButton: {
    marginTop: 16,
    minHeight: 52,
  },
  updateButtonText: {
    color: '#121212',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  signOutButton: {
    marginTop: 10,
    minHeight: 52,
  },
  signOutText: {
    color: '#121212',
    fontSize: 15,
    fontWeight: '900',
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: '#E7D773',
    borderRadius: 18,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 52,
    width: '100%',
  },
  createButtonText: {
    color: '#121212',
    fontSize: 15,
    fontWeight: '900',
  },
});

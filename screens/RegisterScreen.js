import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View, } from 'react-native';
import { BlurView } from 'expo-blur';
import { Eye, UserRound } from 'lucide-react-native';
import { supabase } from '../supabase/supabaseConfig';
import AnimatedActionButton from './AnimatedActionButton';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!supabase) {
      Alert.alert('Supabase is not configured', 'Add your Supabase URL and anon key to .env first.');
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      Alert.alert('Missing details', 'Enter your name, email, and password before signing up.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Supabase requires at least 6 characters for email sign up.');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name: cleanName, display_name: cleanName },
        },
      });

      if (error) {
        Alert.alert('Sign up failed', getAuthErrorMessage(error));
        return;
      }

      if (data.session) {
        await supabase.auth.signOut();
      }

      setName('');
      setEmail('');
      setPassword('');
      setShowPassword(false);

      Alert.alert(
        'Successfully created',
        'Your account was created. Please sign in with the same email and password.',
        [{ text: 'OK', onPress: () => navigation?.navigate?.('Login') }]
      );
    } catch (error) {
      Alert.alert('Sign up failed', getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!supabase) {
      Alert.alert('Supabase is not configured', 'Add your Supabase URL and anon key to .env first.');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      Alert.alert('Google sign in failed', error.message);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <BlurView intensity={28} tint="dark" style={styles.card}>
          <View style={styles.iconCircle}>
            <UserRound color="#FFFFFF" size={44} />
          </View>

          <Text style={styles.title}>Create Your Account</Text>

          <BlurInput
            autoCapitalize="words"
            autoComplete="name"
            placeholder="Name"
            textContentType="name"
            value={name}
            onChangeText={setName}
          />
          <BlurInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Email"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <BlurInput
            autoCapitalize="none"
            autoComplete="new-password"
            placeholder="Password"
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            value={password}
            onChangeText={setPassword}
          />

          <Pressable style={styles.showPasswordRow} onPress={() => setShowPassword((value) => !value)}>
            <View style={[styles.checkbox, showPassword && styles.checkboxActive]}>
              {showPassword ? <Eye color="#121212" size={13} /> : null}
            </View>
            <Text style={styles.muted}>Show Password</Text>
          </Pressable>

          <AnimatedActionButton
            disabled={loading}
            onPress={handleSignUp}
            variant="gold"
          >
            {loading ? (
              <ActivityIndicator color="#121212" />
            ) : (
              <Text style={styles.primaryText}>Sign Up</Text>
            )}
          </AnimatedActionButton>

          <Pressable style={styles.googleButton} onPress={handleGoogleSignIn}>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>Sign in with Google</Text>
          </Pressable>

          <Pressable onPress={() => navigation?.navigate?.('Login')}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.footerLink}>Sign In</Text>
            </Text>
          </Pressable>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

function getAuthErrorMessage(error) {
  const message = error?.message ?? 'Please check your sign-up details.';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('already registered') || lowerMessage.includes('already exists')) {
    return 'This email already has a Supabase account. Go back to Sign In and use that account password.';
  }

  return message;
}

function BlurInput(props) {
  return (
    <BlurView intensity={18} tint="dark" style={styles.inputWrap}>
      <TextInput placeholderTextColor="#8C8C8C" style={styles.input} {...props} />
    </BlurView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(33,33,33,0.68)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 26,
  },
  iconCircle: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 37,
    borderWidth: 2,
    height: 74,
    justifyContent: 'center',
    marginBottom: 26,
    width: 74,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputWrap: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    minHeight: 50,
    overflow: 'hidden',
    width: '100%',
  },
  input: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  showPasswordRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
    marginTop: 2,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#BFBFBF',
    borderRadius: 4,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkboxActive: {
    backgroundColor: '#E7D773',
    borderColor: '#E7D773',
  },
  muted: {
    color: '#C4C4C4',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 52,
    width: '100%',
  },
  googleIcon: {
    color: '#8EC5FF',
    fontSize: 18,
    fontWeight: '900',
  },
  googleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footerText: {
    color: '#AFAFAF',
    fontSize: 14,
    marginTop: 18,
  },
  footerLink: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});

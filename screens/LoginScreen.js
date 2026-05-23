import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LogIn } from 'lucide-react-native';
import { supabase } from '../supabase/supabaseConfig';
import AnimatedActionButton from './AnimatedActionButton';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!supabase) {
      Alert.alert('Supabase is not configured', 'Add your Supabase URL and anon key to .env first.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert('Missing login details', 'Enter your email and password before signing in.');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        Alert.alert('Login failed', getAuthErrorMessage(error));
      }
    } catch (error) {
      Alert.alert('Login failed', getAuthErrorMessage(error));
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
            <LogIn color="#FFFFFF" size={40} />
          </View>

          <Text style={styles.title}>Welcome Back</Text>

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
            autoComplete="password"
            placeholder="Password"
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={setPassword}
          />

          <AnimatedActionButton
            disabled={loading}
            onPress={handleLogin}
            variant="gold"
          >
            {loading ? (
              <ActivityIndicator color="#121212" />
            ) : (
              <Text style={styles.primaryText}>Sign In</Text>
            )}
          </AnimatedActionButton>

          <Pressable style={styles.googleButton} onPress={handleGoogleSignIn}>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>Sign in with Google</Text>
          </Pressable>

          <Pressable onPress={() => navigation?.navigate?.('Register')}>
            <Text style={styles.footerText}>
              New player? <Text style={styles.footerLink}>Create Account</Text>
            </Text>
          </Pressable>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

function getAuthErrorMessage(error) {
  const message = error?.message ?? 'Please check your email and password.';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('email not confirmed')) {
    return 'Your account exists, but Supabase still needs email confirmation. Open the confirmation email, or turn off Confirm email in Supabase Authentication > Sign In / Providers > Email for class/demo testing.';
  }

  if (lowerMessage.includes('invalid login credentials')) {
    return 'The email or password does not match your Supabase account. Use the same email and password you created, or reset the password in Supabase.';
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
    fontSize: 25,
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

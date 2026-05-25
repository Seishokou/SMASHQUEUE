import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CalendarDays, Home, UserRound, UsersRound } from 'lucide-react-native';

import HomeScreen from './HomeScreen';
import LoginScreen from './LoginScreen';
import MatchHistoryScreen, { MatchHistoryTabIcon } from './MatchHistoryScreen';
import PlayersScreen from './PlayersScreen';
import ProfileScreen from './ProfileScreen';
import QueuingScreen from './QueuingScreen';
import RegisterScreen from './RegisterScreen';
import { supabase } from '../supabase/supabaseConfig';
import { useSmashQueue } from '../src/hooks/useSmashQueue';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs({ user }) {
  const smashQueueData = useSmashQueue();
  const { players } = smashQueueData;

  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      initialRouteName="Home"
      screenOptions={{
        freezeOnBlur: true,
        headerShown: false,
        lazy: false,
        sceneContainerStyle: styles.sceneContainer,
        tabBarActiveTintColor: '#E7D773',
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: '#AFAFAF',
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <View pointerEvents="none" style={styles.tabBarSolid} />
        ),
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      >
        {() => <HomeScreen smashQueueData={smashQueueData} />}
      </Tab.Screen>

      <Tab.Screen
        name="Book"
        options={{
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      >
        {({ navigation }) => <QueuingScreen navigation={navigation} />}
      </Tab.Screen>

      <Tab.Screen
        name="Players"
        options={{
          tabBarIcon: ({ color, size }) => <UsersRound color={color} size={size} />,
        }}
      >
        {() => <PlayersScreen players={players} />}
      </Tab.Screen>

      <Tab.Screen
        name="MatchHistory"
        component={MatchHistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, focused, size }) => (
            <MatchHistoryTabIcon color={color} focused={focused} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      >
        {({ navigation }) => <ProfileScreen navigation={navigation} user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function HomeNavigator({ initialAuthChecked = false, initialSession = null }) {
  const [session, setSession] = useState(initialSession);
  const [authLoading, setAuthLoading] = useState(!initialAuthChecked);

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      setAuthLoading(false);
      return () => {
        mounted = false;
      };
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setSession(null);
      } else {
        setSession(data.session ?? null);
      }
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return (
      <View style={styles.authLoading}>
        <ActivityIndicator color="#E7D773" size="large" />
        <Text style={styles.authLoadingText}>Loading SmashQueue...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'fade',
        contentStyle: { backgroundColor: '#121212' },
        headerShown: false,
      }}
    >
      {session ? (
        <Stack.Screen name="MainTabs">
          {() => <MainTabs user={session.user} />}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    backgroundColor: '#121212',
  },
  authLoading: {
    alignItems: 'center',
    backgroundColor: '#121212',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  authLoadingText: {
    color: '#E7D773',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 14,
  },
  tabBar: {
    backgroundColor: 'rgba(33,33,33,0.96)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderTopWidth: 1,
    elevation: 8,
    height: Platform.select({ ios: 86, android: 74, default: 74 }),
    overflow: 'hidden',
    paddingBottom: Platform.select({ ios: 22, android: 10, default: 10 }),
    paddingTop: 8,
    position: 'absolute',
  },
  tabBarSolid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(33,33,33,0.96)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '900',
  },
});

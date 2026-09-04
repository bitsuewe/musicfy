import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider } from './src/context/AuthContext';
import { PlayerProvider } from './src/context/PlayerContext';

import HomeScreen from './src/screens/HomeScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import LibraryScreen from './src/screens/LibraryScreen';

import FloatingPlayerCapsule from './src/components/FloatingPlayerCapsule';
import FullscreenPlayerModal from './src/components/FullscreenPlayerModal';

import { Home, Compass, Library } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#10B981',
          tabBarInactiveTintColor: '#71717A',
          tabBarLabelStyle: styles.tabLabel
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Home size={size || 22} color={color} />
          }}
        />
        <Tab.Screen
          name="Discover"
          component={DiscoverScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Compass size={size || 22} color={color} />
          }}
        />
        <Tab.Screen
          name="Library"
          component={LibraryScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Library size={size || 22} color={color} />
          }}
        />
      </Tab.Navigator>

      {/* Floating Bottom Capsule Player */}
      <FloatingPlayerCapsule />

      {/* Atmosphere Fullscreen Modal */}
      <FullscreenPlayerModal />
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <MainTabs />
        </NavigationContainer>
      </PlayerProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B'
  },
  tabBar: {
    backgroundColor: '#121216',
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 6,
    paddingTop: 6
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700'
  }
});

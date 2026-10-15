import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LobbyScreen from './src/screens/LobbyScreen';
import RoomScreen from './src/screens/RoomScreen';
import type { RelayClient } from './src/net/RelayClient';
import type { RoomSession } from './src/types';

export default function App() {
  const [active, setActive] = useState<{ relay: RelayClient; session: RoomSession } | null>(null);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f1115' }} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        {active ? (
          <RoomScreen relay={active.relay} session={active.session} onLeave={() => setActive(null)} />
        ) : (
          <LobbyScreen onEnter={(relay, session) => setActive({ relay, session })} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

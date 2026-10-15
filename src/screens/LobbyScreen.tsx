import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RelayClient } from '../net/RelayClient';
import { DEFAULT_RELAY_URL } from '../net/config';
import type { RoomSession } from '../types';

const NAME_KEY = 'wp:name';
const RELAY_KEY = 'wp:relayUrl';

interface Props {
  onEnter: (relay: RelayClient, session: RoomSession) => void;
}

export default function LobbyScreen({ onEnter }: Props) {
  const [name, setName] = useState('');
  const [relayUrl, setRelayUrl] = useState(DEFAULT_RELAY_URL);
  const [roomCode, setRoomCode] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [savedName, savedRelay] = await Promise.all([
        AsyncStorage.getItem(NAME_KEY),
        AsyncStorage.getItem(RELAY_KEY),
      ]);
      if (savedName) setName(savedName);
      if (savedRelay) setRelayUrl(savedRelay);
    })();
  }, []);

  async function persist() {
    await AsyncStorage.setItem(NAME_KEY, name.trim());
    await AsyncStorage.setItem(RELAY_KEY, relayUrl.trim());
  }

  async function handleCreate() {
    setError('');
    const finalName = name.trim() || 'Хост';
    setBusy(true);
    await persist();
    const relay = new RelayClient();
    try {
      await relay.connect(relayUrl.trim());
    } catch {
      setBusy(false);
      setError('Не удалось подключиться к серверу. Проверьте адрес и что телефон в одной сети с сервером.');
      return;
    }
    const unsubscribe = relay.onMessage((msg) => {
      if (msg.type === 'created') {
        unsubscribe();
        setBusy(false);
        onEnter(relay, {
          roomCode: msg.room,
          isHost: true,
          myName: finalName,
          initialNames: msg.names,
          initialState: { url: '', kind: null, playing: false, time: 0 },
        });
      } else if (msg.type === 'error') {
        unsubscribe();
        setBusy(false);
        setError(msg.message);
      }
    });
    relay.send({ type: 'create', name: finalName });
  }

  async function handleJoin() {
    setError('');
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError('Введите код комнаты.');
      return;
    }
    const finalName = name.trim() || 'Гость';
    setBusy(true);
    await persist();
    const relay = new RelayClient();
    try {
      await relay.connect(relayUrl.trim());
    } catch {
      setBusy(false);
      setError('Не удалось подключиться к серверу. Проверьте адрес и что телефон в одной сети с сервером.');
      return;
    }
    const unsubscribe = relay.onMessage((msg) => {
      if (msg.type === 'joined') {
        unsubscribe();
        setBusy(false);
        onEnter(relay, {
          roomCode: msg.room,
          isHost: false,
          myName: finalName,
          initialNames: msg.names,
          initialState: msg.state,
        });
      } else if (msg.type === 'error') {
        unsubscribe();
        setBusy(false);
        relay.close();
        setError(msg.message);
      }
    });
    relay.send({ type: 'join', room: code, name: finalName });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>🎬 Смотрим вместе</Text>
        <Text style={styles.subtitle}>Онлайн-кинотеатр с друзьями: видео + чат в реальном времени</Text>

        <Text style={styles.label}>Ваше имя</Text>
        <TextInput
          style={styles.input}
          placeholder="Например, Артём"
          placeholderTextColor="#6b7280"
          value={name}
          onChangeText={setName}
          maxLength={24}
        />

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Создать комнату</Text>
          <Text style={styles.hint}>Вы станете хостом: у вас будет ссылка на видео и управление воспроизведением.</Text>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleCreate} disabled={busy}>
            <Text style={styles.btnPrimaryText}>Создать комнату</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.divider}>или</Text>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Войти в комнату</Text>
          <Text style={styles.label}>Код комнаты</Text>
          <TextInput
            style={styles.input}
            placeholder="Например, X7K2Q9"
            placeholderTextColor="#6b7280"
            value={roomCode}
            onChangeText={(t) => setRoomCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={8}
          />
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleJoin} disabled={busy}>
            <Text style={styles.btnSecondaryText}>Войти</Text>
          </TouchableOpacity>
        </View>

        {busy && (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <ActivityIndicator color="#5b8cff" />
            <Text style={styles.busyHint}>
              Подключаемся к серверу… Если он давно не использовался, может занять до минуты.
            </Text>
          </View>
        )}
        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity onPress={() => setShowAdvanced((v) => !v)} style={{ marginTop: 24 }}>
          <Text style={styles.advancedToggle}>{showAdvanced ? '▾' : '▸'} Адрес сервера</Text>
        </TouchableOpacity>
        {showAdvanced && (
          <View>
            <Text style={styles.hint}>
              Адрес сервера-посредника (relay). По умолчанию — компьютер разработчика в локальной сети.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="ws://192.168.1.9:8787"
              placeholderTextColor="#6b7280"
              value={relayUrl}
              onChangeText={setRelayUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f1115' },
  container: { padding: 24, paddingTop: 24, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '700', color: '#e8eaed', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#9aa2b1', marginBottom: 24 },
  label: { fontSize: 12.5, color: '#9aa2b1', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#2c3140',
    backgroundColor: '#0f1218',
    color: '#e8eaed',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  block: { backgroundColor: '#171a21', borderWidth: 1, borderColor: '#262b36', borderRadius: 16, padding: 18, marginTop: 8 },
  blockTitle: { fontSize: 16, fontWeight: '600', color: '#e8eaed', marginBottom: 6 },
  hint: { fontSize: 12.5, color: '#9aa2b1', marginBottom: 12, lineHeight: 17 },
  divider: { textAlign: 'center', color: '#616a7a', fontSize: 12, marginVertical: 18 },
  btn: { borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#5b8cff' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSecondary: { backgroundColor: '#262b36' },
  btnSecondaryText: { color: '#e8eaed', fontWeight: '700', fontSize: 14 },
  error: { color: '#ff6b6b', fontSize: 13, marginTop: 12 },
  busyHint: { color: '#9aa2b1', fontSize: 12, marginTop: 8, textAlign: 'center' },
  advancedToggle: { color: '#8fb0ff', fontSize: 13 },
});

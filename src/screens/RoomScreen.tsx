import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { RelayClient } from '../net/RelayClient';
import type { ChatMessage, RoomSession, RoomState, SyncAction, VideoKind } from '../types';
import { detectVideoKind } from '../utils/detectVideoKind';
import VideoStage from '../video/VideoStage';
import type { VideoStageHandle } from '../video/types';

interface Props {
  relay: RelayClient;
  session: RoomSession;
  onLeave: () => void;
}

let msgCounter = 0;
function nextId() {
  msgCounter += 1;
  return String(msgCounter) + '-' + Date.now();
}

const KIND_LABELS: Record<VideoKind, string> = {
  direct: 'Видео',
  youtube: 'YouTube',
  other: 'Сайт',
};

export default function RoomScreen({ relay, session, onLeave }: Props) {
  const { roomCode, isHost, myName } = session;
  const [names, setNames] = useState<string[]>(session.initialNames);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomState, setRoomState] = useState<RoomState>(session.initialState);
  const [urlInput, setUrlInput] = useState('');
  const [kindOverride, setKindOverride] = useState<VideoKind | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [ended, setEnded] = useState(false);

  const videoStageRef = useRef<VideoStageHandle>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  useEffect(() => {
    const unsubMsg = relay.onMessage((msg) => {
      switch (msg.type) {
        case 'chat':
          appendMessage({ id: nextId(), name: msg.name, text: msg.text });
          break;
        case 'peers':
          setNames(msg.names);
          break;
        case 'system':
          appendMessage({ id: nextId(), text: msg.text, system: true });
          break;
        case 'video-set':
          setRoomState({ url: msg.url, kind: msg.kind, playing: false, time: 0 });
          appendMessage({ id: nextId(), text: 'Хост загрузил видео.', system: true });
          break;
        case 'sync':
          videoStageRef.current?.applySync(msg.action, msg.time, msg.playing);
          break;
        case 'host-left':
          setEnded(true);
          Alert.alert('Хост отключился', 'Просмотр окончен.');
          break;
        default:
          break;
      }
    });
    const unsubClose = relay.onClose(() => {
      setEnded(true);
    });
    return () => {
      unsubMsg();
      unsubClose();
    };
  }, [relay, appendMessage]);

  function handleLeave() {
    relay.close();
    onLeave();
  }

  function handleLoadVideo() {
    const url = urlInput.trim();
    if (!url) return;
    const kind = kindOverride ?? detectVideoKind(url);
    setRoomState({ url, kind, playing: false, time: 0 });
    relay.send({ type: 'video-set', url, kind });
    appendMessage({ id: nextId(), text: 'Вы загрузили видео.', system: true });
  }

  function handleSendChat() {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    relay.send({ type: 'chat', text });
    appendMessage({ id: nextId(), name: myName, text, self: true });
  }

  const handleHostEvent = useCallback(
    (action: SyncAction, time: number, playing: boolean) => {
      relay.send({ type: 'sync', action, time, playing });
    },
    [relay]
  );

  async function handleCopyCode() {
    await Clipboard.setStringAsync(roomCode);
    Alert.alert('Скопировано', `Код комнаты ${roomCode} скопирован.`);
  }

  const autoKind = urlInput.trim() ? detectVideoKind(urlInput.trim()) : null;
  const effectiveKind = kindOverride ?? autoKind;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.badge}>{isHost ? 'Хост' : 'Гость'}</Text>
          <Text style={styles.roomCode}>{roomCode}</Text>
          <TouchableOpacity onPress={handleCopyCode} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>Код</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={handleLeave} style={[styles.smallBtn, styles.dangerBtn]}>
            <Text style={styles.dangerBtnText}>Выйти</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.participants} numberOfLines={1}>
          Участники ({names.length}): {names.join(', ')}
        </Text>
      </View>

      <View style={styles.videoArea}>
        {roomState.url && roomState.kind ? (
          <VideoStage
            ref={videoStageRef}
            key={roomState.kind}
            url={roomState.url}
            kind={roomState.kind}
            isHost={isHost}
            onHostEvent={isHost ? handleHostEvent : undefined}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {isHost ? 'Вставьте ссылку на видео ниже' : 'Ожидание ссылки на видео от хоста…'}
            </Text>
          </View>
        )}
        {!isHost && roomState.url && (
          <View style={styles.lockNote}>
            <Text style={styles.lockNoteText}>Воспроизведением управляет хост</Text>
          </View>
        )}
      </View>

      {isHost && (
        <View style={styles.hostControls}>
          <TextInput
            style={styles.urlInput}
            placeholder="Ссылка на видео: mp4, YouTube или любой сайт"
            placeholderTextColor="#6b7280"
            value={urlInput}
            onChangeText={setUrlInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.kindRow}>
            {(['direct', 'youtube', 'other'] as VideoKind[]).map((k) => (
              <TouchableOpacity
                key={k}
                onPress={() => setKindOverride(k)}
                style={[styles.kindChip, effectiveKind === k && styles.kindChipActive]}
              >
                <Text style={[styles.kindChipText, effectiveKind === k && styles.kindChipTextActive]}>
                  {KIND_LABELS[k]}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleLoadVideo}>
              <Text style={styles.btnPrimaryText}>Загрузить</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.chat}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.chatList}
          renderItem={({ item }) => (
            <Text style={[styles.chatLine, item.system && styles.chatSystem]}>
              {!item.system && <Text style={styles.chatName}>{item.name}{item.self ? ' (вы)' : ''}: </Text>}
              {item.text}
            </Text>
          )}
        />
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            placeholder={ended ? 'Комната закрыта' : 'Сообщение…'}
            placeholderTextColor="#6b7280"
            value={chatInput}
            onChangeText={setChatInput}
            editable={!ended}
            onSubmitEditing={handleSendChat}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={handleSendChat} style={styles.sendBtn} disabled={ended}>
            <Text style={styles.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f1115' },
  header: { paddingTop: 10, paddingHorizontal: 14, paddingBottom: 8, backgroundColor: '#171a21', borderBottomWidth: 1, borderBottomColor: '#262b36' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: '#5b8cff22', color: '#8fb0ff', borderWidth: 1, borderColor: '#5b8cff55', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  roomCode: { color: '#9aa2b1', fontSize: 13, letterSpacing: 1 },
  smallBtn: { backgroundColor: '#262b36', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  smallBtnText: { color: '#e8eaed', fontSize: 12.5, fontWeight: '600' },
  dangerBtn: { backgroundColor: '#3a1f24' },
  dangerBtnText: { color: '#ff8a8a', fontSize: 12.5, fontWeight: '600' },
  participants: { color: '#6b7280', fontSize: 12, marginTop: 6 },
  videoArea: { aspectRatio: 16 / 9, backgroundColor: '#000', position: 'relative' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  placeholderText: { color: '#6b7280', fontSize: 13, textAlign: 'center' },
  lockNote: { position: 'absolute', top: 8, right: 8, backgroundColor: '#000000aa', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  lockNoteText: { color: '#cbd2e0', fontSize: 11 },
  hostControls: { padding: 10, backgroundColor: '#12141a', borderBottomWidth: 1, borderBottomColor: '#262b36' },
  urlInput: { borderWidth: 1, borderColor: '#2c3140', backgroundColor: '#0f1218', color: '#e8eaed', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13.5, marginBottom: 8 },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kindChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#1c2027', borderWidth: 1, borderColor: '#2c3140' },
  kindChipActive: { backgroundColor: '#5b8cff22', borderColor: '#5b8cff' },
  kindChipText: { color: '#9aa2b1', fontSize: 11.5 },
  kindChipTextActive: { color: '#8fb0ff', fontWeight: '700' },
  btn: { marginLeft: 'auto', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  btnPrimary: { backgroundColor: '#5b8cff' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  chat: { flex: 1 },
  chatList: { padding: 12, gap: 6 },
  chatLine: { color: '#e8eaed', fontSize: 13.5, lineHeight: 18 },
  chatSystem: { color: '#6b7280', fontStyle: 'italic' },
  chatName: { fontWeight: '700', color: '#8fb0ff' },
  chatInputRow: { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: '#262b36' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: '#2c3140', backgroundColor: '#0f1218', color: '#e8eaed', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  sendBtn: { backgroundColor: '#5b8cff', width: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontSize: 16 },
});

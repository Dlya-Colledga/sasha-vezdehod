import { forwardRef, useImperativeHandle, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { VideoStageHandle, VideoStageProps } from './types';

// Обычный мобильный Chrome UA — некоторые сайты показывают урезанную/сломанную
// версию, если не узнают браузер во встроенном WebView.
const MOBILE_CHROME_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/125.0.0.0 Mobile Safari/537.36';

// Показываем произвольный сайт прямо внутри приложения. Управлять его плеером
// мы не можем — синхронизация play/pause здесь недоступна, каждый смотрит сам.
const OtherWebViewStage = forwardRef<VideoStageHandle, VideoStageProps>(({ url }, ref) => {
  const [loadError, setLoadError] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  useImperativeHandle(ref, () => ({
    applySync() {
      // синхронизация недоступна для произвольных сайтов
    },
  }));

  function openInBrowser() {
    Linking.openURL(url).catch(() => {});
  }

  function retry() {
    setLoadError(false);
    setLoadKey((k) => k + 1);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>Play/pause здесь не синхронизируются — каждый смотрит сам.</Text>
        <TouchableOpacity onPress={openInBrowser}>
          <Text style={styles.openLink}>Открыть в браузере</Text>
        </TouchableOpacity>
      </View>

      {loadError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Не удалось показать сайт во встроенном окне.</Text>
          <TouchableOpacity onPress={retry} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Попробовать снова</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openInBrowser} style={[styles.retryBtn, styles.retryBtnPrimary]}>
            <Text style={styles.retryBtnText}>Открыть в браузере</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          key={loadKey}
          source={{ uri: url }}
          style={styles.webview}
          userAgent={MOBILE_CHROME_USER_AGENT}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#5b8cff" size="large" />
            </View>
          )}
          onError={() => setLoadError(true)}
          onHttpError={(e) => {
            // 4xx/5xx на второстепенных подзапросах (реклама, трекеры) — не повод
            // показывать ошибку на весь экран, только если упал сам адрес страницы.
            if (e.nativeEvent.url === url) setLoadError(true);
          }}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  notice: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#3a2f1f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  noticeText: { color: '#e8c98a', fontSize: 11, flex: 1 },
  openLink: { color: '#8fb0ff', fontSize: 11.5, fontWeight: '700' },
  webview: { flex: 1, backgroundColor: '#000' },
  loadingBox: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  errorText: { color: '#9aa2b1', fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: '#262b36', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  retryBtnPrimary: { backgroundColor: '#5b8cff' },
  retryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

export default OtherWebViewStage;

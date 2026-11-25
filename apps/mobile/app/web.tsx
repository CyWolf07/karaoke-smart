import { colors, radii, spacing } from '@ks/design-tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { API_URL } from '../lib/api';

/**
 * La plataforma web dentro de la app (misma experiencia que en el navegador).
 * Solo navega dentro del dominio de Karaoke Smart; los enlaces externos se bloquean.
 */
export default function Web() {
  const { path } = useLocalSearchParams<{ path?: string }>();
  const safePath = typeof path === 'string' && path.startsWith('/') ? path : '/join';
  const web = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);

  // Botón "atrás" de Android: primero dentro de la web, luego vuelve al inicio de la app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current) {
        web.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Sin conexión</Text>
        <Text style={styles.text}>
          No se pudo abrir Karaoke Smart. Revisa tu internet; si el servidor estaba en reposo, puede
          tardar unos segundos en despertar.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          onPress={() => {
            setError(false);
            setKey((k) => k + 1);
          }}
        >
          <Text style={styles.primaryText}>Reintentar</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => router.back()}>
          <Text style={styles.linkText}>Volver</Text>
        </Pressable>
      </View>
    );

  return (
    <View style={styles.container}>
      <WebView
        key={key}
        ref={web}
        source={{ uri: `${API_URL}${safePath}` }}
        style={styles.web}
        originWhitelist={['*']}
        // iframes (reproductor de YouTube) permitidos; la página principal no sale del dominio.
        onShouldStartLoadWithRequest={(r) =>
          r.isTopFrame === false || r.url.startsWith(API_URL) || r.url === 'about:blank'
        }
        applicationNameForUserAgent="KaraokeSmartApp"
        onNavigationStateChange={(s) => (canGoBack.current = s.canGoBack)}
        onError={() => setError(true)}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500 && e.nativeEvent.url.startsWith(API_URL))
            setError(true);
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        pullToRefreshEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.85 },
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 32 },
  web: { flex: 1, backgroundColor: colors.background },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
  primary: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.primaryText, fontWeight: '800', fontSize: 16 },
  link: { paddingVertical: spacing.md },
  linkText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
});

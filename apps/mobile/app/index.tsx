import { colors, radii, spacing } from '@ks/design-tokens';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../lib/api';

type Server = 'checking' | 'up' | 'down';

/**
 * Inicio: tres acciones y nada más. Escanear el QR (lo normal), escribir el código,
 * o entrar como anfitrión. Todo lo demás ocurre en la plataforma web integrada.
 */
export default function Home() {
  const [server, setServer] = useState<Server>('checking');
  const check = useCallback(() => {
    setServer('checking');
    api
      .health()
      .then((h) => setServer(h.status === 'ok' ? 'up' : 'down'))
      .catch(() => setServer('down'));
  }, []);
  useEffect(check, [check]);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>🎤</Text>
        </View>
        <Text style={styles.title}>Karaoke Smart</Text>
        <Text style={styles.subtitle}>Escanea el QR de la pantalla y pide tu canción.</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Escanear QR</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          onPress={() => router.push({ pathname: '/web', params: { path: '/join' } })}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Escribir el código</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
          onPress={() => router.push({ pathname: '/web', params: { path: '/login' } })}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>Soy el anfitrión</Text>
        </Pressable>
      </View>

      <Pressable onPress={check} disabled={server === 'checking'} style={styles.status}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor:
                server === 'up'
                  ? colors.primary
                  : server === 'down'
                    ? colors.danger
                    : colors.textMuted,
            },
          ]}
        />
        <Text style={styles.statusText}>
          {server === 'up'
            ? 'Servidor en línea'
            : server === 'down'
              ? 'Sin conexión con el servidor · toca para reintentar'
              : 'Conectando con el servidor…'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.85 },
  container: { flex: 1, padding: spacing.lg, paddingTop: 96, justifyContent: 'space-between' },
  hero: { alignItems: 'center', gap: spacing.md },
  logo: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 38 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
  actions: { gap: spacing.md },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.primaryText, fontWeight: '800', fontSize: 18 },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.full,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '700', fontSize: 16 },
  link: { alignItems: 'center', paddingVertical: spacing.md },
  linkText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  dot: { width: 8, height: 8, borderRadius: radii.full },
  statusText: { color: colors.textMuted, fontSize: 13 },
});

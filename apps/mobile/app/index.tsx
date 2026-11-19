import { colors, radii, spacing } from '@ks/design-tokens';
import type { HealthResponse } from '@ks/shared-types';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { API_URL, api } from '../lib/api';

/**
 * Inicio (Fase 1): estado real de la conexión con el servidor y acceso a la
 * pantalla del participante. El escáner QR y el micrófono llegan en las fases 2, 5 y 7.
 */
export default function Home() {
  const [state, setState] = useState<{ loading: boolean; data?: HealthResponse; error?: string }>({
    loading: true,
  });

  const check = useCallback(() => {
    setState({ loading: true });
    api
      .health()
      .then((data) => setState({ loading: false, data }))
      .catch((e: Error) => setState({ loading: false, error: e.message }));
  }, []);

  useEffect(check, [check]);

  const ok = state.data?.status === 'ok';
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>🎤</Text>
      </View>
      <Text style={styles.title}>Karaoke Smart</Text>
      <Text style={styles.muted}>Servidor: {API_URL}</Text>

      <View style={styles.card}>
        {state.loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: ok ? colors.primary : colors.danger }]} />
            <Text style={[styles.status, { color: ok ? colors.primary : colors.danger }]}>
              {ok
                ? 'Conectado al servidor'
                : `Sin conexión${state.error ? `: ${state.error}` : ''}`}
            </Text>
          </View>
        )}
      </View>

      <Link href="/join" asChild>
        <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          <Text style={styles.primaryText}>Soy participante</Text>
        </Pressable>
      </Link>
      <Pressable
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        onPress={check}
        disabled={state.loading}
      >
        <Text style={styles.secondaryText}>Comprobar conexión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Respuesta inmediata al apoyar el dedo (equivalente nativo de :active).
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.85 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 30 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 13 },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radii.full },
  status: { fontSize: 16, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  primary: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  secondary: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.full,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '600', fontSize: 15 },
});

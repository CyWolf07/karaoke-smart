import { createApiClient } from '@ks/api-client';
import { colors, radii, spacing } from '@ks/design-tokens';
import type { HealthResponse } from '@ks/shared-types';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

// 10.0.2.2 = localhost del PC visto desde el emulador Android. En un celular físico,
// cambiar extra.apiUrl en app.json por la IP LAN del PC (ver docs/10).
const API_URL = (Constants.expoConfig?.extra?.apiUrl as string) ?? 'http://10.0.2.2:3000';
const api = createApiClient({ baseUrl: API_URL });

/**
 * Pantalla inicial (Fase 0): verifica la conexión real con la API.
 * El escáner QR y el micrófono llegan en las fases 2, 5 y 7.
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
      <Text style={styles.title}>Karaoke Smart</Text>
      <Text style={styles.muted}>Servidor: {API_URL}</Text>
      <View style={styles.card}>
        {state.loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={[styles.status, { color: ok ? colors.primary : colors.danger }]}>
            {ok ? 'Conectado al servidor' : `Sin conexión${state.error ? `: ${state.error}` : ''}`}
          </Text>
        )}
      </View>
      <Pressable style={styles.button} onPress={check} disabled={state.loading}>
        <Text style={styles.buttonText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 13 },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  status: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  buttonText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
});

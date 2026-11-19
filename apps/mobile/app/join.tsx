import { colors, radii, spacing } from '@ks/design-tokens';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { loadNickname, saveNickname, validateNickname } from '../lib/nickname';

/**
 * Participante (Fase 1): apodo guardado en el dispositivo. Entrar a una sala
 * requiere escanear el QR de la pantalla principal (Fase 2).
 */
export default function Join() {
  const [nickname, setNickname] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNickname().then((v) => {
      setNickname(v);
      setSaved(Boolean(v));
    });
  }, []);

  async function submit() {
    const v = validateNickname(nickname);
    if (!v) return setError('Escribe entre 1 y 30 caracteres');
    try {
      await saveNickname(v);
      setNickname(v);
      setError(null);
      setSaved(true);
    } catch {
      setError('No se pudo guardar en este dispositivo');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
        <Text style={styles.backText}>‹ Volver</Text>
      </Pressable>

      <Text style={styles.title}>¿Cómo te llamamos?</Text>
      <Text style={styles.muted}>Tu apodo aparecerá en la cola cuando pidas canciones.</Text>

      <TextInput
        value={nickname}
        onChangeText={(t) => {
          setNickname(t);
          setSaved(false);
        }}
        placeholder="Tu apodo"
        placeholderTextColor={colors.textMuted}
        maxLength={30}
        style={[styles.input, error ? { borderColor: colors.danger } : null]}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={({ pressed }) => [
          styles.primary,
          saved && { opacity: 0.6 },
          pressed && styles.pressed,
        ]}
        onPress={submit}
        disabled={saved}
      >
        <Text style={styles.primaryText}>
          {saved ? '✓ Guardado en este dispositivo' : 'Guardar apodo'}
        </Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.muted}>
          Para entrar a una sala escanea el QR de la pantalla principal. Las salas y el QR se
          habilitan en la Fase 2.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Respuesta inmediata al apoyar el dedo (equivalente nativo de :active).
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.85 },
  container: { flex: 1, padding: spacing.lg, paddingTop: 64, gap: spacing.md },
  back: { marginBottom: spacing.md },
  backText: { color: colors.primary, fontSize: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 15 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  error: { color: colors.danger, fontSize: 14 },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
});

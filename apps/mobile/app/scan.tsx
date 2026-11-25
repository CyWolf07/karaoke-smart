import { colors, radii, spacing } from '@ks/design-tokens';
import { parseJoinCode } from '@ks/validation';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Escáner del QR de la sala. Pide el permiso de cámara explicando para qué es; si se negó
 * para siempre, lleva a los ajustes del sistema. Al leer un QR válido abre la sala.
 */
export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [warning, setWarning] = useState<string | null>(null);
  const handled = useRef(false);

  if (!permission)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );

  if (!permission.granted)
    return (
      <View style={[styles.center, { gap: spacing.md }]}>
        <Text style={styles.title}>Permiso de cámara</Text>
        <Text style={styles.text}>
          Karaoke Smart usa la cámara solo para leer el código QR de la sala. No graba ni guarda
          imágenes.
        </Text>
        {permission.canAskAgain ? (
          <Pressable
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            onPress={requestPermission}
          >
            <Text style={styles.primaryText}>Permitir cámara</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.primaryText}>Abrir ajustes</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.link}
          onPress={() => router.replace({ pathname: '/web', params: { path: '/join' } })}
        >
          <Text style={styles.linkText}>Prefiero escribir el código</Text>
        </Pressable>
      </View>
    );

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current) return;
          const code = parseJoinCode(data);
          if (!code) {
            setWarning('Ese QR no es de una sala de Karaoke Smart');
            return;
          }
          handled.current = true;
          router.replace({ pathname: '/web', params: { path: `/join?code=${code}` } });
        }}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.hint}>Apunta al QR de la pantalla</Text>
        <View style={styles.frame} />
        {warning && <Text style={styles.warning}>{warning}</Text>}
        <Pressable
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryText}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.85 },
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 96,
    paddingBottom: 48,
    paddingHorizontal: spacing.lg,
  },
  hint: { color: '#fff', fontSize: 18, fontWeight: '700' },
  frame: {
    width: 260,
    height: 260,
    borderRadius: radii.lg,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  warning: {
    color: colors.warning,
    fontSize: 15,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  primary: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.primaryText, fontWeight: '800', fontSize: 16 },
  secondary: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(29,29,33,0.9)',
    borderRadius: radii.full,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '700', fontSize: 16 },
  link: { paddingVertical: spacing.md },
  linkText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
});

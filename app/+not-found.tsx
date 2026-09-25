import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';

export default function NotFoundScreen() {
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    // Se arriviamo qui da un deep link agentpay:/// vuoto, reindirizza subito alla home
    Linking.getInitialURL().then((url) => {
      if (!url || url === 'agentpay://' || url === 'agentpay:///' || url.trim() === '') {
        router.replace('/(tabs)');
      }
    }).catch(() => {});
  }, [router]);

  const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    iconWrap: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 24,
    },
    title: { fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    btn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 32, paddingVertical: 14,
      borderRadius: 12,
      flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    btnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  });

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="search-off" size={36} color={colors.muted} />
        </View>
        <Text style={styles.title}>Pagina non trovata</Text>
        <Text style={styles.subtitle}>
          La schermata che stai cercando non esiste o è stata spostata.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(tabs)')}>
          <MaterialIcons name="home" size={18} color="#fff" />
          <Text style={styles.btnText}>Torna alla Home</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

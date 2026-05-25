import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from './ui/icon-symbol';
import { inAppBrowser } from '@/lib/in-app-browser';

interface DeFiApp {
  name: string;
  url: string;
  category: string;
  icon?: string;
}

interface DeFiBrowserProps {
  onAppOpen?: (appName: string) => void;
}

export function DeFiBrowser({ onAppOpen }: DeFiBrowserProps) {
  const colors = useColors();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const deFiApps = inAppBrowser.getPopularDeFiApps();
  const categories = Array.from(new Set(deFiApps.map((app) => app.category)));

  const filteredApps = selectedCategory
    ? deFiApps.filter((app) => app.category === selectedCategory)
    : deFiApps;

  const handleOpenApp = async (app: DeFiApp) => {
    setIsLoading(true);
    try {
      const result = await inAppBrowser.openDeFiApp(app.name, app.url);
      if (result.success) {
        onAppOpen?.(app.name);
      }
    } finally {
      setIsLoading(false);
      setShowModal(false);
    }
  };

  const styles = StyleSheet.create({
    button: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    buttonText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingTop: 20,
      paddingBottom: 32,
      maxHeight: '80%',
    },
    modalHeader: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
    },
    categoryScroll: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    categoryButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginRight: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
    },
    categoryButtonTextActive: {
      color: colors.background,
    },
    appList: {
      paddingHorizontal: 20,
    },
    appItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    appIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    appInfo: {
      flex: 1,
    },
    appName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    appCategory: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    openButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    openButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.background,
    },
    closeButton: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
    },
  });

  const renderAppItem: ListRenderItem<DeFiApp> = ({ item }) => (
    <TouchableOpacity
      style={styles.appItem}
      onPress={() => handleOpenApp(item)}
      disabled={isLoading}
    >
      <View style={styles.appIcon}>
        <IconSymbol size={20} name="globe" color={colors.background} />
      </View>
      <View style={styles.appInfo}>
        <Text style={styles.appName}>{item.name}</Text>
        <Text style={styles.appCategory}>{item.category}</Text>
      </View>
      <TouchableOpacity
        style={styles.openButton}
        onPress={() => handleOpenApp(item)}
        disabled={isLoading}
      >
        <Text style={styles.openButtonText}>Open</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowModal(true)}
        disabled={isLoading}
      >
        <IconSymbol size={16} name="globe" color={colors.background} />
        <Text style={styles.buttonText}>DeFi Browser</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>DeFi Apps & DEX</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  !selectedCategory && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    !selectedCategory && styles.categoryButtonTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonActive,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      selectedCategory === category && styles.categoryButtonTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <FlatList
              data={filteredApps}
              renderItem={renderAppItem}
              keyExtractor={(item) => item.url}
              scrollEnabled={true}
              style={styles.appList}
              nestedScrollEnabled={true}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
              disabled={isLoading}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

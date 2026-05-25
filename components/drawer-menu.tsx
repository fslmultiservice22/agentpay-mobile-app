import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from './ui/icon-symbol';
import { analytics } from '@/lib/analytics';

interface DrawerMenuItem {
  label: string;
  icon: string;
  route: string;
  description?: string;
}

const DRAWER_ITEMS: DrawerMenuItem[] = [
  {
    label: 'Copy Trade',
    icon: 'doc.text.fill',
    route: '/(tabs)/copy-trade-tracking',
    description: 'Mirror trades from top performers',
  },
  {
    label: 'Leaderboard',
    icon: 'star.fill',
    route: '/(tabs)/leaderboard',
    description: 'Top traders and performers',
  },
  {
    label: 'Price Alerts',
    icon: 'bell.fill',
    route: '/(tabs)/price-alerts',
    description: 'Set custom price notifications',
  },
  {
    label: 'Swap',
    icon: 'arrow.left.arrow.right',
    route: '/(tabs)/cross-chain-swap',
    description: 'Cross-chain token swaps',
  },
  {
    label: 'Gas Comparator',
    icon: 'bolt.fill',
    route: '/(tabs)/gas-comparator',
    description: 'Compare gas fees across chains',
  },
  {
    label: 'Rebalance',
    icon: 'arrow.2.squarepath',
    route: '/(tabs)/rebalancing-dashboard',
    description: 'Rebalance your portfolio',
  },
  {
    label: 'Multi Portfolio',
    icon: 'folder.fill',
    route: '/(tabs)/portfolio-multi',
    description: 'Manage multiple portfolios',
  },
  {
    label: 'Swap Analytics',
    icon: 'chart.bar.fill',
    route: '/(tabs)/swap-analytics',
    description: 'Analyze swap performance',
  },
  {
    label: 'Credit Line',
    icon: 'creditcard.fill',
    route: '/(tabs)/credit-line',
    description: 'Manage credit lines',
  },
  {
    label: 'Social Trading',
    icon: 'network',
    route: '/(tabs)/social-trading',
    description: 'Social trading community',
  },
  {
    label: 'Transfer',
    icon: 'paperplane.fill',
    route: '/(tabs)/transfer-funds',
    description: 'Transfer funds',
  },
  {
    label: 'Telegram',
    icon: 'paperplane.fill',
    route: '/(tabs)/telegram',
    description: 'Telegram integration',
  },
];

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  // Track drawer menu open
  React.useEffect(() => {
    if (visible) {
      analytics.trackDrawerMenuOpen();
    }
  }, [visible]);
  const router = useRouter();
  const colors = useColors();
  const screenWidth = Dimensions.get('window').width;
  const drawerWidth = Math.min(screenWidth * 0.75, 300);

  const handleNavigate = (route: string) => {
    // Track drawer menu item click
    const item = DRAWER_ITEMS.find(i => i.route === route);
    if (item) {
      analytics.trackDrawerMenuItemClick(item.label, route);
    }
    router.push(route as any);
    onClose();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    drawer: {
      width: drawerWidth,
      backgroundColor: colors.background,
      paddingTop: 20,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.foreground,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.muted,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemActive: {
      backgroundColor: `${colors.primary}15`,
    },
    menuIcon: {
      marginRight: 12,
      width: 24,
      alignItems: 'center',
    },
    menuContent: {
      flex: 1,
    },
    menuLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 2,
    },
    menuDescription: {
      fontSize: 11,
      color: colors.muted,
    },
    closeButton: {
      position: 'absolute',
      top: 20,
      right: 16,
      padding: 8,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.drawer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Features</Text>
            <Text style={styles.headerSubtitle}>
              {DRAWER_ITEMS.length} additional features
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {DRAWER_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => handleNavigate(item.route)}
                activeOpacity={0.7}
              >
                <View style={styles.menuIcon}>
                  <IconSymbol
                    size={20}
                    name={item.icon as any}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.description && (
                    <Text style={styles.menuDescription}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

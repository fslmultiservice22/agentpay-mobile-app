import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from './ui/icon-symbol';
import { socialSharing, PortfolioShareData, TradeShareData } from '@/lib/social-sharing';

interface SocialShareButtonProps {
  type: 'portfolio' | 'trade' | 'achievement' | 'referral';
  data?: PortfolioShareData | TradeShareData;
  achievementTitle?: string;
  achievementDescription?: string;
  referralCode?: string;
  onShare?: () => void;
}

const SOCIAL_PLATFORMS = [
  { id: 'twitter', label: 'Twitter', icon: 'paperplane.fill', color: '#1DA1F2' },
  { id: 'facebook', label: 'Facebook', icon: 'paperplane.fill', color: '#1877F2' },
  { id: 'telegram', label: 'Telegram', icon: 'paperplane.fill', color: '#0088cc' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'paperplane.fill', color: '#25D366' },
  { id: 'copy', label: 'Copy Link', icon: 'doc.on.doc', color: '#999' },
];

export function SocialShareButton({
  type,
  data,
  achievementTitle,
  achievementDescription,
  referralCode,
  onShare,
}: SocialShareButtonProps) {
  const colors = useColors();
  const [showModal, setShowModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async (platform: string) => {
    setIsSharing(true);
    try {
      let success = false;

      switch (type) {
        case 'portfolio':
          if (data && 'totalValue' in data) {
            success = await socialSharing.sharePortfolio(data as PortfolioShareData);
          }
          break;
        case 'trade':
          if (data && 'tokenSymbol' in data) {
            success = await socialSharing.shareTrade(data as TradeShareData);
          }
          break;
        case 'achievement':
          if (achievementTitle && achievementDescription) {
            success = await socialSharing.shareAchievement(
              achievementTitle,
              achievementDescription
            );
          }
          break;
        case 'referral':
          if (referralCode) {
            success = await socialSharing.shareReferral(referralCode);
          }
          break;
      }

      if (success) {
        onShare?.();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const styles = StyleSheet.create({
    button: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
    },
    modalHeader: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
    },
    platformGrid: {
      paddingHorizontal: 20,
      gap: 12,
    },
    platformButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    platformIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    platformLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
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

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowModal(true)}
        disabled={isSharing}
      >
        <IconSymbol size={16} name="paperplane.fill" color={colors.background} />
        <Text style={styles.buttonText}>Share</Text>
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
              <Text style={styles.modalTitle}>Share on Social Media</Text>
            </View>

            <ScrollView style={styles.platformGrid} scrollEnabled={false}>
              {SOCIAL_PLATFORMS.map((platform) => (
                <TouchableOpacity
                  key={platform.id}
                  style={styles.platformButton}
                  onPress={() => handleShare(platform.id)}
                  disabled={isSharing}
                >
                  <View
                    style={[
                      styles.platformIcon,
                      { backgroundColor: `${platform.color}20` },
                    ]}
                  >
                    <IconSymbol size={20} name={platform.icon as any} color={platform.color} />
                  </View>
                  <Text style={styles.platformLabel}>{platform.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
              disabled={isSharing}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

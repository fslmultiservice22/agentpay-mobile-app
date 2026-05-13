import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

interface NotificationData {
  title: string;
  body: string;
  type: 'transaction' | 'alert' | 'info';
  transactionHash?: string;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  const registerForPushNotifications = async () => {
    try {
      if (Platform.OS === 'web') {
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync();
      setExpoPushToken(token.data);
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  const sendTransactionNotification = async (data: NotificationData) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: {
            type: data.type,
            transactionHash: data.transactionHash,
          },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const sendTransactionConfirmedNotification = (hash: string, amount: string) => {
    return sendTransactionNotification({
      title: 'Transaction Confirmed',
      body: `Your transaction of ${amount} ETH has been confirmed`,
      type: 'transaction',
      transactionHash: hash,
    });
  };

  const sendTransactionPendingNotification = (hash: string, amount: string) => {
    return sendTransactionNotification({
      title: 'Transaction Pending',
      body: `Your transaction of ${amount} ETH is being processed`,
      type: 'transaction',
      transactionHash: hash,
    });
  };

  const sendTransactionFailedNotification = (hash: string, reason: string) => {
    return sendTransactionNotification({
      title: 'Transaction Failed',
      body: `Your transaction failed: ${reason}`,
      type: 'alert',
      transactionHash: hash,
    });
  };

  return {
    expoPushToken,
    notification,
    sendTransactionNotification,
    sendTransactionConfirmedNotification,
    sendTransactionPendingNotification,
    sendTransactionFailedNotification,
  };
}
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'it' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko';

export interface Translations {
  [key: string]: string | Translations;
}

const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    common: {
      home: 'Home',
      settings: 'Settings',
      portfolio: 'Portfolio',
      trading: 'Trading',
      notifications: 'Notifications',
      logout: 'Logout',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
    },
    wallet: {
      connect: 'Connect Wallet',
      disconnect: 'Disconnect',
      balance: 'Balance',
      send: 'Send',
      receive: 'Receive',
      swap: 'Swap',
      stake: 'Stake',
      unstake: 'Unstake',
      transactions: 'Transactions',
    },
    messages: {
      welcomeBack: 'Welcome back!',
      connectWalletFirst: 'Please connect your wallet first',
      transactionSuccessful: 'Transaction successful',
      transactionFailed: 'Transaction failed',
      insufficientBalance: 'Insufficient balance',
    },
  },
  it: {
    common: {
      home: 'Home',
      settings: 'Impostazioni',
      portfolio: 'Portafoglio',
      trading: 'Trading',
      notifications: 'Notifiche',
      logout: 'Esci',
      loading: 'Caricamento...',
      error: 'Errore',
      success: 'Successo',
      cancel: 'Annulla',
      confirm: 'Conferma',
      save: 'Salva',
      delete: 'Elimina',
      edit: 'Modifica',
      close: 'Chiudi',
    },
    wallet: {
      connect: 'Connetti Portafoglio',
      disconnect: 'Disconnetti',
      balance: 'Saldo',
      send: 'Invia',
      receive: 'Ricevi',
      swap: 'Scambia',
      stake: 'Stake',
      unstake: 'Unstake',
      transactions: 'Transazioni',
    },
    messages: {
      welcomeBack: 'Bentornato!',
      connectWalletFirst: 'Per favore connetti il tuo portafoglio prima',
      transactionSuccessful: 'Transazione riuscita',
      transactionFailed: 'Transazione fallita',
      insufficientBalance: 'Saldo insufficiente',
    },
  },
  es: {
    common: {
      home: 'Inicio',
      settings: 'Configuración',
      portfolio: 'Cartera',
      trading: 'Trading',
      notifications: 'Notificaciones',
      logout: 'Cerrar sesión',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
    },
    wallet: {
      connect: 'Conectar Cartera',
      disconnect: 'Desconectar',
      balance: 'Saldo',
      send: 'Enviar',
      receive: 'Recibir',
      swap: 'Intercambiar',
      stake: 'Stake',
      unstake: 'Unstake',
      transactions: 'Transacciones',
    },
    messages: {
      welcomeBack: '¡Bienvenido de vuelta!',
      connectWalletFirst: 'Por favor conecta tu cartera primero',
      transactionSuccessful: 'Transacción exitosa',
      transactionFailed: 'Transacción fallida',
      insufficientBalance: 'Saldo insuficiente',
    },
  },
  fr: {
    common: {
      home: 'Accueil',
      settings: 'Paramètres',
      portfolio: 'Portefeuille',
      trading: 'Trading',
      notifications: 'Notifications',
      logout: 'Déconnexion',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      save: 'Enregistrer',
      delete: 'Supprimer',
      edit: 'Modifier',
      close: 'Fermer',
    },
    wallet: {
      connect: 'Connecter le portefeuille',
      disconnect: 'Déconnecter',
      balance: 'Solde',
      send: 'Envoyer',
      receive: 'Recevoir',
      swap: 'Échanger',
      stake: 'Stake',
      unstake: 'Unstake',
      transactions: 'Transactions',
    },
    messages: {
      welcomeBack: 'Bienvenue!',
      connectWalletFirst: 'Veuillez connecter votre portefeuille d\'abord',
      transactionSuccessful: 'Transaction réussie',
      transactionFailed: 'Transaction échouée',
      insufficientBalance: 'Solde insuffisant',
    },
  },
  de: {
    common: {
      home: 'Startseite',
      settings: 'Einstellungen',
      portfolio: 'Portfolio',
      trading: 'Trading',
      notifications: 'Benachrichtigungen',
      logout: 'Abmelden',
      loading: 'Wird geladen...',
      error: 'Fehler',
      success: 'Erfolg',
      cancel: 'Abbrechen',
      confirm: 'Bestätigen',
      save: 'Speichern',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      close: 'Schließen',
    },
    wallet: {
      connect: 'Geldbörse verbinden',
      disconnect: 'Trennen',
      balance: 'Guthaben',
      send: 'Senden',
      receive: 'Empfangen',
      swap: 'Tauschen',
      stake: 'Stake',
      unstake: 'Unstake',
      transactions: 'Transaktionen',
    },
    messages: {
      welcomeBack: 'Willkommen zurück!',
      connectWalletFirst: 'Bitte verbinden Sie zuerst Ihre Geldbörse',
      transactionSuccessful: 'Transaktion erfolgreich',
      transactionFailed: 'Transaktion fehlgeschlagen',
      insufficientBalance: 'Unzureichendes Guthaben',
    },
  },
  zh: {
    common: {
      home: '首页',
      settings: '设置',
      portfolio: '投资组合',
      trading: '交易',
      notifications: '通知',
      logout: '登出',
      loading: '加载中...',
      error: '错误',
      success: '成功',
      cancel: '取消',
      confirm: '确认',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      close: '关闭',
    },
    wallet: {
      connect: '连接钱包',
      disconnect: '断开连接',
      balance: '余额',
      send: '发送',
      receive: '接收',
      swap: '交换',
      stake: '质押',
      unstake: '取消质押',
      transactions: '交易',
    },
    messages: {
      welcomeBack: '欢迎回来!',
      connectWalletFirst: '请先连接您的钱包',
      transactionSuccessful: '交易成功',
      transactionFailed: '交易失败',
      insufficientBalance: '余额不足',
    },
  },
  ja: {
    common: {
      home: 'ホーム',
      settings: '設定',
      portfolio: 'ポートフォリオ',
      trading: 'トレーディング',
      notifications: '通知',
      logout: 'ログアウト',
      loading: '読み込み中...',
      error: 'エラー',
      success: '成功',
      cancel: 'キャンセル',
      confirm: '確認',
      save: '保存',
      delete: '削除',
      edit: '編集',
      close: '閉じる',
    },
    wallet: {
      connect: 'ウォレットを接続',
      disconnect: '切断',
      balance: '残高',
      send: '送信',
      receive: '受け取る',
      swap: 'スワップ',
      stake: 'ステーク',
      unstake: 'アンステーク',
      transactions: 'トランザクション',
    },
    messages: {
      welcomeBack: 'おかえりなさい!',
      connectWalletFirst: 'まずウォレットを接続してください',
      transactionSuccessful: 'トランザクション成功',
      transactionFailed: 'トランザクション失敗',
      insufficientBalance: '残高不足',
    },
  },
  ko: {
    common: {
      home: '홈',
      settings: '설정',
      portfolio: '포트폴리오',
      trading: '거래',
      notifications: '알림',
      logout: '로그아웃',
      loading: '로딩 중...',
      error: '오류',
      success: '성공',
      cancel: '취소',
      confirm: '확인',
      save: '저장',
      delete: '삭제',
      edit: '편집',
      close: '닫기',
    },
    wallet: {
      connect: '지갑 연결',
      disconnect: '연결 해제',
      balance: '잔액',
      send: '보내기',
      receive: '받기',
      swap: '스왑',
      stake: '스테이킹',
      unstake: '언스테이킹',
      transactions: '거래',
    },
    messages: {
      welcomeBack: '돌아오셨습니다!',
      connectWalletFirst: '먼저 지갑을 연결하세요',
      transactionSuccessful: '거래 성공',
      transactionFailed: '거래 실패',
      insufficientBalance: '잔액 부족',
    },
  },
};

export function useI18n() {
  const [language, setLanguage] = useState<Language>('en');
  const [translations, setTranslations] = useState<Translations>(TRANSLATIONS.en);

  // Load language from storage
  const loadLanguage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('agentpay_language');
      if (stored && TRANSLATIONS[stored as Language]) {
        setLanguage(stored as Language);
        setTranslations(TRANSLATIONS[stored as Language]);
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  }, []);

  // Change language
  const changeLanguage = useCallback(
    async (newLanguage: Language) => {
      try {
        setLanguage(newLanguage);
        setTranslations(TRANSLATIONS[newLanguage]);
        await AsyncStorage.setItem('agentpay_language', newLanguage);
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    },
    []
  );

  // Get translation
  const t = useCallback(
    (key: string, defaultValue?: string): string => {
      const keys = key.split('.');
      let value: any = translations;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return defaultValue || key;
        }
      }

      return typeof value === 'string' ? value : defaultValue || key;
    },
    [translations]
  );

  // Get available languages
  const getAvailableLanguages = useCallback((): Language[] => {
    return Object.keys(TRANSLATIONS) as Language[];
  }, []);

  // Initialize on mount
  useEffect(() => {
    loadLanguage();
  }, [loadLanguage]);

  return {
    language,
    translations,
    t,
    changeLanguage,
    getAvailableLanguages,
    loadLanguage,
  };
}

/**
 * i18n Localization Service
 * Multi-language support for English, Italian, Spanish, French
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'it' | 'es' | 'fr';

export interface LocalizationStrings {
  [key: string]: string | LocalizationStrings;
}

export interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

class I18nService {
  private currentLanguage: Language = 'en';
  private readonly LANGUAGE_STORAGE_KEY = 'i18n_language';
  private listeners: Set<() => void> = new Set();

  private readonly SUPPORTED_LANGUAGES: Record<Language, LanguageConfig> = {
    en: { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
    it: { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
    es: { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
    fr: { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  };

  private readonly translations: Record<Language, LocalizationStrings> = {
    en: {
      common: {
        app_name: 'AgentPay',
        welcome: 'Welcome to AgentPay',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        cancel: 'Cancel',
        confirm: 'Confirm',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        skip: 'Skip',
      },
      auth: {
        login: 'Login',
        logout: 'Logout',
        sign_up: 'Sign Up',
        email: 'Email',
        password: 'Password',
        pin: 'PIN',
        biometric: 'Biometric',
        face_id: 'Face ID',
        fingerprint: 'Fingerprint',
        invalid_credentials: 'Invalid credentials',
        account_locked: 'Account locked',
      },
      wallet: {
        connect_wallet: 'Connect Wallet',
        wallet_address: 'Wallet Address',
        balance: 'Balance',
        send: 'Send',
        receive: 'Receive',
        swap: 'Swap',
        portfolio: 'Portfolio',
        holdings: 'Holdings',
        transactions: 'Transactions',
      },
      bank: {
        connect_bank: 'Connect Bank',
        bank_account: 'Bank Account',
        iban: 'IBAN',
        transfer: 'Transfer',
        recipient: 'Recipient',
        amount: 'Amount',
        currency: 'Currency',
        fee: 'Fee',
      },
      portfolio: {
        dashboard: 'Dashboard',
        total_value: 'Total Value',
        change_24h: '24h Change',
        change_7d: '7d Change',
        change_30d: '30d Change',
        performance: 'Performance',
        roi: 'ROI',
        top_performers: 'Top Performers',
        worst_performers: 'Worst Performers',
      },
      notifications: {
        transaction_sent: 'Transaction sent',
        transaction_received: 'Transaction received',
        price_alert: 'Price alert',
        payment_scheduled: 'Payment scheduled',
        payment_completed: 'Payment completed',
        enable_notifications: 'Enable notifications',
        disable_notifications: 'Disable notifications',
      },
      settings: {
        settings: 'Settings',
        account: 'Account',
        security: 'Security',
        notifications: 'Notifications',
        appearance: 'Appearance',
        language: 'Language',
        theme: 'Theme',
        dark_mode: 'Dark Mode',
        light_mode: 'Light Mode',
        about: 'About',
        version: 'Version',
      },
      errors: {
        network_error: 'Network error',
        invalid_input: 'Invalid input',
        transaction_failed: 'Transaction failed',
        insufficient_balance: 'Insufficient balance',
        invalid_iban: 'Invalid IBAN',
      },
    },
    it: {
      common: {
        app_name: 'AgentPay',
        welcome: 'Benvenuto in AgentPay',
        loading: 'Caricamento...',
        error: 'Errore',
        success: 'Successo',
        cancel: 'Annulla',
        confirm: 'Conferma',
        save: 'Salva',
        delete: 'Elimina',
        edit: 'Modifica',
        close: 'Chiudi',
        back: 'Indietro',
        next: 'Avanti',
        skip: 'Salta',
      },
      auth: {
        login: 'Accedi',
        logout: 'Esci',
        sign_up: 'Registrati',
        email: 'Email',
        password: 'Password',
        pin: 'PIN',
        biometric: 'Biometrico',
        face_id: 'Face ID',
        fingerprint: 'Impronta digitale',
        invalid_credentials: 'Credenziali non valide',
        account_locked: 'Account bloccato',
      },
      wallet: {
        connect_wallet: 'Connetti Wallet',
        wallet_address: 'Indirizzo Wallet',
        balance: 'Saldo',
        send: 'Invia',
        receive: 'Ricevi',
        swap: 'Scambia',
        portfolio: 'Portafoglio',
        holdings: 'Partecipazioni',
        transactions: 'Transazioni',
      },
      bank: {
        connect_bank: 'Connetti Banca',
        bank_account: 'Conto Bancario',
        iban: 'IBAN',
        transfer: 'Trasferimento',
        recipient: 'Destinatario',
        amount: 'Importo',
        currency: 'Valuta',
        fee: 'Commissione',
      },
      portfolio: {
        dashboard: 'Dashboard',
        total_value: 'Valore Totale',
        change_24h: 'Variazione 24h',
        change_7d: 'Variazione 7g',
        change_30d: 'Variazione 30g',
        performance: 'Performance',
        roi: 'ROI',
        top_performers: 'Migliori Performer',
        worst_performers: 'Peggiori Performer',
      },
      notifications: {
        transaction_sent: 'Transazione inviata',
        transaction_received: 'Transazione ricevuta',
        price_alert: 'Avviso di prezzo',
        payment_scheduled: 'Pagamento programmato',
        payment_completed: 'Pagamento completato',
        enable_notifications: 'Abilita notifiche',
        disable_notifications: 'Disabilita notifiche',
      },
      settings: {
        settings: 'Impostazioni',
        account: 'Account',
        security: 'Sicurezza',
        notifications: 'Notifiche',
        appearance: 'Aspetto',
        language: 'Lingua',
        theme: 'Tema',
        dark_mode: 'Modalità Scura',
        light_mode: 'Modalità Chiara',
        about: 'Informazioni',
        version: 'Versione',
      },
      errors: {
        network_error: 'Errore di rete',
        invalid_input: 'Input non valido',
        transaction_failed: 'Transazione fallita',
        insufficient_balance: 'Saldo insufficiente',
        invalid_iban: 'IBAN non valido',
      },
    },
    es: {
      common: {
        app_name: 'AgentPay',
        welcome: 'Bienvenido a AgentPay',
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        save: 'Guardar',
        delete: 'Eliminar',
        edit: 'Editar',
        close: 'Cerrar',
        back: 'Atrás',
        next: 'Siguiente',
        skip: 'Omitir',
      },
      auth: {
        login: 'Iniciar sesión',
        logout: 'Cerrar sesión',
        sign_up: 'Registrarse',
        email: 'Correo electrónico',
        password: 'Contraseña',
        pin: 'PIN',
        biometric: 'Biométrico',
        face_id: 'Face ID',
        fingerprint: 'Huella dactilar',
        invalid_credentials: 'Credenciales inválidas',
        account_locked: 'Cuenta bloqueada',
      },
      wallet: {
        connect_wallet: 'Conectar Wallet',
        wallet_address: 'Dirección de Wallet',
        balance: 'Saldo',
        send: 'Enviar',
        receive: 'Recibir',
        swap: 'Intercambiar',
        portfolio: 'Cartera',
        holdings: 'Tenencias',
        transactions: 'Transacciones',
      },
      bank: {
        connect_bank: 'Conectar Banco',
        bank_account: 'Cuenta Bancaria',
        iban: 'IBAN',
        transfer: 'Transferencia',
        recipient: 'Destinatario',
        amount: 'Cantidad',
        currency: 'Moneda',
        fee: 'Tarifa',
      },
      portfolio: {
        dashboard: 'Panel de control',
        total_value: 'Valor Total',
        change_24h: 'Cambio 24h',
        change_7d: 'Cambio 7d',
        change_30d: 'Cambio 30d',
        performance: 'Rendimiento',
        roi: 'ROI',
        top_performers: 'Mejores Rendimientos',
        worst_performers: 'Peores Rendimientos',
      },
      notifications: {
        transaction_sent: 'Transacción enviada',
        transaction_received: 'Transacción recibida',
        price_alert: 'Alerta de precio',
        payment_scheduled: 'Pago programado',
        payment_completed: 'Pago completado',
        enable_notifications: 'Habilitar notificaciones',
        disable_notifications: 'Deshabilitar notificaciones',
      },
      settings: {
        settings: 'Configuración',
        account: 'Cuenta',
        security: 'Seguridad',
        notifications: 'Notificaciones',
        appearance: 'Apariencia',
        language: 'Idioma',
        theme: 'Tema',
        dark_mode: 'Modo Oscuro',
        light_mode: 'Modo Claro',
        about: 'Acerca de',
        version: 'Versión',
      },
      errors: {
        network_error: 'Error de red',
        invalid_input: 'Entrada inválida',
        transaction_failed: 'Transacción fallida',
        insufficient_balance: 'Saldo insuficiente',
        invalid_iban: 'IBAN inválido',
      },
    },
    fr: {
      common: {
        app_name: 'AgentPay',
        welcome: 'Bienvenue sur AgentPay',
        loading: 'Chargement...',
        error: 'Erreur',
        success: 'Succès',
        cancel: 'Annuler',
        confirm: 'Confirmer',
        save: 'Enregistrer',
        delete: 'Supprimer',
        edit: 'Modifier',
        close: 'Fermer',
        back: 'Retour',
        next: 'Suivant',
        skip: 'Ignorer',
      },
      auth: {
        login: 'Connexion',
        logout: 'Déconnexion',
        sign_up: 'S\'inscrire',
        email: 'Email',
        password: 'Mot de passe',
        pin: 'PIN',
        biometric: 'Biométrique',
        face_id: 'Face ID',
        fingerprint: 'Empreinte digitale',
        invalid_credentials: 'Identifiants invalides',
        account_locked: 'Compte verrouillé',
      },
      wallet: {
        connect_wallet: 'Connecter Wallet',
        wallet_address: 'Adresse Wallet',
        balance: 'Solde',
        send: 'Envoyer',
        receive: 'Recevoir',
        swap: 'Échanger',
        portfolio: 'Portefeuille',
        holdings: 'Avoirs',
        transactions: 'Transactions',
      },
      bank: {
        connect_bank: 'Connecter Banque',
        bank_account: 'Compte Bancaire',
        iban: 'IBAN',
        transfer: 'Transfert',
        recipient: 'Destinataire',
        amount: 'Montant',
        currency: 'Devise',
        fee: 'Frais',
      },
      portfolio: {
        dashboard: 'Tableau de bord',
        total_value: 'Valeur Totale',
        change_24h: 'Changement 24h',
        change_7d: 'Changement 7j',
        change_30d: 'Changement 30j',
        performance: 'Performance',
        roi: 'ROI',
        top_performers: 'Meilleurs Rendements',
        worst_performers: 'Pires Rendements',
      },
      notifications: {
        transaction_sent: 'Transaction envoyée',
        transaction_received: 'Transaction reçue',
        price_alert: 'Alerte de prix',
        payment_scheduled: 'Paiement programmé',
        payment_completed: 'Paiement terminé',
        enable_notifications: 'Activer les notifications',
        disable_notifications: 'Désactiver les notifications',
      },
      settings: {
        settings: 'Paramètres',
        account: 'Compte',
        security: 'Sécurité',
        notifications: 'Notifications',
        appearance: 'Apparence',
        language: 'Langue',
        theme: 'Thème',
        dark_mode: 'Mode Sombre',
        light_mode: 'Mode Clair',
        about: 'À propos',
        version: 'Version',
      },
      errors: {
        network_error: 'Erreur réseau',
        invalid_input: 'Entrée invalide',
        transaction_failed: 'Échec de la transaction',
        insufficient_balance: 'Solde insuffisant',
        invalid_iban: 'IBAN invalide',
      },
    },
  };

  constructor() {
    this.loadLanguage();
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageConfig[] {
    return Object.values(this.SUPPORTED_LANGUAGES);
  }

  /**
   * Set language
   */
  async setLanguage(language: Language): Promise<boolean> {
    if (!this.SUPPORTED_LANGUAGES[language]) {
      return false;
    }

    this.currentLanguage = language;
    await this.persistLanguage();
    this.notifyListeners();

    return true;
  }

  /**
   * Get translation string
   */
  t(key: string, defaultValue?: string): string {
    const keys = key.split('.');
    let value: any = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue || key;
      }
    }

    return typeof value === 'string' ? value : defaultValue || key;
  }

  /**
   * Get all translations for current language
   */
  getTranslations(): LocalizationStrings {
    return this.translations[this.currentLanguage];
  }

  /**
   * Subscribe to language changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners of language change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Persist language to storage
   */
  private async persistLanguage(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.LANGUAGE_STORAGE_KEY, this.currentLanguage);
    } catch (error) {
      console.error('Failed to persist language:', error);
    }
  }

  /**
   * Load language from storage
   */
  private async loadLanguage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.LANGUAGE_STORAGE_KEY);
      if (stored && this.SUPPORTED_LANGUAGES[stored as Language]) {
        this.currentLanguage = stored as Language;
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  }
}

export const i18nService = new I18nService();

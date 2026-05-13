import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { Platform, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useMetaMaskConnection } from '@/hooks/use-metamask-connection';
import { useWalletConnect } from '@/hooks/use-walletconnect';
import { useTransactionSigning } from '@/hooks/use-transaction-signing';
import { useBalanceSync } from '@/hooks/use-balance-sync';
import { useTransactionHistory, type Transaction } from '@/hooks/use-transaction-history';
import { useGasEstimation, type GasEstimate } from '@/hooks/use-gas-estimation';
import { useTokenSwap, type Token, type SwapQuote } from '@/hooks/use-token-swap';
import { usePortfolioDashboard, type PortfolioAsset, type PortfolioMetrics } from '@/hooks/use-portfolio-dashboard';
import { useStaking, type StakingPool, type StakingPosition } from '@/hooks/use-staking';
import { useLimitOrders, type LimitOrder } from '@/hooks/use-limit-orders';
import { usePriceAlerts, type PriceAlert } from '@/hooks/use-price-alerts';
import { useDefiFarming, type FarmingPool, type FarmingPosition, type YieldData } from '@/hooks/use-defi-farming';
import { useNFTGallery, type NFT, type NFTCollection } from '@/hooks/use-nft-gallery';
import { useDAOGovernance, type DAOProposal, type DAOMember, type DAOTreasury } from '@/hooks/use-dao-governance';
import { useAnalyticsDashboard, type AnalyticsData, type ChartData } from '@/hooks/use-analytics-dashboard';
import { useCrossChainBridge, type Chain, type BridgeToken, type BridgeTransaction } from '@/hooks/use-cross-chain-bridge';
import { usePriceFeeds, type PriceData } from '@/hooks/use-price-feeds';
import { useAdvancedNotifications, type NotificationPreferences, type StoredNotification } from '@/hooks/use-advanced-notifications';
import { useBiometricAuth, type BiometricAuthState } from '@/hooks/use-biometric-auth';
import { useBackupRecovery, type BackupData, type RecoveryStatus } from '@/hooks/use-backup-recovery';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  balance: string | null;
  network: string | null;
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  connect: (type: 'metamask' | 'walletconnect' | 'local') => Promise<void>;
  disconnect: () => void;
  getBalance: () => Promise<string>;
  sendTransaction: (to: string, amount: string) => Promise<string>;
  signTransaction: (to: string, amount: string) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  error: string | null;
  checkMetaMaskInstalled?: () => Promise<boolean>;
  balanceSyncEnabled?: boolean;
  setBalanceSyncEnabled?: (enabled: boolean) => void;
  // Transaction History
  transactions?: Transaction[];
  addTransaction?: (tx: Transaction) => Promise<void>;
  updateTransactionStatus?: (txHash: string, status: 'pending' | 'confirmed' | 'failed', blockNumber?: number) => Promise<void>;
  // Gas Estimation
  estimateGas?: (to: string, value: string) => Promise<GasEstimate | null>;
  getGasPrice?: () => Promise<string | null>;
  // Token Swap
  supportedTokens?: Token[];
  getSwapQuote?: (inputToken: Token, outputToken: Token, inputAmount: string) => Promise<SwapQuote | null>;
  executeSwap?: (quote: SwapQuote) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  // Portfolio Dashboard
  portfolioAssets?: PortfolioAsset[];
  portfolioMetrics?: PortfolioMetrics | null;
  updatePortfolio?: (assets: PortfolioAsset[]) => Promise<void>;
  getPortfolioValueHistory?: (days: number) => Array<{ timestamp: number; value: number }>;
  calculateTotalReturn?: () => number;
  // Staking
  stakingPools?: StakingPool[];
  stakingPositions?: StakingPosition[];
  stake?: (poolId: string, amount: string) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  unstake?: (poolId: string, amount: string) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  claimRewards?: (poolId: string) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  // Limit Orders
  limitOrders?: LimitOrder[];
  createLimitOrder?: (fromToken: string, toToken: string, fromAmount: string, toAmount: string, triggerPrice: string) => Promise<LimitOrder | null>;
  cancelOrder?: (orderId: string) => Promise<boolean>;
  getActiveOrders?: () => LimitOrder[];
  getFilledOrders?: () => LimitOrder[];
  // Price Alerts
  priceAlerts?: PriceAlert[];
  createPriceAlert?: (token: string, symbol: string, targetPrice: string, condition: 'above' | 'below') => Promise<PriceAlert | null>;
  cancelPriceAlert?: (alertId: string) => Promise<boolean>;
  getActivePriceAlerts?: () => PriceAlert[];
  // DeFi Farming
  farmingPools?: FarmingPool[];
  farmingPositions?: FarmingPosition[];
  depositFarming?: (poolId: string, amount: string) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  withdrawFarming?: (poolId: string) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  claimFarmingRewards?: (poolId: string) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  getTotalFarmingYield?: () => YieldData;
  // NFT Gallery
  nfts?: NFT[];
  addNFT?: (nft: NFT) => Promise<boolean>;
  removeNFT?: (nftId: string) => Promise<boolean>;
  updateNFTPrice?: (nftId: string, currentPrice: string) => Promise<boolean>;
  getNFTsByCollection?: (collection: string) => NFT[];
  getNFTsByRarity?: (rarity: NFT['rarity']) => NFT[];
  calculateNFTGalleryValue?: () => string;
  getNFTGalleryStats?: () => any;
  // DAO Governance
  daoProposals?: DAOProposal[];
  daoMembers?: DAOMember[];
  daoTreasury?: DAOTreasury | null;
  createDAOProposal?: (title: string, description: string) => Promise<{ success: boolean; proposalId?: string; error?: string }>;
  castDAOVote?: (proposalId: string, support: 0 | 1 | 2) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  delegateDAOVotes?: (delegatee: string) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  executeDAOProposal?: (proposalId: string) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  getDAOProposalStats?: () => any;
  // Analytics Dashboard
  analyticsMetrics?: AnalyticsData | null;
  analyticsChartData?: ChartData | null;
  loadAnalytics?: () => Promise<void>;
  getAnalyticsChartDataForPeriod?: (days: number) => ChartData;
  getAnalyticsPerformanceStats?: () => any;
  // Cross-chain Bridge
  bridgeChains?: Chain[];
  bridgeTokens?: BridgeToken[];
  bridgeTransactions?: BridgeTransaction[];
  initiateBridge?: (sourceChain: number, destinationChain: number, token: string, amount: string) => Promise<{ success: boolean; transactionId?: string; error?: string }>;
  getBridgeFee?: (sourceChain: number, destinationChain: number, amount: string) => string;
  estimateBridgeTime?: (sourceChain: number, destinationChain: number) => string;
  getBridgeStats?: () => any;
  // Price Feeds
  prices?: Record<string, PriceData>;
  getPrice?: (symbol: string) => PriceData | null;
  getPrices?: (symbols: string[]) => PriceData[];
  startPricePolling?: (symbols: string[], intervalMs?: number) => void;
  stopPricePolling?: () => void;
  calculateValue?: (symbol: string, amount: string, targetCurrency?: string) => string;
  convertBetweenTokens?: (fromSymbol: string, toSymbol: string, fromAmount: string) => string;
  // Advanced Notifications
  notifications?: StoredNotification[];
  notificationPreferences?: NotificationPreferences;
  sendNotification?: (title: string, body: string, type: StoredNotification['type'], data?: Record<string, any>) => Promise<boolean>;
  updateNotificationPreferences?: (newPreferences: Partial<NotificationPreferences>) => Promise<boolean>;
  markNotificationAsRead?: (notificationId: string) => Promise<boolean>;
  deleteNotification?: (notificationId: string) => Promise<boolean>;
  getUnreadNotificationCount?: () => number;
  getNotificationsByType?: (type: StoredNotification['type']) => StoredNotification[];
  // Biometric Authentication
  biometricAuth?: BiometricAuthState & {
    authenticate: () => Promise<boolean>;
    enableBiometric: () => Promise<boolean>;
    disableBiometric: () => Promise<boolean>;
    logout: () => Promise<void>;
  };
  // Backup & Recovery
  backupData?: BackupData | null;
  recoveryStatus?: RecoveryStatus;
  backupSeedPhrase?: (seedPhrase: string, password: string, method?: 'local' | 'cloud') => Promise<boolean>;
  recoverFromSeedPhrase?: (seedPhrase: string, password: string) => Promise<{ success: boolean; address?: string; error?: string }>;
  verifyBackup?: (seedPhrase: string) => Promise<boolean>;
  deleteBackup?: () => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const METAMASK_DEEPLINK = 'https://metamask.app.link/dapp/';
const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/demo';

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balanceSyncEnabled, setBalanceSyncEnabled] = useState(true);
  const { checkMetaMaskInstalled } = useMetaMaskConnection();
  const { connect: connectWC, disconnect: disconnectWC, isConnected: wcConnected, session: wcSession } = useWalletConnect();
  const { signTransaction: signTx, signMessage: signMsg } = useTransactionSigning();
  const { transactions: txHistory, addTransaction, updateTransactionStatus } = useTransactionHistory(address, provider);
  const { estimateGas, getGasPrice } = useGasEstimation(provider);
  const { supportedTokens, getSwapQuote, executeSwap } = useTokenSwap(provider, signer);
  const { currentPortfolio, metrics: portfolioMetrics, updatePortfolio, getPortfolioValueHistory, calculateTotalReturn } = usePortfolioDashboard(address);
  const { pools: stakingPools, positions: stakingPositions, stake, unstake, claimRewards } = useStaking(signer);
  const { orders: limitOrders, createLimitOrder, cancelOrder, getActiveOrders, getFilledOrders } = useLimitOrders(address);
  const { alerts: priceAlerts, createAlert: createPriceAlert, cancelAlert: cancelPriceAlert, getActiveAlerts: getActivePriceAlerts } = usePriceAlerts(address);
  const { pools: farmingPools, positions: farmingPositions, deposit: depositFarming, withdraw: withdrawFarming, claimRewards: claimFarmingRewards, getTotalYield: getTotalFarmingYield } = useDefiFarming(signer);
  const { nfts, addNFT, removeNFT, updateNFTPrice, getNFTsByCollection, getNFTsByRarity, calculateTotalValue: calculateNFTGalleryValue, getGalleryStats: getNFTGalleryStats } = useNFTGallery(address);
  const { proposals: daoProposals, members: daoMembers, treasury: daoTreasury, createProposal: createDAOProposal, castVote: castDAOVote, delegateVotes: delegateDAOVotes, executeProposal: executeDAOProposal, getProposalStats: getDAOProposalStats } = useDAOGovernance(signer);
  const { metrics: analyticsMetrics, chartData: analyticsChartData, loadAnalytics, getChartDataForPeriod: getAnalyticsChartDataForPeriod, getPerformanceStats: getAnalyticsPerformanceStats } = useAnalyticsDashboard(address);
  const { chains: bridgeChains, tokens: bridgeTokens, transactions: bridgeTransactions, initiateBridge, getBridgeFee, estimateBridgeTime, getBridgeStats } = useCrossChainBridge(signer);
  const { prices, getPrice, getPrices, startPricePolling, stopPricePolling, calculateValue, convertBetweenTokens } = usePriceFeeds();
  const { notifications, preferences: notificationPreferences, sendNotification, updatePreferences: updateNotificationPreferences, markAsRead: markNotificationAsRead, deleteNotification, getUnreadCount: getUnreadNotificationCount, getNotificationsByType } = useAdvancedNotifications(address);
  const { isAvailable: biometricIsAvailable, isFaceIDAvailable, isTouchIDAvailable, isEnabled: biometricIsEnabled, isAuthenticated, isLoading: biometricIsLoading, error: biometricError, authenticate, enableBiometric, disableBiometric, logout } = useBiometricAuth();
  const { backupData, recoveryStatus, backupSeedPhrase, recoverFromSeedPhrase, verifyBackup, deleteBackup } = useBackupRecovery(address);
  
  const balanceSyncConfig = useMemo(
    () => ({
      address: address || '',
      provider,
      interval: 10000,
      enabled: balanceSyncEnabled && isConnected,
    }),
    [address, provider, balanceSyncEnabled, isConnected],
  );

  const { balance: syncedBalance, refresh: refreshBalance } = useBalanceSync(balanceSyncConfig);

  // Inizializza provider Sepolia
  useEffect(() => {
    const initProvider = async () => {
      try {
        const ethProvider = new ethers.JsonRpcProvider(RPC_URL);
        setProvider(ethProvider);
        setNetwork('sepolia');
      } catch (err) {
        console.error('Provider initialization error:', err);
        setError('Failed to initialize provider');
      }
    };
    initProvider();
  }, []);

  // Connessione MetaMask
  const connectMetaMask = useCallback(async () => {
    try {
      setError(null);

      // Verifica se MetaMask è installato
      const metamaskUrl = Platform.OS === 'android' ? 'metamask://' : 'metamask://';
      const isInstalled = await Linking.canOpenURL(metamaskUrl);

      if (!isInstalled) {
        // Prova ad aprire il link di download
        const storeUrl = Platform.OS === 'android'
          ? 'https://play.google.com/store/apps/details?id=io.metamask'
          : 'https://apps.apple.com/app/metamask/id1438144202';
        
        await Linking.openURL(storeUrl);
        setError('MetaMask not installed. Opening app store...');
        return;
      }

      // Genera un ID univoco per la sessione
      const sessionId = `agentpay_${Date.now()}`;
      await SecureStore.setItemAsync('metamask_session_id', sessionId);

      // Costruisci l'URL di deep linking
      const deepLinkUrl = `metamask://dapp?url=agentpay://wallet-connect&sessionId=${sessionId}`;

      // Apri MetaMask
      await Linking.openURL(deepLinkUrl);

      // Simula la connessione con delay
      setTimeout(async () => {
        try {
          const testProvider = new ethers.JsonRpcProvider(RPC_URL);
          const testAddress = '0x' + 'a'.repeat(40);
          
          setAddress(testAddress);
          setIsConnected(true);
          setProvider(testProvider);
          
          try {
            const bal = await testProvider.getBalance(testAddress);
            setBalance(ethers.formatEther(bal));
          } catch (balErr) {
            setBalance('0');
          }
        } catch (err) {
          console.error('MetaMask connection error:', err);
          setError('Failed to connect to MetaMask');
        }
      }, 2000);
    } catch (err) {
      console.error('MetaMask connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, []);

  // Connessione WalletConnect
  const connectWalletConnect = useCallback(async () => {
    try {
      setError(null);
      const result = await connectWC();
      
      if (result.success && result.address) {
        setAddress(result.address);
        setIsConnected(true);
        setNetwork('sepolia');
        setBalance('0');
      } else {
        setError(result.error || 'WalletConnect connection failed');
      }
    } catch (err) {
      console.error('WalletConnect connection error:', err);
      setError('WalletConnect connection failed');
    }
  }, [connectWC]);

  // Connessione locale (test)
  const connectLocal = useCallback(async () => {
    try {
      setError(null);
      
      // Crea un wallet locale per il test
      const wallet = ethers.Wallet.createRandom();
      const testProvider = new ethers.JsonRpcProvider(RPC_URL);
      const connectedWallet = wallet.connect(testProvider);

      setAddress(wallet.address);
      setIsConnected(true);
      setSigner(connectedWallet);
      setProvider(testProvider);
      setBalance('0.5'); // Balance di test
      
      // Salva il wallet privato in SecureStore (solo per test)
      await SecureStore.setItemAsync('test_wallet_pk', wallet.privateKey);
    } catch (err) {
      console.error('Local connection error:', err);
      setError('Failed to create local wallet');
    }
  }, []);

  const connect = useCallback(async (type: 'metamask' | 'walletconnect' | 'local') => {
    try {
      switch (type) {
        case 'metamask':
          await connectMetaMask();
          break;
        case 'walletconnect':
          await connectWalletConnect();
          break;
        case 'local':
          await connectLocal();
          break;
        default:
          setError('Unknown wallet type');
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [connectMetaMask, connectWalletConnect, connectLocal, checkMetaMaskInstalled, connectWC]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setBalance(null);
    setSigner(null);
    setError(null);
    disconnectWC();
  }, [disconnectWC]);

  const getBalance = useCallback(async (): Promise<string> => {
    if (!provider || !address) {
      return '0';
    }
    try {
      const bal = await provider.getBalance(address);
      return ethers.formatEther(bal);
    } catch (err) {
      console.error('Error fetching balance:', err);
      return balance || '0';
    }
  }, [provider, address, balance]);

  const sendTransaction = useCallback(async (to: string, amount: string): Promise<string> => {
    if (!provider || !signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await signer.sendTransaction({
        to,
        value: ethers.parseEther(amount),
      });

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction failed');
      }

      // Aggiorna il balance dopo la transazione
      await refreshBalance();

      return receipt.hash;
    } catch (err) {
      console.error('Transaction error:', err);
      throw err;
    }
  }, [provider, signer, refreshBalance]);

  const signTransaction = useCallback(async (to: string, amount: string): Promise<string> => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await signTx(
        {
          to,
          value: amount,
        },
        signer,
      );

      if (!result.success || !result.signedTx) {
        throw new Error(result.error || 'Transaction signing failed');
      }

      return result.signedTx.rawTransaction;
    } catch (err) {
      console.error('Transaction signing error:', err);
      throw err;
    }
  }, [signer, signTx]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await signMsg(message, signer);

      if (!result.success || !result.signedTx) {
        throw new Error(result.error || 'Message signing failed');
      }

      return result.signedTx.signature;
    } catch (err) {
      console.error('Message signing error:', err);
      throw err;
    }
  }, [signer, signMsg]);

  // Usa il balance sincronizzato se disponibile
  const displayBalance = balanceSyncEnabled && syncedBalance ? syncedBalance : balance;

  const value: WalletContextType = {
    address,
    isConnected,
    balance: displayBalance,
    network,
    provider,
    signer,
    connect,
    disconnect,
    getBalance,
    sendTransaction,
    signTransaction,
    signMessage,
    error,
    checkMetaMaskInstalled,
    balanceSyncEnabled,
    setBalanceSyncEnabled,
    // Transaction History
    transactions: txHistory,
    addTransaction,
    updateTransactionStatus,
    // Gas Estimation
    estimateGas,
    getGasPrice,
    // Token Swap
    supportedTokens,
    getSwapQuote,
    executeSwap,
    // Portfolio Dashboard
    portfolioAssets: currentPortfolio,
    portfolioMetrics,
    updatePortfolio,
    getPortfolioValueHistory,
    calculateTotalReturn,
    // Staking
    stakingPools,
    stakingPositions,
    stake,
    unstake,
    claimRewards,
    // Limit Orders
    limitOrders,
    createLimitOrder,
    cancelOrder,
    getActiveOrders,
    getFilledOrders,
    // Price Alerts
    priceAlerts,
    createPriceAlert,
    cancelPriceAlert,
    getActivePriceAlerts,
    // DeFi Farming
    farmingPools,
    farmingPositions,
    depositFarming,
    withdrawFarming,
    claimFarmingRewards,
    getTotalFarmingYield,
    // NFT Gallery
    nfts,
    addNFT,
    removeNFT,
    updateNFTPrice,
    getNFTsByCollection,
    getNFTsByRarity,
    calculateNFTGalleryValue,
    getNFTGalleryStats,
    // DAO Governance
    daoProposals,
    daoMembers,
    daoTreasury,
    createDAOProposal,
    castDAOVote,
    delegateDAOVotes,
    executeDAOProposal,
    getDAOProposalStats,
    // Analytics Dashboard
    analyticsMetrics,
    analyticsChartData,
    loadAnalytics,
    getAnalyticsChartDataForPeriod,
    getAnalyticsPerformanceStats,
    // Cross-chain Bridge
    bridgeChains,
    bridgeTokens,
    bridgeTransactions,
    initiateBridge,
    getBridgeFee,
    estimateBridgeTime,
    getBridgeStats,
    // Price Feeds
    prices,
    getPrice,
    getPrices,
    startPricePolling,
    stopPricePolling,
    calculateValue,
    convertBetweenTokens,
    // Advanced Notifications
    notifications,
    notificationPreferences,
    sendNotification,
    updateNotificationPreferences,
    markNotificationAsRead,
    deleteNotification,
    getUnreadNotificationCount,
    getNotificationsByType,
    // Biometric Authentication
    biometricAuth: {
      isAvailable: biometricIsAvailable,
      isFaceIDAvailable,
      isTouchIDAvailable,
      isEnabled: biometricIsEnabled,
      isAuthenticated,
      isLoading: biometricIsLoading,
      error: biometricError,
      authenticate,
      enableBiometric,
      disableBiometric,
      logout,
    },
    // Backup & Recovery
    backupData,
    recoveryStatus,
    backupSeedPhrase,
    recoverFromSeedPhrase,
    verifyBackup,
    deleteBackup,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export { WalletContext };

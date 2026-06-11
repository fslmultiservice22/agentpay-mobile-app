/**
 * Coingecko API Service
 * Fetches real-time cryptocurrency prices and market data
 */

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  price_change_percentage_30d: number;
  price_change_percentage_1y: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  atl: number;
  ath_change_percentage: number;
  atl_change_percentage: number;
  ath_date: string;
  atl_date: string;
  roi: {
    times: number;
    currency: string;
    percentage: number;
  } | null;
  last_updated: string;
}

export interface PriceHistory {
  timestamp: number;
  price: number;
  market_cap: number;
  volume: number;
}

export interface PortfolioValue {
  timestamp: number;
  value: number;
  change_24h: number;
  change_percentage_24h: number;
  change_7d: number;
  change_percentage_7d: number;
  change_30d: number;
  change_percentage_30d: number;
}

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Token to Coingecko ID mapping
const TOKEN_MAPPING: Record<string, string> = {
  ETH: 'ethereum',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  WETH: 'ethereum',
  MATIC: 'matic-network',
  ARB: 'arbitrum',
  OP: 'optimism',
  NEAR: 'near',
  ORDERLY: 'orderly-network',
  BTC: 'bitcoin',
  SOL: 'solana',
  LINK: 'chainlink',
  AAVE: 'aave',
  UNI: 'uniswap',
};

class CoinGeckoService {
  /**
   * Get current price for a token
   */
  async getTokenPrice(symbol: string): Promise<number> {
    try {
      const coinId = TOKEN_MAPPING[symbol.toUpperCase()] || symbol.toLowerCase();
      const response = await fetch(
        `${COINGECKO_API_BASE}/simple/price?ids=${coinId}&vs_currencies=usd`
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      return data[coinId]?.usd || 0;
    } catch (error) {
      console.error('Error fetching token price:', error);
      return 0;
    }
  }

  /**
   * Get multiple token prices
   */
  async getTokenPrices(symbols: string[]): Promise<Record<string, number>> {
    try {
      const coinIds = symbols
        .map((s) => TOKEN_MAPPING[s.toUpperCase()] || s.toLowerCase())
        .join(',');

      const response = await fetch(
        `${COINGECKO_API_BASE}/simple/price?ids=${coinIds}&vs_currencies=usd`
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const result: Record<string, number> = {};

      symbols.forEach((symbol) => {
        const coinId = TOKEN_MAPPING[symbol.toUpperCase()] || symbol.toLowerCase();
        result[symbol] = data[coinId]?.usd || 0;
      });

      return result;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      return {};
    }
  }

  /**
   * Get detailed coin data including market info
   */
  async getCoinData(symbol: string): Promise<CoinData | null> {
    try {
      const coinId = TOKEN_MAPPING[symbol.toUpperCase()] || symbol.toLowerCase();
      const response = await fetch(
        `${COINGECKO_API_BASE}/coins/${coinId}?localization=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      return {
        id: data.id,
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        image: data.image?.large || '',
        current_price: data.market_data?.current_price?.usd || 0,
        market_cap: data.market_data?.market_cap?.usd || 0,
        market_cap_rank: data.market_cap_rank || 0,
        fully_diluted_valuation: data.market_data?.fully_diluted_valuation?.usd || 0,
        total_volume: data.market_data?.total_volume?.usd || 0,
        high_24h: data.market_data?.high_24h?.usd || 0,
        low_24h: data.market_data?.low_24h?.usd || 0,
        price_change_24h: data.market_data?.price_change_24h || 0,
        price_change_percentage_24h: data.market_data?.price_change_percentage_24h || 0,
        price_change_percentage_7d: data.market_data?.price_change_percentage_7d || 0,
        price_change_percentage_30d: data.market_data?.price_change_percentage_30d || 0,
        price_change_percentage_1y: data.market_data?.price_change_percentage_1y || 0,
        market_cap_change_24h: data.market_data?.market_cap_change_24h || 0,
        market_cap_change_percentage_24h: data.market_data?.market_cap_change_percentage_24h || 0,
        circulating_supply: data.market_data?.circulating_supply || 0,
        total_supply: data.market_data?.total_supply || 0,
        max_supply: data.market_data?.max_supply || 0,
        ath: data.market_data?.ath?.usd || 0,
        atl: data.market_data?.atl?.usd || 0,
        ath_change_percentage: data.market_data?.ath_change_percentage?.usd || 0,
        atl_change_percentage: data.market_data?.atl_change_percentage?.usd || 0,
        ath_date: data.market_data?.ath_date?.usd || '',
        atl_date: data.market_data?.atl_date?.usd || '',
        roi: data.roi || null,
        last_updated: data.last_updated || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching coin data:', error);
      return null;
    }
  }

  /**
   * Get price history for a coin
   */
  async getPriceHistory(
    symbol: string,
    days: number = 7
  ): Promise<PriceHistory[]> {
    try {
      const coinId = TOKEN_MAPPING[symbol.toUpperCase()] || symbol.toLowerCase();
      const response = await fetch(
        `${COINGECKO_API_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      return data.prices.map((price: [number, number], index: number) => ({
        timestamp: price[0],
        price: price[1],
        market_cap: data.market_caps?.[index]?.[1] || 0,
        volume: data.volumes?.[index]?.[1] || 0,
      }));
    } catch (error) {
      console.error('Error fetching price history:', error);
      return [];
    }
  }

  /**
   * Get trending coins
   */
  async getTrendingCoins(): Promise<CoinData[]> {
    try {
      const response = await fetch(`${COINGECKO_API_BASE}/search/trending`);

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      return data.coins.slice(0, 10).map((coin: any) => ({
        id: coin.item.id,
        symbol: coin.item.symbol.toUpperCase(),
        name: coin.item.name,
        image: coin.item.large,
        current_price: coin.item.data?.price || 0,
        market_cap: 0,
        market_cap_rank: coin.item.market_cap_rank || 0,
        fully_diluted_valuation: 0,
        total_volume: 0,
        high_24h: 0,
        low_24h: 0,
        price_change_24h: 0,
        price_change_percentage_24h: coin.item.data?.price_change_percentage_24h?.usd || 0,
        price_change_percentage_7d: 0,
        price_change_percentage_30d: 0,
        price_change_percentage_1y: 0,
        market_cap_change_24h: 0,
        market_cap_change_percentage_24h: 0,
        circulating_supply: 0,
        total_supply: 0,
        max_supply: 0,
        ath: 0,
        atl: 0,
        ath_change_percentage: 0,
        atl_change_percentage: 0,
        ath_date: '',
        atl_date: '',
        roi: null,
        last_updated: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching trending coins:', error);
      return [];
    }
  }

  /**
   * Calculate portfolio value from holdings
   */
  async calculatePortfolioValue(
    holdings: Record<string, number>
  ): Promise<number> {
    try {
      const symbols = Object.keys(holdings);
      const prices = await this.getTokenPrices(symbols);

      let totalValue = 0;
      Object.entries(holdings).forEach(([symbol, amount]) => {
        totalValue += (prices[symbol] || 0) * amount;
      });

      return totalValue;
    } catch (error) {
      console.error('Error calculating portfolio value:', error);
      return 0;
    }
  }

  /**
   * Format price with currency
   */
  formatPrice(price: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }

  /**
   * Format percentage change
   */
  formatPercentage(percentage: number): string {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  }
}

export const coinGeckoService = new CoinGeckoService();

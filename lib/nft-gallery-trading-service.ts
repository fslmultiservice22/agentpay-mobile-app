/**
 * NFT Gallery & Trading Module Service
 * NFT management, browsing, and trading functionality
 */

export interface NFTCollection {
  id: string;
  name: string;
  description: string;
  contractAddress: string;
  network: string;
  floorPrice: number;
  totalVolume: number;
  itemCount: number;
  ownerCount: number;
  imageUrl: string;
  verified: boolean;
  createdAt: number;
}

export interface NFT {
  id: string;
  collectionId: string;
  tokenId: string;
  name: string;
  description: string;
  imageUrl: string;
  attributes: Array<{ trait: string; value: string; rarity: number }>;
  owner: string;
  creator: string;
  rarity: number; // 0-100
  floorPrice: number;
  lastSalePrice?: number;
  lastSaleDate?: number;
  listedPrice?: number;
  isListed: boolean;
  createdAt: number;
}

export interface NFTListing {
  id: string;
  nftId: string;
  seller: string;
  price: number;
  currency: string;
  expiresAt: number;
  status: 'active' | 'sold' | 'cancelled';
  createdAt: number;
  soldAt?: number;
  buyer?: string;
}

export interface NFTOffer {
  id: string;
  nftId: string;
  offerer: string;
  price: number;
  currency: string;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: number;
  respondedAt?: number;
}

export interface UserNFTPortfolio {
  userId: string;
  totalNFTs: number;
  totalValue: number;
  floorValue: number;
  collections: string[];
  recentActivity: NFTListing[];
}

class NFTGalleryTradingService {
  private collections: Map<string, NFTCollection> = new Map();
  private nfts: Map<string, NFT> = new Map();
  private listings: Map<string, NFTListing> = new Map();
  private offers: Map<string, NFTOffer> = new Map();
  private portfolios: Map<string, UserNFTPortfolio> = new Map();

  constructor() {
    this.initializeDefaultCollections();
  }

  /**
   * Initialize default NFT collections
   */
  private initializeDefaultCollections(): void {
    const collections: NFTCollection[] = [
      {
        id: 'col_1',
        name: 'Bored Ape Yacht Club',
        description: 'A collection of 10,000 unique Bored Ape NFTs',
        contractAddress: '0xbc4ca0eda7647a8ab7c2061c2e2ad7d64fda33713',
        network: 'ethereum',
        floorPrice: 45.5,
        totalVolume: 850000,
        itemCount: 10000,
        ownerCount: 7500,
        imageUrl: 'https://example.com/bayc.jpg',
        verified: true,
        createdAt: Date.now(),
      },
      {
        id: 'col_2',
        name: 'Cryptopunks',
        description: '10,000 unique collectible characters on the Ethereum blockchain',
        contractAddress: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
        network: 'ethereum',
        floorPrice: 65.2,
        totalVolume: 1200000,
        itemCount: 10000,
        ownerCount: 3500,
        imageUrl: 'https://example.com/cryptopunks.jpg',
        verified: true,
        createdAt: Date.now(),
      },
      {
        id: 'col_3',
        name: 'Pudgy Penguins',
        description: 'A collection of 8,888 adorable Pudgy Penguins',
        contractAddress: '0xbd3531da5dd0a74fb411a346d8d025d183d6e44b',
        network: 'ethereum',
        floorPrice: 12.3,
        totalVolume: 450000,
        itemCount: 8888,
        ownerCount: 6000,
        imageUrl: 'https://example.com/pudgy.jpg',
        verified: true,
        createdAt: Date.now(),
      },
    ];

    for (const collection of collections) {
      this.collections.set(collection.id, collection);
      this.createSampleNFTs(collection.id, 10);
    }
  }

  /**
   * Create sample NFTs for a collection
   */
  private createSampleNFTs(collectionId: string, count: number): void {
    const collection = this.collections.get(collectionId);
    if (!collection) return;

    for (let i = 0; i < count; i++) {
      const nft: NFT = {
        id: `nft_${collectionId}_${i}`,
        collectionId,
        tokenId: `${i}`,
        name: `${collection.name} #${i}`,
        description: `Token #${i} from ${collection.name}`,
        imageUrl: `${collection.imageUrl}/${i}`,
        attributes: [
          { trait: 'Background', value: 'Blue', rarity: 45 },
          { trait: 'Eyes', value: 'Sad', rarity: 30 },
          { trait: 'Mouth', value: 'Smile', rarity: 60 },
        ],
        owner: `user_${Math.floor(Math.random() * 100)}`,
        creator: collection.contractAddress,
        rarity: Math.random() * 100,
        floorPrice: collection.floorPrice,
        isListed: Math.random() > 0.7,
        createdAt: Date.now(),
      };

      this.nfts.set(nft.id, nft);
    }
  }

  /**
   * Get NFT collection
   */
  getCollection(collectionId: string): NFTCollection | undefined {
    return this.collections.get(collectionId);
  }

  /**
   * Get all collections
   */
  getAllCollections(): NFTCollection[] {
    return Array.from(this.collections.values());
  }

  /**
   * Get collection NFTs
   */
  getCollectionNFTs(collectionId: string): NFT[] {
    return Array.from(this.nfts.values()).filter(n => n.collectionId === collectionId);
  }

  /**
   * Get NFT details
   */
  getNFT(nftId: string): NFT | undefined {
    return this.nfts.get(nftId);
  }

  /**
   * List NFT for sale
   */
  listNFT(nftId: string, price: number, currency: string = 'ETH', expirationDays: number = 30): NFTListing {
    const nft = this.nfts.get(nftId);
    if (!nft) throw new Error('NFT not found');

    const listing: NFTListing = {
      id: `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nftId,
      seller: nft.owner,
      price,
      currency,
      expiresAt: Date.now() + (expirationDays * 24 * 60 * 60 * 1000),
      status: 'active',
      createdAt: Date.now(),
    };

    this.listings.set(listing.id, listing);

    // Update NFT
    nft.isListed = true;
    nft.listedPrice = price;

    return listing;
  }

  /**
   * Cancel listing
   */
  cancelListing(listingId: string): boolean {
    const listing = this.listings.get(listingId);
    if (!listing) return false;
    if (listing.status !== 'active') return false;

    listing.status = 'cancelled';

    // Update NFT
    const nft = this.nfts.get(listing.nftId);
    if (nft) {
      nft.isListed = false;
      nft.listedPrice = undefined;
    }

    return true;
  }

  /**
   * Buy NFT
   */
  buyNFT(listingId: string, buyer: string): boolean {
    const listing = this.listings.get(listingId);
    if (!listing) return false;
    if (listing.status !== 'active') return false;

    const nft = this.nfts.get(listing.nftId);
    if (!nft) return false;

    // Update listing
    listing.status = 'sold';
    listing.buyer = buyer;
    listing.soldAt = Date.now();

    // Update NFT
    nft.owner = buyer;
    nft.isListed = false;
    nft.lastSalePrice = listing.price;
    nft.lastSaleDate = Date.now();
    nft.listedPrice = undefined;

    return true;
  }

  /**
   * Make offer on NFT
   */
  makeOffer(nftId: string, offerer: string, price: number, currency: string = 'ETH', expirationDays: number = 7): NFTOffer {
    const nft = this.nfts.get(nftId);
    if (!nft) throw new Error('NFT not found');

    const offer: NFTOffer = {
      id: `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nftId,
      offerer,
      price,
      currency,
      expiresAt: Date.now() + (expirationDays * 24 * 60 * 60 * 1000),
      status: 'pending',
      createdAt: Date.now(),
    };

    this.offers.set(offer.id, offer);

    return offer;
  }

  /**
   * Accept offer
   */
  acceptOffer(offerId: string): boolean {
    const offer = this.offers.get(offerId);
    if (!offer) return false;
    if (offer.status !== 'pending') return false;

    const nft = this.nfts.get(offer.nftId);
    if (!nft) return false;

    // Update offer
    offer.status = 'accepted';
    offer.respondedAt = Date.now();

    // Update NFT
    nft.owner = offer.offerer;
    nft.lastSalePrice = offer.price;
    nft.lastSaleDate = Date.now();

    // Cancel active listings
    const activeListings = Array.from(this.listings.values()).filter(
      l => l.nftId === offer.nftId && l.status === 'active'
    );

    for (const listing of activeListings) {
      listing.status = 'cancelled';
    }

    return true;
  }

  /**
   * Reject offer
   */
  rejectOffer(offerId: string): boolean {
    const offer = this.offers.get(offerId);
    if (!offer) return false;
    if (offer.status !== 'pending') return false;

    offer.status = 'rejected';
    offer.respondedAt = Date.now();

    return true;
  }

  /**
   * Get user NFT portfolio
   */
  getUserPortfolio(userId: string): UserNFTPortfolio {
    let portfolio = this.portfolios.get(userId);

    if (!portfolio) {
      const userNFTs = Array.from(this.nfts.values()).filter(n => n.owner === userId);
      const totalValue = userNFTs.reduce((sum, n) => sum + n.floorPrice, 0);
      const collections = [...new Set(userNFTs.map(n => n.collectionId))];

      portfolio = {
        userId,
        totalNFTs: userNFTs.length,
        totalValue,
        floorValue: totalValue,
        collections,
        recentActivity: [],
      };

      this.portfolios.set(userId, portfolio);
    }

    return portfolio;
  }

  /**
   * Get NFT listings
   */
  getListings(collectionId?: string, status: 'active' | 'sold' | 'cancelled' = 'active'): NFTListing[] {
    let listings = Array.from(this.listings.values()).filter(l => l.status === status);

    if (collectionId) {
      listings = listings.filter(l => {
        const nft = this.nfts.get(l.nftId);
        return nft?.collectionId === collectionId;
      });
    }

    return listings.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get NFT offers
   */
  getOffers(nftId: string, status?: 'pending' | 'accepted' | 'rejected' | 'expired'): NFTOffer[] {
    let offers = Array.from(this.offers.values()).filter(o => o.nftId === nftId);

    if (status) {
      offers = offers.filter(o => o.status === status);
    }

    return offers.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Search NFTs
   */
  searchNFTs(query: string): NFT[] {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.nfts.values()).filter(
      n => n.name.toLowerCase().includes(lowerQuery) ||
           n.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get trending collections
   */
  getTrendingCollections(): NFTCollection[] {
    return Array.from(this.collections.values())
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 10);
  }

  /**
   * Get rarity score
   */
  getRarityScore(nftId: string): number | undefined {
    const nft = this.nfts.get(nftId);
    if (!nft) return undefined;

    const attributeRarity = nft.attributes.reduce((sum, a) => sum + a.rarity, 0) / nft.attributes.length;
    return Math.round((nft.rarity + attributeRarity) / 2);
  }

  /**
   * Get collection floor price history
   */
  getCollectionFloorPriceHistory(collectionId: string): Array<{ timestamp: number; price: number }> {
    // Simulated history
    const history = [];
    for (let i = 0; i < 30; i++) {
      history.push({
        timestamp: Date.now() - (i * 24 * 60 * 60 * 1000),
        price: Math.random() * 50 + 30,
      });
    }
    return history.reverse();
  }
}

export const nftGalleryTradingService = new NFTGalleryTradingService();

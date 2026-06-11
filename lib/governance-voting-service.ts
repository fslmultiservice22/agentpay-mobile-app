/**
 * Governance Voting Service
 * Manages DAO voting and governance participation
 */

export interface Proposal {
  id: string;
  title: string;
  description: string;
  chainId: string;
  dao: string;
  proposer: string;
  startTime: number;
  endTime: number;
  status: 'active' | 'passed' | 'failed' | 'executed' | 'cancelled';
  votesFor: string;
  votesAgainst: string;
  votesAbstain: string;
  quorumRequired: number;
  quorumReached: boolean;
  userVote?: 'for' | 'against' | 'abstain';
  userVotingPower: string;
}

export interface Vote {
  id: string;
  proposalId: string;
  voter: string;
  choice: 'for' | 'against' | 'abstain';
  votingPower: string;
  timestamp: number;
}

export interface GovernanceToken {
  id: string;
  symbol: string;
  address: string;
  chainId: string;
  totalSupply: string;
  userBalance: string;
  delegatedTo?: string;
  votingPower: string;
}

class GovernanceVotingService {
  private proposals: Map<string, Proposal> = new Map();
  private votes: Map<string, Vote> = new Map();
  private tokens: Map<string, GovernanceToken> = new Map();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Initialize mock governance data
   */
  private initializeMockData(): void {
    const mockProposals: Proposal[] = [
      {
        id: 'prop_001',
        title: 'Increase Protocol Fee to 0.5%',
        description: 'Proposal to increase the protocol fee from 0.3% to 0.5% to fund development',
        chainId: 'ethereum',
        dao: 'Uniswap',
        proposer: '0x1234567890123456789012345678901234567890',
        startTime: Date.now() - 86400000,
        endTime: Date.now() + 259200000,
        status: 'active',
        votesFor: '2500000',
        votesAgainst: '1200000',
        votesAbstain: '300000',
        quorumRequired: 40,
        quorumReached: true,
        userVote: 'for',
        userVotingPower: '10000',
      },
      {
        id: 'prop_002',
        title: 'Add USDC/ETH Pool',
        description: 'Add a new USDC/ETH pool with 0.01% fee tier',
        chainId: 'ethereum',
        dao: 'Uniswap',
        proposer: '0x2345678901234567890123456789012345678901',
        startTime: Date.now() - 172800000,
        endTime: Date.now() - 86400000,
        status: 'passed',
        votesFor: '3200000',
        votesAgainst: '800000',
        votesAbstain: '200000',
        quorumRequired: 40,
        quorumReached: true,
        userVote: 'for',
        userVotingPower: '10000',
      },
      {
        id: 'prop_003',
        title: 'Treasury Allocation for Marketing',
        description: 'Allocate $500k from treasury for marketing initiatives',
        chainId: 'ethereum',
        dao: 'Aave',
        proposer: '0x3456789012345678901234567890123456789012',
        startTime: Date.now() + 86400000,
        endTime: Date.now() + 604800000,
        status: 'active',
        votesFor: '0',
        votesAgainst: '0',
        votesAbstain: '0',
        quorumRequired: 50,
        quorumReached: false,
        userVotingPower: '5000',
      },
    ];

    mockProposals.forEach(prop => {
      this.proposals.set(prop.id, prop);
    });

    const mockTokens: GovernanceToken[] = [
      {
        id: 'gov_uni',
        symbol: 'UNI',
        address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
        chainId: 'ethereum',
        totalSupply: '1000000000',
        userBalance: '10000',
        votingPower: '10000',
      },
      {
        id: 'gov_aave',
        symbol: 'AAVE',
        address: '0x7fc66500c84a76ad7e9c93437e434122a1f9adf5',
        chainId: 'ethereum',
        totalSupply: '16000000',
        userBalance: '5',
        votingPower: '5000',
      },
    ];

    mockTokens.forEach(token => {
      this.tokens.set(token.id, token);
    });
  }

  /**
   * Get all proposals
   */
  getProposals(): Proposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Get active proposals
   */
  getActiveProposals(): Proposal[] {
    return Array.from(this.proposals.values()).filter(p => p.status === 'active');
  }

  /**
   * Get proposal by ID
   */
  getProposal(proposalId: string): Proposal | undefined {
    return this.proposals.get(proposalId);
  }

  /**
   * Vote on proposal
   */
  async vote(
    proposalId: string,
    voter: string,
    choice: 'for' | 'against' | 'abstain',
    votingPower: string
  ): Promise<Vote | null> {
    try {
      const proposal = this.proposals.get(proposalId);
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
      }

      if (proposal.status !== 'active') {
        throw new Error('Proposal is not active');
      }

      const vote: Vote = {
        id: `vote_${Date.now()}`,
        proposalId,
        voter,
        choice,
        votingPower,
        timestamp: Date.now(),
      };

      this.votes.set(vote.id, vote);

      // Update proposal votes
      const power = parseFloat(votingPower);
      switch (choice) {
        case 'for':
          proposal.votesFor = (parseFloat(proposal.votesFor) + power).toString();
          break;
        case 'against':
          proposal.votesAgainst = (parseFloat(proposal.votesAgainst) + power).toString();
          break;
        case 'abstain':
          proposal.votesAbstain = (parseFloat(proposal.votesAbstain) + power).toString();
          break;
      }

      // Update user vote
      proposal.userVote = choice;

      return vote;
    } catch (error) {
      console.error('Failed to vote:', error);
      return null;
    }
  }

  /**
   * Get governance tokens
   */
  getGovernanceTokens(): GovernanceToken[] {
    return Array.from(this.tokens.values());
  }

  /**
   * Get governance token by ID
   */
  getGovernanceToken(tokenId: string): GovernanceToken | undefined {
    return this.tokens.get(tokenId);
  }

  /**
   * Delegate voting power
   */
  async delegateVotingPower(
    tokenId: string,
    delegateTo: string
  ): Promise<boolean> {
    try {
      const token = this.tokens.get(tokenId);
      if (!token) {
        throw new Error(`Token ${tokenId} not found`);
      }

      token.delegatedTo = delegateTo;
      return true;
    } catch (error) {
      console.error('Failed to delegate voting power:', error);
      return false;
    }
  }

  /**
   * Get proposal statistics
   */
  getGovernanceStats(): {
    totalProposals: number;
    activeProposals: number;
    passedProposals: number;
    averageParticipation: number;
  } {
    const proposals = Array.from(this.proposals.values());
    const activeCount = proposals.filter(p => p.status === 'active').length;
    const passedCount = proposals.filter(p => p.status === 'passed').length;
    
    const totalVotes = proposals.reduce((sum, p) => {
      return sum + parseFloat(p.votesFor) + parseFloat(p.votesAgainst) + parseFloat(p.votesAbstain);
    }, 0);
    
    const averageParticipation = proposals.length > 0 ? totalVotes / proposals.length : 0;

    return {
      totalProposals: proposals.length,
      activeProposals: activeCount,
      passedProposals: passedCount,
      averageParticipation: parseFloat(averageParticipation.toFixed(0)),
    };
  }

  /**
   * Get votes for proposal
   */
  getProposalVotes(proposalId: string): Vote[] {
    return Array.from(this.votes.values()).filter(v => v.proposalId === proposalId);
  }
}

export const governanceVotingService = new GovernanceVotingService();

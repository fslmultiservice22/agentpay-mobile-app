/**
 * Decentralized Governance Dashboard Service
 * DAO governance, voting, and proposal management
 */

export interface DAOProposal {
  id: string;
  daoId: string;
  title: string;
  description: string;
  proposer: string;
  status: 'draft' | 'active' | 'passed' | 'failed' | 'executed' | 'cancelled';
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  quorumRequired: number;
  quorumReached: boolean;
  startTime: number;
  endTime: number;
  executionTime?: number;
  parameters: Record<string, any>;
  createdAt: number;
}

export interface Vote {
  id: string;
  proposalId: string;
  voter: string;
  choice: 'for' | 'against' | 'abstain';
  votingPower: number;
  timestamp: number;
}

export interface GovernanceToken {
  id: string;
  daoId: string;
  name: string;
  symbol: string;
  totalSupply: number;
  decimals: number;
  contractAddress: string;
}

export interface DAOMember {
  id: string;
  daoId: string;
  address: string;
  votingPower: number;
  delegatedTo?: string;
  delegatedFrom: string[];
  proposalCount: number;
  voteCount: number;
  joinedAt: number;
}

export interface GovernanceDAO {
  id: string;
  name: string;
  description: string;
  governanceToken: GovernanceToken;
  treasury: number;
  members: number;
  activeProposals: number;
  totalProposals: number;
  quorumPercentage: number;
  votingPeriodDays: number;
  createdAt: number;
}

class GovernanceDashboardService {
  private daos: Map<string, GovernanceDAO> = new Map();
  private proposals: Map<string, DAOProposal> = new Map();
  private votes: Map<string, Vote> = new Map();
  private members: Map<string, DAOMember> = new Map();
  private tokens: Map<string, GovernanceToken> = new Map();

  constructor() {
    this.initializeDefaultDAOs();
  }

  /**
   * Initialize default DAOs
   */
  private initializeDefaultDAOs(): void {
    const daos: GovernanceDAO[] = [
      {
        id: 'dao_1',
        name: 'Uniswap',
        description: 'Decentralized exchange governance',
        governanceToken: {
          id: 'token_1',
          daoId: 'dao_1',
          name: 'Uniswap',
          symbol: 'UNI',
          totalSupply: 1000000000,
          decimals: 18,
          contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
        },
        treasury: 5000000,
        members: 50000,
        activeProposals: 5,
        totalProposals: 250,
        quorumPercentage: 4,
        votingPeriodDays: 7,
        createdAt: Date.now(),
      },
      {
        id: 'dao_2',
        name: 'Aave',
        description: 'Lending protocol governance',
        governanceToken: {
          id: 'token_2',
          daoId: 'dao_2',
          name: 'Aave',
          symbol: 'AAVE',
          totalSupply: 16000000,
          decimals: 18,
          contractAddress: '0x7fc66500c84a76ad7e9c93437e434122a1f9adf5',
        },
        treasury: 3000000,
        members: 30000,
        activeProposals: 3,
        totalProposals: 180,
        quorumPercentage: 3.5,
        votingPeriodDays: 5,
        createdAt: Date.now(),
      },
    ];

    for (const dao of daos) {
      this.daos.set(dao.id, dao);
      this.tokens.set(dao.governanceToken.id, dao.governanceToken);
      this.createSampleMembers(dao.id, 100);
      this.createSampleProposals(dao.id, 10);
    }
  }

  /**
   * Create sample members
   */
  private createSampleMembers(daoId: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const member: DAOMember = {
        id: `member_${daoId}_${i}`,
        daoId,
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        votingPower: Math.random() * 100000,
        delegatedFrom: [],
        proposalCount: Math.floor(Math.random() * 10),
        voteCount: Math.floor(Math.random() * 50),
        joinedAt: Date.now() - (Math.random() * 365 * 24 * 60 * 60 * 1000),
      };

      this.members.set(member.id, member);
    }
  }

  /**
   * Create sample proposals
   */
  private createSampleProposals(daoId: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const proposal: DAOProposal = {
        id: `proposal_${daoId}_${i}`,
        daoId,
        title: `Proposal ${i}: ${['Increase fees', 'Add new token', 'Update parameters', 'Treasury allocation'][i % 4]}`,
        description: `This proposal aims to ${['increase trading fees', 'add support for new token', 'update protocol parameters', 'allocate treasury funds'][i % 4]}`,
        proposer: `0x${Math.random().toString(16).substr(2, 40)}`,
        status: ['active', 'passed', 'failed'][i % 3] as any,
        votesFor: Math.random() * 1000000,
        votesAgainst: Math.random() * 500000,
        votesAbstain: Math.random() * 100000,
        quorumRequired: 40,
        quorumReached: true,
        startTime: Date.now() - (Math.random() * 7 * 24 * 60 * 60 * 1000),
        endTime: Date.now() + (Math.random() * 7 * 24 * 60 * 60 * 1000),
        parameters: { fee: 0.3, token: 'USDC' },
        createdAt: Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000),
      };

      this.proposals.set(proposal.id, proposal);
    }
  }

  /**
   * Get DAO
   */
  getDAO(daoId: string): GovernanceDAO | undefined {
    return this.daos.get(daoId);
  }

  /**
   * Get all DAOs
   */
  getAllDAOs(): GovernanceDAO[] {
    return Array.from(this.daos.values());
  }

  /**
   * Create proposal
   */
  createProposal(
    daoId: string,
    title: string,
    description: string,
    proposer: string,
    parameters: Record<string, any>,
    votingPeriodDays?: number
  ): DAOProposal {
    const dao = this.daos.get(daoId);
    if (!dao) throw new Error('DAO not found');

    const proposal: DAOProposal = {
      id: `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      daoId,
      title,
      description,
      proposer,
      status: 'draft',
      votesFor: 0,
      votesAgainst: 0,
      votesAbstain: 0,
      quorumRequired: dao.quorumPercentage,
      quorumReached: false,
      startTime: Date.now(),
      endTime: Date.now() + ((votingPeriodDays || dao.votingPeriodDays) * 24 * 60 * 60 * 1000),
      parameters,
      createdAt: Date.now(),
    };

    this.proposals.set(proposal.id, proposal);

    return proposal;
  }

  /**
   * Vote on proposal
   */
  vote(proposalId: string, voter: string, choice: 'for' | 'against' | 'abstain', votingPower: number): Vote {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error('Proposal not found');
    if (proposal.status !== 'active') throw new Error('Proposal is not active');

    // Check if already voted
    const existingVote = Array.from(this.votes.values()).find(
      v => v.proposalId === proposalId && v.voter === voter
    );

    if (existingVote) throw new Error('Already voted on this proposal');

    // Update proposal votes
    if (choice === 'for') {
      proposal.votesFor += votingPower;
    } else if (choice === 'against') {
      proposal.votesAgainst += votingPower;
    } else {
      proposal.votesAbstain += votingPower;
    }

    // Check quorum
    const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
    const dao = this.daos.get(proposal.daoId);
    if (dao) {
      const governanceToken = this.tokens.get(dao.governanceToken.id);
      if (governanceToken) {
        const quorumVotes = (governanceToken.totalSupply * proposal.quorumRequired) / 100;
        proposal.quorumReached = totalVotes >= quorumVotes;
      }
    }

    // Create vote record
    const vote: Vote = {
      id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      proposalId,
      voter,
      choice,
      votingPower,
      timestamp: Date.now(),
    };

    this.votes.set(vote.id, vote);

    return vote;
  }

  /**
   * Get proposal votes
   */
  getProposalVotes(proposalId: string): Vote[] {
    return Array.from(this.votes.values()).filter(v => v.proposalId === proposalId);
  }

  /**
   * Get DAO proposals
   */
  getDAOProposals(daoId: string, status?: string): DAOProposal[] {
    let proposals = Array.from(this.proposals.values()).filter(p => p.daoId === daoId);

    if (status) {
      proposals = proposals.filter(p => p.status === status);
    }

    return proposals.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Delegate voting power
   */
  delegateVotingPower(memberId: string, delegateTo: string): boolean {
    const member = this.members.get(memberId);
    if (!member) return false;

    member.delegatedTo = delegateTo;

    // Add to delegatedFrom
    const delegateeMember = this.members.get(delegateTo);
    if (delegateeMember) {
      delegateeMember.delegatedFrom.push(memberId);
    }

    return true;
  }

  /**
   * Get member voting power
   */
  getMemberVotingPower(memberId: string): number {
    const member = this.members.get(memberId);
    if (!member) return 0;

    let totalPower = member.votingPower;

    // Add delegated voting power
    for (const delegatedMemberId of member.delegatedFrom) {
      const delegatedMember = this.members.get(delegatedMemberId);
      if (delegatedMember) {
        totalPower += delegatedMember.votingPower;
      }
    }

    return totalPower;
  }

  /**
   * Get DAO members
   */
  getDAOMembers(daoId: string, limit: number = 100): DAOMember[] {
    return Array.from(this.members.values())
      .filter(m => m.daoId === daoId)
      .sort((a, b) => b.votingPower - a.votingPower)
      .slice(0, limit);
  }

  /**
   * Execute proposal
   */
  executeProposal(proposalId: string): boolean {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return false;
    if (proposal.status !== 'passed') return false;

    proposal.status = 'executed';
    proposal.executionTime = Date.now();

    return true;
  }

  /**
   * Get proposal voting results
   */
  getProposalResults(proposalId: string): {
    votesFor: number;
    votesAgainst: number;
    votesAbstain: number;
    totalVotes: number;
    percentFor: number;
    percentAgainst: number;
    percentAbstain: number;
  } {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error('Proposal not found');

    const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;

    return {
      votesFor: proposal.votesFor,
      votesAgainst: proposal.votesAgainst,
      votesAbstain: proposal.votesAbstain,
      totalVotes,
      percentFor: (proposal.votesFor / totalVotes) * 100,
      percentAgainst: (proposal.votesAgainst / totalVotes) * 100,
      percentAbstain: (proposal.votesAbstain / totalVotes) * 100,
    };
  }

  /**
   * Get governance statistics
   */
  getGovernanceStats(daoId: string): {
    totalMembers: number;
    activeProposals: number;
    totalProposals: number;
    averageVotingPower: number;
    participationRate: number;
  } {
    const dao = this.daos.get(daoId);
    if (!dao) throw new Error('DAO not found');

    const members = this.getDAOMembers(daoId, 10000);
    const proposals = this.getDAOProposals(daoId);
    const activeProposals = proposals.filter(p => p.status === 'active');

    const averageVotingPower = members.length > 0
      ? members.reduce((sum, m) => sum + m.votingPower, 0) / members.length
      : 0;

    const totalVoters = new Set(Array.from(this.votes.values()).map(v => v.voter)).size;
    const participationRate = members.length > 0 ? (totalVoters / members.length) * 100 : 0;

    return {
      totalMembers: members.length,
      activeProposals: activeProposals.length,
      totalProposals: proposals.length,
      averageVotingPower,
      participationRate,
    };
  }

  /**
   * Get trending proposals
   */
  getTrendingProposals(daoId?: string, limit: number = 10): DAOProposal[] {
    let proposals = Array.from(this.proposals.values());

    if (daoId) {
      proposals = proposals.filter(p => p.daoId === daoId);
    }

    return proposals
      .filter(p => p.status === 'active')
      .sort((a, b) => (b.votesFor + b.votesAgainst) - (a.votesFor + a.votesAgainst))
      .slice(0, limit);
  }

  /**
   * Get member activity
   */
  getMemberActivity(memberId: string): {
    proposalsCreated: number;
    votesParticipated: number;
    votingPower: number;
    delegatedPower: number;
  } {
    const member = this.members.get(memberId);
    if (!member) throw new Error('Member not found');

    const memberVotes = Array.from(this.votes.values()).filter(v => v.voter === member.address);
    const delegatedPower = member.delegatedFrom.reduce((sum, delegatedId) => {
      const delegatedMember = this.members.get(delegatedId);
      return sum + (delegatedMember?.votingPower || 0);
    }, 0);

    return {
      proposalsCreated: member.proposalCount,
      votesParticipated: memberVotes.length,
      votingPower: member.votingPower,
      delegatedPower,
    };
  }
}

export const governanceDashboardService = new GovernanceDashboardService();

/**
 * Insurance & Risk Coverage Service
 * Protocol insurance with Nexus Mutual, Cover Protocol integration
 */

export interface InsuranceProvider {
  id: string;
  name: string;
  type: 'protocol' | 'smart-contract' | 'custody';
  supportedProtocols: string[];
  maxCoverage: number;
  premiumRate: number; // percentage per year
  claimProcess: string;
  status: 'active' | 'paused' | 'deprecated';
}

export interface InsurancePolicy {
  id: string;
  userId: string;
  provider: string;
  protocol: string;
  coverageAmount: number;
  premiumRate: number;
  annualPremium: number;
  monthlyPremium: number;
  startDate: number;
  expiryDate: number;
  status: 'active' | 'expired' | 'claimed' | 'cancelled';
  claimsRemaining: number;
}

export interface InsuranceClaim {
  id: string;
  userId: string;
  policyId: string;
  protocol: string;
  incidentDate: number;
  lossAmount: number;
  claimAmount: number;
  description: string;
  evidence: string[];
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  submittedAt: number;
  reviewedAt?: number;
  paidAt?: number;
  reviewNotes?: string;
}

export interface RiskAssessment {
  id: string;
  userId: string;
  protocol: string;
  riskScore: number; // 0-100
  auditStatus: 'audited' | 'partially-audited' | 'unaudited';
  tvlRisk: number; // percentage
  smartContractRisk: number; // percentage
  counterpartyRisk: number; // percentage
  historicalIncidents: number;
  lastIncidentDate?: number;
  recommendation: string;
}

export interface CoverageRecommendation {
  protocol: string;
  recommendedCoverage: number;
  estimatedMonthlyPremium: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  priority: number; // 1-10
  reason: string;
}

export interface InsurancePortfolio {
  totalCoverage: number;
  activePolicies: number;
  monthlyPremiums: number;
  annualPremiums: number;
  claimsSubmitted: number;
  claimsApproved: number;
  totalPaid: number;
  coverageGaps: string[];
}

class InsuranceRiskCoverageService {
  private providers: Map<string, InsuranceProvider> = new Map();
  private policies: Map<string, InsurancePolicy> = new Map();
  private claims: Map<string, InsuranceClaim> = new Map();
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private userPortfolios: Map<string, InsurancePortfolio> = new Map();

  constructor() {
    this.initializeProviders();
    this.initializeRiskAssessments();
  }

  /**
   * Initialize insurance providers
   */
  private initializeProviders(): void {
    const providers: InsuranceProvider[] = [
      {
        id: 'nexus-mutual',
        name: 'Nexus Mutual',
        type: 'protocol',
        supportedProtocols: ['Aave', 'Compound', 'Curve', 'Uniswap', 'MakerDAO'],
        maxCoverage: 10000000,
        premiumRate: 0.5,
        claimProcess: 'Community voting',
        status: 'active',
      },
      {
        id: 'cover-protocol',
        name: 'Cover Protocol',
        type: 'smart-contract',
        supportedProtocols: ['Aave', 'Compound', 'Yearn', 'Balancer'],
        maxCoverage: 5000000,
        premiumRate: 0.75,
        claimProcess: 'Automated claims',
        status: 'active',
      },
      {
        id: 'unslashed',
        name: 'Unslashed Finance',
        type: 'custody',
        supportedProtocols: ['Lido', 'Rocket Pool', 'Stakewise'],
        maxCoverage: 3000000,
        premiumRate: 1.0,
        claimProcess: 'Manual review',
        status: 'active',
      },
    ];

    for (const provider of providers) {
      this.providers.set(provider.id, provider);
    }
  }

  /**
   * Initialize risk assessments
   */
  private initializeRiskAssessments(): void {
    const assessments: RiskAssessment[] = [
      {
        id: 'risk_aave',
        userId: '',
        protocol: 'Aave',
        riskScore: 25,
        auditStatus: 'audited',
        tvlRisk: 15,
        smartContractRisk: 10,
        counterpartyRisk: 20,
        historicalIncidents: 0,
        recommendation: 'Low risk - well-audited protocol with strong security track record',
      },
      {
        id: 'risk_compound',
        userId: '',
        protocol: 'Compound',
        riskScore: 30,
        auditStatus: 'audited',
        tvlRisk: 20,
        smartContractRisk: 15,
        counterpartyRisk: 25,
        historicalIncidents: 1,
        lastIncidentDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
        recommendation: 'Low-medium risk - established protocol with minor historical incidents',
      },
      {
        id: 'risk_curve',
        userId: '',
        protocol: 'Curve',
        riskScore: 35,
        auditStatus: 'audited',
        tvlRisk: 25,
        smartContractRisk: 20,
        counterpartyRisk: 30,
        historicalIncidents: 0,
        recommendation: 'Medium risk - specialized protocol with concentrated risk',
      },
    ];

    for (const assessment of assessments) {
      this.riskAssessments.set(assessment.protocol, assessment);
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(protocol?: string): InsuranceProvider[] {
    let providers = Array.from(this.providers.values()).filter(p => p.status === 'active');

    if (protocol) {
      providers = providers.filter(p => p.supportedProtocols.includes(protocol));
    }

    return providers.sort((a, b) => a.premiumRate - b.premiumRate);
  }

  /**
   * Get risk assessment
   */
  getRiskAssessment(protocol: string): RiskAssessment | undefined {
    return this.riskAssessments.get(protocol);
  }

  /**
   * Create insurance policy
   */
  createPolicy(userId: string, provider: string, protocol: string, coverageAmount: number): InsurancePolicy {
    const prov = this.providers.get(provider);
    if (!prov) throw new Error('Provider not found');

    if (!prov.supportedProtocols.includes(protocol)) {
      throw new Error(`${provider} does not support ${protocol}`);
    }

    if (coverageAmount > prov.maxCoverage) {
      throw new Error(`Coverage amount exceeds maximum of ${prov.maxCoverage}`);
    }

    const annualPremium = (coverageAmount * prov.premiumRate) / 100;
    const monthlyPremium = annualPremium / 12;

    const policy: InsurancePolicy = {
      id: `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      provider,
      protocol,
      coverageAmount,
      premiumRate: prov.premiumRate,
      annualPremium,
      monthlyPremium,
      startDate: Date.now(),
      expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
      status: 'active',
      claimsRemaining: 3,
    };

    this.policies.set(policy.id, policy);

    return policy;
  }

  /**
   * Get user policies
   */
  getUserPolicies(userId: string): InsurancePolicy[] {
    return Array.from(this.policies.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => b.startDate - a.startDate);
  }

  /**
   * Submit insurance claim
   */
  submitClaim(userId: string, policyId: string, lossAmount: number, description: string, evidence: string[]): InsuranceClaim {
    const policy = this.policies.get(policyId);
    if (!policy) throw new Error('Policy not found');

    if (policy.userId !== userId) throw new Error('Unauthorized');

    if (policy.claimsRemaining <= 0) {
      throw new Error('No claims remaining on this policy');
    }

    if (lossAmount > policy.coverageAmount) {
      throw new Error('Loss amount exceeds coverage amount');
    }

    const claim: InsuranceClaim = {
      id: `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      policyId,
      protocol: policy.protocol,
      incidentDate: Date.now(),
      lossAmount,
      claimAmount: Math.min(lossAmount, policy.coverageAmount),
      description,
      evidence,
      status: 'pending',
      submittedAt: Date.now(),
    };

    this.claims.set(claim.id, claim);

    // Simulate claim review
    setTimeout(() => {
      claim.status = 'approved';
      claim.reviewedAt = Date.now();
      claim.reviewNotes = 'Claim approved based on evidence provided';
    }, 5000);

    // Simulate payment
    setTimeout(() => {
      claim.status = 'paid';
      claim.paidAt = Date.now();
      policy.claimsRemaining--;
    }, 10000);

    return claim;
  }

  /**
   * Get user claims
   */
  getUserClaims(userId: string): InsuranceClaim[] {
    return Array.from(this.claims.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => b.submittedAt - a.submittedAt);
  }

  /**
   * Get insurance portfolio
   */
  getInsurancePortfolio(userId: string): InsurancePortfolio {
    const policies = this.getUserPolicies(userId);
    const claims = this.getUserClaims(userId);

    const totalCoverage = policies.reduce((sum, p) => sum + p.coverageAmount, 0);
    const monthlyPremiums = policies.reduce((sum, p) => sum + p.monthlyPremium, 0);
    const annualPremiums = policies.reduce((sum, p) => sum + p.annualPremium, 0);
    const claimsSubmitted = claims.length;
    const claimsApproved = claims.filter(c => c.status === 'approved' || c.status === 'paid').length;
    const totalPaid = claims.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.claimAmount, 0);

    // Identify coverage gaps
    const coveredProtocols = new Set(policies.map(p => p.protocol));
    const allProtocols = ['Aave', 'Compound', 'Curve', 'Uniswap', 'Yearn', 'Balancer'];
    const coverageGaps = allProtocols.filter(p => !coveredProtocols.has(p));

    const portfolio: InsurancePortfolio = {
      totalCoverage,
      activePolicies: policies.filter(p => p.status === 'active').length,
      monthlyPremiums,
      annualPremiums,
      claimsSubmitted,
      claimsApproved,
      totalPaid,
      coverageGaps,
    };

    this.userPortfolios.set(userId, portfolio);

    return portfolio;
  }

  /**
   * Get coverage recommendations
   */
  getCoverageRecommendations(userId: string, userPositions: Record<string, number>): CoverageRecommendation[] {
    const policies = this.getUserPolicies(userId);
    const coveredProtocols = new Set(policies.map(p => p.protocol));
    const recommendations: CoverageRecommendation[] = [];

    for (const [protocol, amount] of Object.entries(userPositions)) {
      if (amount === 0) continue;

      const risk = this.getRiskAssessment(protocol);
      if (!risk) continue;

      if (!coveredProtocols.has(protocol)) {
        const provider = this.getAvailableProviders(protocol)[0];
        if (provider) {
          const recommendedCoverage = amount * 0.8; // Cover 80% of position
          const annualPremium = (recommendedCoverage * provider.premiumRate) / 100;
          const monthlyPremium = annualPremium / 12;

          let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
          let priority = 1;

          if (risk.riskScore > 70) {
            riskLevel = 'critical';
            priority = 10;
          } else if (risk.riskScore > 50) {
            riskLevel = 'high';
            priority = 8;
          } else if (risk.riskScore > 30) {
            riskLevel = 'medium';
            priority = 5;
          }

          recommendations.push({
            protocol,
            recommendedCoverage,
            estimatedMonthlyPremium: monthlyPremium,
            riskLevel,
            priority,
            reason: risk.recommendation,
          });
        }
      }
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate insurance ROI
   */
  calculateInsuranceROI(userId: string): {
    totalPremiumsPaid: number;
    totalClaimsReceived: number;
    roi: number;
    breakEvenDate?: number;
  } {
    const policies = this.getUserPolicies(userId);
    const claims = this.getUserClaims(userId).filter(c => c.status === 'paid');

    const totalPremiumsPaid = policies.reduce((sum, p) => sum + p.monthlyPremium, 0) * 12; // Simplified
    const totalClaimsReceived = claims.reduce((sum, c) => sum + c.claimAmount, 0);
    const roi = totalPremiumsPaid > 0 ? ((totalClaimsReceived - totalPremiumsPaid) / totalPremiumsPaid) * 100 : 0;

    let breakEvenDate: number | undefined;
    if (totalClaimsReceived > 0 && totalPremiumsPaid > 0) {
      const monthsToBreakEven = totalPremiumsPaid / (totalPremiumsPaid / 12);
      breakEvenDate = Date.now() + monthsToBreakEven * 30 * 24 * 60 * 60 * 1000;
    }

    return {
      totalPremiumsPaid,
      totalClaimsReceived,
      roi,
      breakEvenDate,
    };
  }

  /**
   * Get insurance statistics
   */
  getInsuranceStatistics(): {
    totalPolicies: number;
    totalCoverage: number;
    totalClaims: number;
    approvalRate: number;
    averagePremiumRate: number;
  } {
    const policies = Array.from(this.policies.values());
    const claims = Array.from(this.claims.values());

    const totalPolicies = policies.length;
    const totalCoverage = policies.reduce((sum, p) => sum + p.coverageAmount, 0);
    const totalClaims = claims.length;
    const approvedClaims = claims.filter(c => c.status === 'approved' || c.status === 'paid').length;
    const approvalRate = totalClaims > 0 ? (approvedClaims / totalClaims) * 100 : 0;
    const averagePremiumRate = policies.length > 0 ? policies.reduce((sum, p) => sum + p.premiumRate, 0) / policies.length : 0;

    return {
      totalPolicies,
      totalCoverage,
      totalClaims,
      approvalRate,
      averagePremiumRate,
    };
  }
}

export const insuranceRiskCoverageService = new InsuranceRiskCoverageService();

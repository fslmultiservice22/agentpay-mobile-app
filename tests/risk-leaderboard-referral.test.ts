import { describe, it, expect, beforeEach } from 'vitest';
import { riskManagementService } from '../lib/risk-management';
import { leaderboardService } from '../lib/leaderboard';
import { referralService } from '../lib/referral';

describe('Risk Management Service', () => {
  beforeEach(() => {
    riskManagementService.clearAll();
  });

  it('should initialize risk management service', async () => {
    await riskManagementService.init();
    const levels = riskManagementService.getAllRiskLevels();
    expect(levels.length).toBe(3);
  });

  it('should create position risk', async () => {
    await riskManagementService.init();
    const risk = riskManagementService.createPositionRisk('pos_1', 2500, 2500, 5, 10);
    expect(risk).not.toBeUndefined();
  });

  it('should trigger stop-loss', async () => {
    await riskManagementService.init();
    const risk = riskManagementService.createPositionRisk('pos_1', 2500, 2500, 5, 10);
    const updated = riskManagementService.updatePositionPrice(risk.id, 2375);
    expect(updated?.status).toBe('stopped_out');
  });
});

describe('Leaderboard Service', () => {
  beforeEach(() => {
    leaderboardService.clearAll();
  });

  it('should initialize leaderboard service', async () => {
    await leaderboardService.init();
    const leaderboard = leaderboardService.getLeaderboard('trading', '30d');
    expect(leaderboard.length).toBeGreaterThan(0);
  });

  it('should get top entries', async () => {
    await leaderboardService.init();
    const topEntries = leaderboardService.getTopEntries('trading', 3, '30d');
    expect(topEntries.length).toBeLessThanOrEqual(3);
  });
});

describe('Referral Service', () => {
  beforeEach(() => {
    referralService.clearAll();
  });

  it('should initialize referral service', async () => {
    await referralService.init();
    const tiers = referralService.getAllTiers();
    expect(tiers.length).toBe(4);
  });

  it('should generate referral code', async () => {
    await referralService.init();
    const code = referralService.generateReferralCode('user_1', 'CryptoTrader');
    expect(code.code).not.toBeUndefined();
  });

  it('should register referral', async () => {
    await referralService.init();
    const code = referralService.generateReferralCode('user_1', 'CryptoTrader');
    const reward = await referralService.registerReferral(code.code, 'user_2', 'NewTrader', 50);
    expect(reward).not.toBeNull();
  });
});

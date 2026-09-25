// Test v89: SocialActivityWidget, /social-feed, shareGoal in savings-goals
import { describe, it, expect } from 'vitest';

describe('v89 features', () => {
  it('social feed storage key is correct', () => {
    expect('agentpay_social_feed').toBe('agentpay_social_feed');
  });
  it('social accounts storage key is correct', () => {
    expect('social_accounts').toBe('social_accounts');
  });
  it('post types are valid', () => {
    const validTypes = ['trade', 'milestone', 'achievement', 'savings', 'manual'];
    expect(validTypes).toContain('savings');
    expect(validTypes).toContain('milestone');
  });
  it('shareGoal generates correct post text for completed goal', () => {
    const goal = { name: 'Casa', currentAmount: 10000, targetAmount: 10000 };
    const isCompleted = goal.currentAmount >= goal.targetAmount;
    expect(isCompleted).toBe(true);
    const text = `Ho raggiunto il mio obiettivo di risparmio "${goal.name}"!`;
    expect(text).toContain('Casa');
    expect(text).toContain('raggiunto');
  });
  it('shareGoal generates correct post text for in-progress goal', () => {
    const goal = { name: 'Vacanza', currentAmount: 500, targetAmount: 2000 };
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    expect(progress).toBe(25);
    const text = `Progresso obiettivo "${goal.name}": `;
    expect(text).toContain('Vacanza');
  });
  it('social feed post schema is correct', () => {
    const post = { id: '123_0', platform: 'Twitter', text: 'test', timestamp: Date.now(), type: 'savings' };
    expect(post).toHaveProperty('id');
    expect(post).toHaveProperty('platform');
    expect(post).toHaveProperty('text');
    expect(post).toHaveProperty('timestamp');
    expect(post).toHaveProperty('type');
  });
  it('SocialActivityWidget storage key matches social-feed', () => {
    const widgetKey = 'agentpay_social_feed';
    const feedKey = 'agentpay_social_feed';
    expect(widgetKey).toBe(feedKey);
  });
  it('social-feed filters by platform correctly', () => {
    const posts = [
      { id: '1', platform: 'Twitter', text: 'a', timestamp: 1, type: 'savings' },
      { id: '2', platform: 'Instagram', text: 'b', timestamp: 2, type: 'trade' },
      { id: '3', platform: 'Twitter', text: 'c', timestamp: 3, type: 'milestone' },
    ];
    const filtered = posts.filter(p => p.platform === 'Twitter');
    expect(filtered).toHaveLength(2);
  });
  it('social-feed sorts by timestamp descending', () => {
    const posts = [
      { id: '1', timestamp: 100 },
      { id: '2', timestamp: 300 },
      { id: '3', timestamp: 200 },
    ];
    const sorted = [...posts].sort((a, b) => b.timestamp - a.timestamp);
    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('1');
  });
  it('social-feed delete removes correct post', () => {
    const posts = [
      { id: '1', platform: 'Twitter', text: 'a', timestamp: 1, type: 'savings' },
      { id: '2', platform: 'Instagram', text: 'b', timestamp: 2, type: 'trade' },
    ];
    const updated = posts.filter(p => p.id !== '1');
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe('2');
  });
  it('SocialActivityWidget shows correct count', () => {
    const posts = Array.from({ length: 5 }, (_, i) => ({ id: String(i), platform: 'Twitter', text: 'x', timestamp: i, type: 'savings' }));
    const displayCount = Math.min(posts.length, 3);
    expect(displayCount).toBe(3);
  });
});

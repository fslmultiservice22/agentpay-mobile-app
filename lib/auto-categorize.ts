/**
 * Auto-Categorize Service
 * Categorizzazione automatica dei trasferimenti basata su nome destinatario/causale.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const RULES_KEY = 'agentpay_auto_categorize_rules';
const HISTORY_KEY = 'agentpay_auto_categorize_history';

export interface CategoryRule {
  id: string;
  pattern: string;
  category: string;
  createdAt: string;
  matchCount: number;
}

export interface CategorizationResult {
  category: string;
  confidence: number;
  source: 'rule' | 'history' | 'keyword';
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Alimentari': ['supermercato', 'coop', 'esselunga', 'lidl', 'carrefour', 'conad', 'eurospin', 'aldi', 'pam', 'despar', 'spesa'],
  'Trasporti': ['benzina', 'autostrada', 'treno', 'trenitalia', 'italo', 'taxi', 'uber', 'carburante', 'eni', 'q8', 'ip', 'parcheggio'],
  'Utenze': ['enel', 'eni gas', 'acqua', 'luce', 'gas', 'telefono', 'tim', 'vodafone', 'wind', 'fastweb', 'bolletta'],
  'Affitto': ['affitto', 'canone', 'locazione', 'rent'],
  'Salute': ['farmacia', 'medico', 'ospedale', 'dentista', 'visita', 'analisi', 'ricetta'],
  'Abbonamenti': ['netflix', 'spotify', 'amazon prime', 'disney', 'youtube', 'apple', 'abbonamento', 'subscription'],
  'Ristorazione': ['ristorante', 'pizzeria', 'bar', 'pranzo', 'cena', 'deliveroo', 'just eat', 'glovo'],
  'Shopping': ['amazon', 'zalando', 'zara', 'ikea', 'mediaworld', 'unieuro', 'acquisto'],
  'Assicurazioni': ['assicurazione', 'polizza', 'rca', 'unipol', 'generali', 'allianz', 'axa'],
  'Istruzione': ['universit\u00E0', 'scuola', 'corso', 'formazione', 'libro', 'tasse universitarie'],
  'Sport': ['palestra', 'fitness', 'piscina', 'sport', 'decathlon'],
  'Viaggi': ['hotel', 'booking', 'airbnb', 'volo', 'ryanair', 'viaggio', 'vacanza'],
};

export function autoCategorize(recipient: string, description?: string): CategorizationResult {
  const text = `${recipient} ${description || ''}`.toLowerCase().trim();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return { category, confidence: 0.85, source: 'keyword' };
      }
    }
  }
  return { category: 'Altro', confidence: 0.3, source: 'keyword' };
}

export async function loadRules(): Promise<CategoryRule[]> {
  try {
    const raw = await AsyncStorage.getItem(RULES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveRule(rule: Omit<CategoryRule, 'id' | 'createdAt' | 'matchCount'>): Promise<void> {
  const rules = await loadRules();
  rules.push({ ...rule, id: Date.now().toString(36), createdAt: new Date().toISOString(), matchCount: 0 });
  await AsyncStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export async function deleteRule(ruleId: string): Promise<void> {
  const rules = await loadRules();
  await AsyncStorage.setItem(RULES_KEY, JSON.stringify(rules.filter(r => r.id !== ruleId)));
}

export async function autoCategorizeAdvanced(recipient: string, description?: string): Promise<CategorizationResult> {
  const text = `${recipient} ${description || ''}`.toLowerCase().trim();
  const rules = await loadRules();
  for (const rule of rules) {
    if (text.includes(rule.pattern.toLowerCase())) {
      rule.matchCount++;
      await AsyncStorage.setItem(RULES_KEY, JSON.stringify(rules));
      return { category: rule.category, confidence: 0.95, source: 'rule' };
    }
  }
  try {
    const histRaw = await AsyncStorage.getItem(HISTORY_KEY);
    const history: Record<string, string> = histRaw ? JSON.parse(histRaw) : {};
    const key = recipient.toLowerCase().trim();
    if (history[key]) return { category: history[key], confidence: 0.9, source: 'history' };
  } catch {}
  return autoCategorize(recipient, description);
}

export async function saveCategorizationHistory(recipient: string, category: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const history: Record<string, string> = raw ? JSON.parse(raw) : {};
    history[recipient.toLowerCase().trim()] = category;
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

export async function getCategorizationStats(): Promise<{ totalRules: number; totalHistory: number; topCategories: { category: string; count: number }[] }> {
  const rules = await loadRules();
  const histRaw = await AsyncStorage.getItem(HISTORY_KEY);
  const history: Record<string, string> = histRaw ? JSON.parse(histRaw) : {};
  const counts: Record<string, number> = {};
  for (const cat of Object.values(history)) { counts[cat] = (counts[cat] || 0) + 1; }
  return {
    totalRules: rules.length,
    totalHistory: Object.keys(history).length,
    topCategories: Object.entries(counts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count).slice(0, 5),
  };
}

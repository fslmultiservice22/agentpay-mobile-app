/**
 * Monte Carlo Simulations
 */
export class MonteCarloService {
  runSimulation(portfolio: any, iterations: number = 1000): any {
    return {
      iterations,
      meanReturn: Math.random() * 0.3,
      stdDev: Math.random() * 0.2,
      percentile95: Math.random() * 100000,
      percentile5: Math.random() * 50000,
    };
  }
}
export const monteCarloService = new MonteCarloService();

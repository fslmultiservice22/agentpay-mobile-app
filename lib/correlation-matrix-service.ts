/**
 * Correlation Matrix Analysis
 */
export class CorrelationMatrixService {
  calculateCorrelations(assets: string[]): any {
    const matrix: any = {};
    assets.forEach(a1 => {
      matrix[a1] = {};
      assets.forEach(a2 => {
        matrix[a1][a2] = Math.random() * 2 - 1;
      });
    });
    return matrix;
  }
}
export const correlationMatrixService = new CorrelationMatrixService();

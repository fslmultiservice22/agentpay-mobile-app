export const WALLesterMock = {
  accountLabel: "MOCK-WALLESTER-001",
  verification: "Solo dimostrativa",
  virtualCards: "Nessuna carta reale",
  creditLine: "Non configurata",
} as const;

export type WallesterMockData = typeof WALLesterMock;

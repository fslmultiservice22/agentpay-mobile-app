import express, { Request, Response } from 'express';

const router = express.Router();

// Mock data for testing
const mockTransactions = [
  {
    id: '1',
    type: 'send',
    amount: '0.5',
    address: '0x1234...5678',
    status: 'confirmed',
    timestamp: Date.now() - 86400000,
    hash: '0xabc123...',
  },
  {
    id: '2',
    type: 'receive',
    amount: '1.2',
    address: '0x8765...4321',
    status: 'confirmed',
    timestamp: Date.now() - 172800000,
    hash: '0xdef456...',
  },
];

// Get wallet data
router.get('/wallet/:address', (req: Request, res: Response) => {
  const { address } = req.params;
  
  res.json({
    address,
    balance: '2.5',
    gasBalance: '0.85',
    transactions: mockTransactions,
  });
});

// Get transaction history
router.get('/transactions/:address', (req: Request, res: Response) => {
  const { address } = req.params;
  
  res.json({
    address,
    transactions: mockTransactions,
    total: mockTransactions.length,
  });
});

// Send transaction
router.post('/transactions/send', (req: Request, res: Response) => {
  const { to, amount } = req.body;
  
  if (!to || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  res.json({
    hash: '0x' + Math.random().toString(16).slice(2),
    to,
    amount,
    status: 'pending',
    timestamp: Date.now(),
  });
});

// Validate address
router.post('/validate/address', (req: Request, res: Response) => {
  const { address } = req.body;
  const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
  
  res.json({ address, isValid });
});

// Get gas price
router.get('/gas-price', (req: Request, res: Response) => {
  res.json({
    standard: '50',
    fast: '100',
    instant: '150',
  });
});

export default router;
import { LoanOffer, UserFinancials } from '../types';

export const calculateEMI = (principal: number, annualRate: number, months: number): number => {
  const monthlyRate = annualRate / 12 / 100;
  return Math.round(
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1)
  );
};

export const calculateEligibility = (financials: UserFinancials, creditCategory: string = ''): number => {
  // Simple Mock Logic:
  // Eligibility Score (300-900)
  // Base: 650
  // +1 per 1000 income above 20k (capped at 150)
  // -2 per 1000 existing EMI
  let score = 650;
  
  const incomeBonus = Math.max(0, (financials.monthlyIncome - 20000) / 1000);
  score += Math.min(150, incomeBonus);
  
  const emiPenalty = financials.existingEmi / 1000 * 2;
  score -= emiPenalty;

  // Credit Score weighting
  // Excellent (750+) -> +10%
  // Good (700-749) -> +5%
  // Fair (650-699) -> 0%
  // Poor (<650) -> -10%
  // Unknown -> 0%
  if (creditCategory.toLowerCase().includes('excellent') || creditCategory.includes('750+')) {
    score = score * 1.10;
  } else if (creditCategory.toLowerCase().includes('good') || creditCategory.includes('700-749')) {
    score = score * 1.05;
  } else if (creditCategory.toLowerCase().includes('poor') || creditCategory.includes('<650')) {
    score = score * 0.90;
  }

  return Math.min(900, Math.max(300, Math.round(score)));
};

export const generateOffers = (financials: UserFinancials, loanType: string, score: number, creditCategory: string = ''): LoanOffer[] => {
  if (score < 600) return []; // Reject

  let baseRate = loanType === 'Home Loan' ? 8.5 : loanType === 'Personal Loan' ? 11.5 : 10.0;
  
  // Interest rate adjustments based on credit score
  if (creditCategory.toLowerCase().includes('excellent') || creditCategory.includes('750+')) {
    baseRate -= 0.5;
  } else if (creditCategory.toLowerCase().includes('poor') || creditCategory.includes('<650')) {
    baseRate += 0.5;
  }

  const maxLoanMultiplier = score > 750 ? 20 : score > 700 ? 15 : 10;
  const maxLoanAmount = financials.monthlyIncome * maxLoanMultiplier;

  // Generate 3 variations
  const offers: LoanOffer[] = [
    {
      id: 'opt_1',
      type: loanType,
      amount: Math.round(maxLoanAmount),
      interestRate: Number(baseRate.toFixed(2)),
      tenureMonths: 60,
      emi: 0,
      processingFee: 1000
    },
    {
      id: 'opt_2',
      type: loanType,
      amount: Math.round(maxLoanAmount * 0.8),
      interestRate: Number((baseRate - 0.5).toFixed(2)),
      tenureMonths: 48,
      emi: 0,
      processingFee: 500
    },
    {
      id: 'opt_3',
      type: loanType,
      amount: Math.round(maxLoanAmount * 1.2),
      interestRate: Number((baseRate + 1.0).toFixed(2)),
      tenureMonths: 72,
      emi: 0,
      processingFee: 2000
    }
  ];

  // Recalculate EMIs
  return offers.map(o => ({
    ...o,
    emi: calculateEMI(o.amount, o.interestRate, o.tenureMonths)
  }));
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const validatePAN = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
export const validateAadhaar = (aadhaar: string) => /^[2-9]{1}[0-9]{11}$/.test(aadhaar);
export const validateMobile = (mobile: string) => /^[6-9]\d{9}$/.test(mobile);
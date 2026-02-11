export enum AppStage {
  GREETING = 'GREETING',
  NAME_COLLECTION = 'NAME_COLLECTION',
  LOAN_TYPE_SELECTION = 'LOAN_TYPE_SELECTION',
  FINANCIAL_COLLECTION = 'FINANCIAL_COLLECTION',
  CREDIT_SCORE_COLLECTION = 'CREDIT_SCORE_COLLECTION',
  OFFER_GENERATION = 'OFFER_GENERATION',
  OFFER_SELECTION = 'OFFER_SELECTION',
  KYC_START = 'KYC_START',
  KYC_UPLOAD = 'KYC_UPLOAD',
  OTP_VERIFICATION = 'OTP_VERIFICATION',
  SANCTION_GENERATION = 'SANCTION_GENERATION',
  REJECTED = 'REJECTED',
  LOCKED = 'LOCKED'
}

export type Language = 'en' | 'hi';

export interface LoanOffer {
  id: string;
  type: string;
  amount: number;
  interestRate: number;
  tenureMonths: number;
  emi: number;
  processingFee: number;
}

export interface UserFinancials {
  monthlyIncome: number;
  existingEmi: number;
  requestedAmount?: number;
  preferredTenure?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'options' | 'card' | 'upload' | 'kyc-success' | 'sanction' | 'error';
  options?: string[];
  data?: any;
}

export interface KYCData {
  pan: string;
  aadhaar: string;
  verified: boolean;
  documentUploaded: boolean;
}

export interface AppState {
  stage: AppStage;
  language: Language;
  messages: ChatMessage[];
  userName: string;
  loanType: string;
  financials: UserFinancials;
  offers: LoanOffer[];
  selectedOffer: LoanOffer | null;
  kyc: KYCData;
  mobile: string;
  otpVerified: boolean;
  eligibilityScore: number;
  kycAttempts: number;
  creditScoreCategory: string;
}

export const INITIAL_STATE: AppState = {
  stage: AppStage.GREETING,
  language: 'en',
  messages: [],
  userName: '',
  loanType: '',
  financials: { monthlyIncome: 0, existingEmi: 0 },
  offers: [],
  selectedOffer: null,
  kyc: { pan: '', aadhaar: '', verified: false, documentUploaded: false },
  mobile: '',
  otpVerified: false,
  eligibilityScore: 0,
  kycAttempts: 0,
  creditScoreCategory: ''
};
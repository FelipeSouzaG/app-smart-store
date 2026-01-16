export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  tenantId?: string;
}

export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  TECHNICIAN = 'technician',
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  cnpjCpf?: string;
  totalPurchases?: number;
  totalServices?: number;
}

export interface Supplier {
  id: string;
  name: string;
  cnpjCpf: string;
  contactPerson?: string;
  phone: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  brand: string;
  model: string;
  location?: string;
  lastSold?: Date | string;
  requiresUniqueIdentifier?: boolean;
  publishToWeb?: boolean;
  image?: string;
  ecommerceDetails?: {
    priceSold: number;
    priceCash: number;
    installmentCount: number;
  };
  // UI metrics (Optional as they are computed client-side)
  status?: ProductStatus;
  daysOfSupply?: number;
  turnoverRate?: number;
  realMarginPercent?: number;
  floorPrice?: number;
  targetPrice?: number;
}

export enum ProductStatus {
  RUPTURA = 'Ruptura',
  RISCO = 'Risco',
  SEGURANCA = 'Segurança',
  EXCESSO = 'Excesso',
}

export enum ProductCategory {
  CELLPHONE = 'Celular',
  ACCESSORY = 'Acessório de Celular',
  ELECTRONIC = 'Eletrônico',
  OTHER = 'Outro',
}

export interface Service {
  id: string;
  name: string;
  brand: string;
  model: string;
  price: number;
  partCost: number;
  serviceCost: number;
  shippingCost: number;
  publishToWeb?: boolean;
  image?: string;
  ecommerceDetails?: {
    priceSold: number;
    priceCash: number;
    installmentCount: number;
  };
}

export interface CashTransaction {
  id: string;
  tenantId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory | string;
  status: TransactionStatus;
  timestamp: Date | string;
  dueDate?: Date | string;
  paymentDate?: Date | string;
  financialAccountId?: string;
  paymentMethodId?: string;

  // Links
  serviceOrderId?: string;
  purchaseId?: string;
  saleId?: string;

  // Invoice / Installments
  isInvoice?: boolean;
  invoiceStatus?: 'Open' | 'Closed';
  installments?: any[];
  isVirtual?: boolean;
  installmentNumber?: number;
}

export enum TransactionStatus {
  PENDING = 'Pendente',
  PAID = 'Pago',
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum TransactionCategory {
  RENT = 'Aluguel',
  WATER = 'Água',
  ELECTRICITY = 'Luz',
  INTERNET = 'Internet',
  TAXES = 'IPTU/Impostos',
  SALARY = 'Salário',
  PRODUCT_PURCHASE = 'Compra de Produto',
  SERVICE_REVENUE = 'Faturamento de Serviço',
  SALES_REVENUE = 'Faturamento de Venda',
  SERVICE_COST = 'Custo de Serviço',
  OTHER = 'Outros',
}

export interface TicketSale {
  id: string;
  tenantId: string;
  items: SaleItem[];
  total: number;
  totalCost: number;
  discount: number;
  paymentMethod: string;
  timestamp: Date | string;
  customerName: string;
  customerWhatsapp: string;
  customerId?: string;
  saleHour: number;
  userName: string;
  userId: string;
}

export interface SaleItem {
  item: Product | Service | any;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  type: 'product' | 'service';
  uniqueIdentifier?: string;
  productName?: string;
}

export interface ServiceOrder {
  id: string;
  tenantId: string;
  customerName: string;
  customerWhatsapp: string;
  customerContact?: string;
  customerCnpjCpf?: string;
  customerId?: string;
  serviceId: string;
  serviceDescription: string;
  totalPrice: number;
  totalCost: number;
  otherCosts: number;
  status: ServiceOrderStatus;
  createdAt: Date | string;
  completedAt?: Date | string;
  paymentMethod?: string;
  discount?: number;
  finalPrice?: number;
}

export enum ServiceOrderStatus {
  PENDING = 'Pendente',
  COMPLETED = 'Concluído',
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  items: PurchaseItem[];
  freightCost: number;
  otherCost: number;
  totalCost: number;
  paymentDetails: PaymentDetails;
  createdAt: Date | string;
  supplierInfo: {
    name: string;
    cnpjCpf: string;
    contactPerson: string;
    phone: string;
  };
  reference: string;
  status: TransactionStatus;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

export interface PaymentDetails {
  method: string;
  paymentDate?: Date | string;
  bank?: string;
  installments?: any[];
  installmentCount?: number;
  financialAccountId?: string;
  paymentMethodId?: string;
}

export enum PaymentMethod {
  PIX = 'Pix',
  CREDIT_CARD = 'Cartão de Crédito',
  CREDIT_CARD_SIGHT = 'Crédito à Vista',
  CREDIT_CARD_INSTALLMENT = 'Crédito Parcelado',
  BANK_TRANSFER = 'Transferência Bancária',
  CASH = 'Dinheiro',
  DEBIT_CARD = 'Cartão de Débito',
  BANK_SLIP = 'Boleto Bancário',
}

export interface EcommerceOrder {
  id: string;
  tenantId: string;
  customer: {
    name: string;
    phone: string;
    address: {
      cep: string;
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
    };
  };
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    image?: string;
    type: 'product' | 'service';
    uniqueIdentifier?: string;
  }[];
  total: number;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'CANCELLED';
  shippingInfo?: {
    method?: string;
    trackingCode?: string;
    cost?: number;
    shippedAt?: Date | string;
    deliveredAt?: Date | string;
    notes?: string;
  };
  createdAt: Date | string;
  relatedTicketId?: string;
  relatedServiceOrderId?: string;
  relatedCustomerId?: string;
}

export interface FinancialAccount {
  id: string;
  bankName: string;
  balance: number;
  paymentMethods: PaymentMethodConfig[];
  receivingRules: any[];
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: string;
}

export interface CompanyAddress {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
}

export interface CompanyInfo {
  name: string;
  cnpjCpf: string;
  phone: string;
  email: string;
  address: CompanyAddress;
}

export interface FinancialSettings {
  useBank: boolean;
  useCredit: boolean;
  cardClosingDay: number;
  cardDueDay: number;
}

export interface StockThresholds {
  riskMin: number;
  riskMax: number;
  safetyMax: number;
}

export interface KpiGoals {
  tenantId?: string;
  tenantName?: string;
  isSetupComplete: boolean;
  predictedAvgMargin: number;
  netProfit: number;
  inventoryTurnoverGoal: number;
  effectiveTaxRate: number;

  feePix: number;
  feeDebit: number;
  feeCreditSight: number;
  feeCreditInstallment: number;

  minContributionMargin: number;
  fixedCostAllocation: number;
  autoApplyDiscount: boolean;

  turnoverPeriod: string;
  stockThresholds: StockThresholds;

  discountSafety: number;
  discountRisk: number;
  discountExcess: number;

  companyInfo: CompanyInfo;
  financialSettings?: FinancialSettings;

  googleBusiness?: {
    status?: 'unverified' | 'verified' | 'not_found';
    hasExternalEcommerce?: boolean;
    websiteUri?: string;
    mapsUri?: string;
    dismissedPrompt?: boolean;
    successShown?: boolean;
  };

  legalAgreement?: {
    accepted: boolean;
    acceptedAt?: Date;
    version?: string;
    ipAddress?: string;
    userAgent?: string;
  };

  ecommercePolicies?: {
    refundPolicy: string;
    privacyPolicy: string;
    shippingPolicy: string;
    legalTerms: string;
    configured: boolean;
  };
}

export enum TurnoverPeriod {
  MONTHLY = 'Mensal (30 dias)',
  BIMONTHLY = 'Bimestral (60 dias)',
  QUARTERLY = 'Trimestral (90 dias)',
  SEMIANNUAL = 'Semestral (180 dias)',
  ANNUAL = 'Anual (365 dias)',
}

export interface StockLevelSummary {
  ruptura: number;
  risco: number;
  seguranca: number;
  excesso: number;
}

export interface TopProduct {
  id: string;
  name: string;
  quantitySold: number;
  currentStock: number;
  turnoverRatio?: number;
}

export interface SalesPeak {
  date: string;
  total: number;
}

export interface MarginMetrics {
  activeMarginAvg: number;
  activeProductPercentage: number;
  overallMarginAvg: number;
}

export interface KPIs {
  fixedCosts: number;
  currentRevenue: number;
  currentAvgContributionMargin: number;
  breakEvenPoint: number;
  currentNetProfit: number;
  totalRevenueGoal: number;
  progressPercentage: number;
  monthlyForecast: number;
  actualInventoryTurnover: number;
  projectedInventoryTurnover: number;
  goals: KpiGoals;
  stockLevelSummary: StockLevelSummary;
  top10SoldProducts: TopProduct[];
  lowestTurnoverProducts: TopProduct[];
  topSalesDays: SalesPeak[];
  marginMetrics: MarginMetrics;
  cashBalance: number;
  totalInflows: number;
  totalOutflows: number;
}

export enum Bank {
  ITAU = 'Itaú',
  INTER = 'Inter',
  CAIXA = 'Caixa',
  OTHER = 'Outros',
}

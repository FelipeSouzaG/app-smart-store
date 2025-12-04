// This file is now used by both frontend and backend (in dev) for type consistency.

export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  TECHNICIAN = 'technician',
}

export interface User {
  id: string; // Changed to string for MongoDB _id
  name: string;
  email: string;
  role: UserRole;
}

export enum ProductCategory {
  CELLPHONE = 'Celular',
  ACCESSORY = 'Acessório de Celular',
  ELECTRONIC = 'Eletrônico',
  OTHER = 'Outro',
}

export enum ProductStatus {
  RUPTURA = 'Ruptura',
  RISCO = 'Risco',
  SEGURANCA = 'Segurança',
  EXCESSO = 'Excesso',
}

export interface Product {
  id: string; // Barcode
  barcode: string; // Explicit barcode field
  name: string; // Usually Brand + Model
  price: number;
  cost: number;
  stock: number;
  lastSold: Date | null;
  location?: string;
  category: ProductCategory;
  brand: string;
  model: string;
  requiresUniqueIdentifier: boolean;
}

export interface StockHistory {
  id: string;
  productId: string;
  timestamp: Date;
  user: string;
  change: number;
  oldStock: number;
  newStock: number;
  reason: string;
}

export enum ServiceBrand {
  APPLE = 'Apple',
  SAMSUNG = 'Samsung',
  MOTOROLA = 'Motorola',
  XIAOMI = 'Xiaomi',
  OTHER = 'Outra',
}

export interface Service {
  id: string;
  name: string; // This will be "Tipo de Serviço"
  brand: string; // Changed from ServiceBrand to string to allow custom inputs
  model: string;
  price: number;
  partCost: number;
  serviceCost: number;
  shippingCost: number;
}

export interface SaleItem {
  item: Product | Service;
  quantity: number;
  unitPrice: number; // The price at the time of sale
  unitCost?: number; // The cost at the time of sale (snapshot)
  type: 'product' | 'service';
  uniqueIdentifier?: string;
}

export interface Customer {
  id: string; // ObjectId
  phone: string; // Phone number is now a field
  name: string;
  cnpjCpf?: string;
}

export interface TicketSale {
  id: string;
  items: SaleItem[];
  total: number; // Final price paid
  totalCost?: number; // Total cost of items sold
  discount?: number; // Discount amount applied
  paymentMethod?: string;
  timestamp: Date;
  customerName: string;
  customerWhatsapp: string;
  customerId?: string; // Link to the customer record
  saleHour: number;
  userId: string;
  userName: string;
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

export interface CashTransaction {
  id: string;
  description: string;
  amount: number; // Always positive
  type: TransactionType;
  category: TransactionCategory;
  status: TransactionStatus;
  timestamp: Date;
  dueDate?: Date;
  serviceOrderId?: string; // Link to the service order
  purchaseId?: string;
  saleId?: string;
}

export enum ServiceOrderStatus {
  PENDING = 'Pendente',
  COMPLETED = 'Concluído',
}

export interface ServiceOrder {
  id: string;
  customerName: string;
  customerWhatsapp: string;
  customerContact?: string;
  customerId?: string;
  customerCnpjCpf?: string;
  serviceId: string;
  serviceDescription: string;
  totalPrice: number; // Base sale price from the selected Service
  totalCost: number; // Cost to pay technician
  otherCosts: number;
  status: ServiceOrderStatus;
  createdAt: Date;
  completedAt?: Date;
  // Payment Details
  paymentMethod?: string;
  discount?: number;
  finalPrice?: number; // Actual amount paid
}

export enum TaxRegime {
  INFORMAL = 'Informal',
  MEI = 'MEI',
  SIMPLES = 'Simples Nacional',
  LUCRO_PRESUMIDO = 'Lucro Presumido',
  LUCRO_REAL = 'Lucro Real',
}

export enum TurnoverPeriod {
  MONTHLY = 'Mensal (30 dias)',
  BIMONTHLY = 'Bimestral (60 dias)',
  QUARTERLY = 'Trimestral (90 dias)',
  SEMIANNUAL = 'Semestral (180 dias)',
  ANNUAL = 'Anual (365 dias)',
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

export interface KpiGoals {
  isSetupComplete?: boolean; // Flag for first run wizard
  // Basic Goals
  predictedAvgMargin: number; // As a percentage, e.g., 40 for 40%
  netProfit: number;
  inventoryTurnoverGoal: number;

  // Strategic Pricing - Taxes (Fixed Sales Cost)
  effectiveTaxRate: number; // User entered average

  // Strategic Pricing - Fees (Variable Sales Cost)
  feePix: number;
  feeDebit: number;
  feeCreditSight: number;
  feeCreditInstallment: number; // Key for Discount Base

  // Strategic Pricing - Policies
  minContributionMargin: number; // The "Profit Lock" for Floor Price
  fixedCostAllocation: number; // To cover OpEx (Optional usage)
  autoApplyDiscount: boolean; // New Flag: Auto-apply discount based on fees?

  // Inventory Rules
  turnoverPeriod: TurnoverPeriod;

  // Stock Thresholds (Days of Supply)
  stockThresholds: {
    riskMin: number; // e.g. 1 day
    riskMax: number; // e.g. 15 days
    safetyMax: number; // e.g. 45 days (Above this is Excess)
  };

  // Strategic Pricing - Turnover Discount Matrix (Incentives)
  discountSafety: number;
  discountRisk: number;
  discountExcess: number;

  // Company Data
  companyInfo?: CompanyInfo;
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
  activeMarginAvg: number; // Avg margin of Ruptura/Risco/Seguranca
  activeProductPercentage: number; // % of total products that are active (not Excesso)
  overallMarginAvg: number; // Avg margin of everything
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
}

// Types for Purchase functionality
export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number; // Cost from the invoice
}

export enum PaymentMethod {
  PIX = 'Pix',
  CASH = 'Dinheiro',
  DEBIT_CARD = 'Cartão de Débito',
  CREDIT_CARD = 'Cartão de Crédito', // Legacy/Generic
  CREDIT_CARD_SIGHT = 'Crédito à Vista',
  CREDIT_CARD_INSTALLMENT = 'Crédito Parcelado',
  BANK_TRANSFER = 'Transferência Bancária',
  BANK_SLIP = 'Boleto Bancário',
}

export enum Bank {
  ITAU = 'Itaú',
  INTER = 'Inter',
  CAIXA = 'Caixa',
  OTHER = 'Outros',
}

export interface Installment {
  installmentNumber: number;
  amount: number;
  dueDate: Date;
}

export type PaymentDetails =
  | { method: PaymentMethod.CASH; paymentDate: Date }
  | {
      method:
        | PaymentMethod.PIX
        | PaymentMethod.CREDIT_CARD
        | PaymentMethod.CREDIT_CARD_SIGHT
        | PaymentMethod.CREDIT_CARD_INSTALLMENT
        | PaymentMethod.BANK_TRANSFER
        | PaymentMethod.DEBIT_CARD;
      bank: Bank;
      paymentDate: Date;
    }
  | {
      method: PaymentMethod.BANK_SLIP;
      bank: Bank;
      installments: Installment[];
    };

export interface SupplierInfo {
  name: string;
  cnpjCpf: string;
  contactPerson: string;
  phone: string;
}

export interface PurchaseOrder {
  id: string;
  items: PurchaseItem[];
  freightCost: number;
  otherCost: number;
  totalCost: number;
  paymentDetails: PaymentDetails;
  createdAt: Date;
  supplierInfo: SupplierInfo;
  reference: string;
}

export interface Supplier {
  id: string; // ObjectId
  cnpjCpf: string; // Document is now a separate field
  name: string;
  contactPerson?: string;
  phone: string;
}

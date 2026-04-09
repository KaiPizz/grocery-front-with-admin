export type CheckoutStep = 'delivery' | 'shipping' | 'payment' | 'review';

export interface PaymentMethod {
  id: string;
  name: string;
  code?: string;
  description?: string;
  provider?: string;
  methodType?: string;
  iconUrl?: string;
  fee?: { amount: number; currency: string };
}

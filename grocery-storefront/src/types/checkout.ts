export type CheckoutStep = 'delivery' | 'shipping' | 'payment' | 'review';

export interface PaymentMethod {
  id: string;
  name: string;
  description: string | null;
  provider: string | null;
  isActive: boolean | null;
  fee: { amount: number; currency: string } | null;
}

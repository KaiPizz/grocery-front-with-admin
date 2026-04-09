'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type CombinedError, useMutation } from 'urql';
import { ArrowLeft, ShieldCheck, ShoppingCart, Truck, Banknote, CreditCard, Building2, ChevronLeft, ChevronRight, Loader2, Tag, X, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  buildPendingPaymentContext,
  createPaymentReturnId,
  getPaymentStatusLabel,
  savePendingPaymentContext,
  normalizePaymentPhase,
} from '@/lib/checkout';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useHydrated } from '@/hooks/use-hydrated';
import { extractMoney, formatPrice } from '@/lib/utils';
import { CheckoutProgress } from '@/components/checkout/CheckoutProgress';
import { getGraphqlErrorMessage, graphqlRequest } from '@/lib/graphql/request';
import {
  checkoutSchema,
  type CheckoutFormData,
  type CheckoutStep,
  type PaymentMethod,
  type PaymentSession,
  type ShippingMethod,
} from '@/types/checkout';
import {
  CHECKOUT_CREATE_MUTATION,
  CHECKOUT_SHIPPING_ADDRESS_UPDATE,
  CHECKOUT_SHIPPING_METHOD_UPDATE,
  CHECKOUT_PAYMENT_CREATE,
  CHECKOUT_COMPLETE_MUTATION,
  CHECKOUT_NOTE_UPDATE,
  CHECKOUT_PROMO_CODE_ADD,
  CHECKOUT_PROMO_CODE_REMOVE,
  AVAILABLE_PAYMENT_METHODS_QUERY,
} from '@/lib/graphql/operations/grocery';

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  cod: Banknote,
  cash: Banknote,
  card: CreditCard,
  stripe: CreditCard,
  bank_transfer: Building2,
  tpay: Building2,
  blik: CreditCard,
  p24: Building2,
};

const INPUT_CLASS = 'w-full px-3 py-2.5 rounded-lg border text-sm bg-transparent transition-colors duration-fast focus:outline-none focus-visible:ring-2';

function getCombinedErrorMessage(error: CombinedError | undefined, fallback: string): string | null {
  if (!error) return null;

  const graphQLError = error.graphQLErrors.find(Boolean);
  const originalError = (graphQLError?.extensions as { originalError?: { message?: string | string[] } } | undefined)?.originalError;
  const originalMessage = originalError?.message;

  if (Array.isArray(originalMessage) && originalMessage.length > 0) {
    return String(originalMessage[0]);
  }

  if (typeof originalMessage === 'string' && originalMessage.trim()) {
    return originalMessage;
  }

  if (graphQLError?.message?.trim()) {
    return graphQLError.message;
  }

  if (error.message?.trim()) {
    return error.message;
  }

  return fallback;
}

function getConfirmationPath(locale: string): string {
  return `${locale === 'pl' ? '' : `/${locale}`}/checkout/confirmation`;
}

function buildConfirmationUrl(
  locale: string,
  params: Record<string, string | null | undefined>
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const path = getConfirmationPath(locale);
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

interface StorefrontPaymentMethod {
  id: string;
  name: string;
  type?: string | null;
  currencies?: string[] | null;
  config?: unknown;
  // fallback for older API shape
  code?: string;
}

interface PaymentMethodsResponse {
  availablePaymentMethods: StorefrontPaymentMethod[] | null;
}

function normalizeShippingMethod(method: ShippingMethod): ShippingMethod {
  const normalizedPrice = extractMoney(method.price) ?? { amount: 0, currency: 'PLN' };

  return {
    ...method,
    price: {
      ...normalizedPrice,
      gross: method.price.gross,
    },
  };
}

export default function CheckoutPage() {
  const locale = useLocale();
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
  const tCommon = useTranslations('common');
  const isHydrated = useHydrated();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const { items, getSubtotal, clear } = useCartStore();
  const displayItems = isHydrated ? items : [];
  const subtotal = isHydrated ? getSubtotal() : 0;

  const [step, setStep] = useState<CheckoutStep>('delivery');
  const [completedSteps, setCompletedSteps] = useState<Set<CheckoutStep>>(new Set());
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [paymentReturnId, setPaymentReturnId] = useState<string | null>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [totalFromServer, setTotalFromServer] = useState<number | null>(null);
  const [discount, setDiscount] = useState<{ amount: number; currency: string } | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  const [, createCheckout] = useMutation(CHECKOUT_CREATE_MUTATION);
  const [, updateShippingAddress] = useMutation(CHECKOUT_SHIPPING_ADDRESS_UPDATE);
  const [, updateShippingMethod] = useMutation(CHECKOUT_SHIPPING_METHOD_UPDATE);
  const [, createPayment] = useMutation(CHECKOUT_PAYMENT_CREATE);
  const [, completeCheckout] = useMutation(CHECKOUT_COMPLETE_MUTATION);
  const [, updateNote] = useMutation(CHECKOUT_NOTE_UPDATE);
  const [, addPromoCode] = useMutation(CHECKOUT_PROMO_CODE_ADD);
  const [, removePromoCode] = useMutation(CHECKOUT_PROMO_CODE_REMOVE);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {},
  });

  // Collect allergens from cart
  const cartAllergens = Array.from(
    new Set(displayItems.flatMap((i) => i.allergens || []))
  );

  const goToStep = useCallback((nextStep: CheckoutStep) => {
    setStep(nextStep);
  }, []);

  const markCompleted = useCallback((s: CheckoutStep) => {
    setCompletedSteps((prev) => {
      const next = new Set(Array.from(prev));
      next.add(s);
      return next;
    });
  }, []);

  const resetPaymentState = useCallback((options?: { preserveStep?: boolean }) => {
    setSelectedPayment(null);
    setPaymentSession(null);
    setPaymentReturnId(null);
    setCompletedSteps((previous) => {
      const next = new Set(previous);
      next.delete('payment');
      return next;
    });

    if (!options?.preserveStep && step === 'review') {
      setStep('payment');
    }
  }, [step]);

  const loadPaymentMethods = useCallback(async (checkoutIdForPayments: string) => {
    const response = await graphqlRequest<PaymentMethodsResponse>(AVAILABLE_PAYMENT_METHODS_QUERY, {
      checkoutId: checkoutIdForPayments,
    });

    const topLevelMessage = getGraphqlErrorMessage(response.errors);
    if (topLevelMessage) {
      throw new Error(topLevelMessage);
    }

    setPaymentMethods(
      (response.data?.availablePaymentMethods ?? []).map((method) => ({
        id: method.id ?? method.code,
        name: method.name,
        type: method.type ?? method.code,
      }))
    );
  }, []);

  useEffect(() => {
    if (session.status !== 'authenticated' || !session.user) {
      return;
    }

    const fullName = session.user.fullName?.trim() ?? '';
    const [firstName, ...rest] = fullName.split(/\s+/).filter(Boolean);

    if (!getValues('firstName') && firstName) {
      setValue('firstName', firstName);
    }

    if (!getValues('lastName') && rest.length > 0) {
      setValue('lastName', rest.join(' '));
    }

    if (!getValues('email') && session.user.email) {
      setValue('email', session.user.email);
    }

    if (!getValues('phone') && session.user.phone) {
      setValue('phone', session.user.phone);
    }
  }, [getValues, session.status, session.user, setValue]);

  if (!isHydrated) {
    return (
      <div className="container-grocery py-16 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <h1 className="heading-display text-xl mb-2" style={{ color: 'var(--color-foreground)' }}>{tCommon('loading')}</h1>
      </div>
    );
  }

  // --- Step handlers ---

  async function handleDeliverySubmit() {
    setLoading(true);
    try {
      const values = getValues();
      setCheckoutId(null);
      setSelectedShipping(null);
      setShippingCost(0);
      setTotalFromServer(null);
      resetPaymentState({ preserveStep: true });

      // Create checkout
      const createResult = await createCheckout({
        input: {
          email: values.email,
          lines: displayItems.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        },
      });

      const createMessage = getCombinedErrorMessage(createResult.error, t('orderError'));
      const checkout = createResult.data?.checkoutCreateFull?.checkout;
      const createErrors = createResult.data?.checkoutCreateFull?.errors;

      if (createMessage) {
        toast.error(createMessage);
        return;
      }
      if (createErrors?.length > 0) {
        toast.error(createErrors[0].message);
        return;
      }
      if (!checkout) {
        toast.error(t('orderError') || 'Failed to create checkout');
        return;
      }

      setCheckoutId(checkout.id);

      // Update shipping address
      const addrResult = await updateShippingAddress({
        checkoutId: checkout.id,
        address: {
          street: values.streetAddress1,
          city: values.city,
          postalCode: values.postalCode,
          country: 'PL',
        },
      });

      const addressMessage = getCombinedErrorMessage(addrResult.error, t('orderError'));
      const addrCheckout = addrResult.data?.checkoutShippingAddressUpdate?.checkout;
      const addrErrors = addrResult.data?.checkoutShippingAddressUpdate?.errors;

      if (addressMessage) {
        toast.error(addressMessage);
        return;
      }
      if (addrErrors?.length > 0) {
        toast.error(addrErrors[0].message);
        return;
      }

      // Set available shipping methods
      const methods = (addrCheckout?.availableShippingMethods || []).map(normalizeShippingMethod);
      setShippingMethods(methods);
      setPaymentMethods([]);

      markCompleted('delivery');
      goToStep('shipping');
    } catch (err) {
      toast.error(t('orderError') || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleShippingSelect(method: ShippingMethod) {
    if (!checkoutId) return;
    setLoading(true);
    try {
      const result = await updateShippingMethod({
        checkoutId,
        methodId: method.id,
      });

      const shippingMessage = getCombinedErrorMessage(result.error, t('orderError'));
      const checkout = result.data?.checkoutShippingMethodUpdate?.checkout;
      const errs = result.data?.checkoutShippingMethodUpdate?.errors;

      if (shippingMessage) {
        toast.error(shippingMessage);
        return;
      }
      if (errs?.length > 0) {
        toast.error(errs[0].message);
        return;
      }

      setSelectedShipping(method);
      resetPaymentState({ preserveStep: true });
      const shippingPrice = extractMoney(checkout?.shippingPrice);
      if (shippingPrice) {
        setShippingCost(shippingPrice.amount);
      }
      if (checkout?.totalPrice?.gross) {
        setTotalFromServer(checkout.totalPrice.gross.amount);
      }

      await loadPaymentMethods(checkoutId);

      markCompleted('shipping');
      goToStep('payment');
    } catch {
      toast.error(t('orderError') || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentSelect(method: PaymentMethod) {
    if (!checkoutId) return;
    setLoading(true);
    try {
      const nextPaymentReturnId = createPaymentReturnId();
      const result = await createPayment({
        input: {
          checkoutId,
          gateway: method.type || method.provider || method.name,
          amount: displayTotal,
          returnUrl: typeof window !== 'undefined'
            ? `${window.location.origin}${buildConfirmationUrl(locale, { paymentReturnId: nextPaymentReturnId })}`
            : '',
        },
      });

      const paymentMessage = getCombinedErrorMessage(result.error, t('orderError'));
      const payment = result.data?.checkoutPaymentCreate?.payment;
      const errs = result.data?.checkoutPaymentCreate?.errors;

      if (paymentMessage) {
        toast.error(paymentMessage);
        return;
      }
      if (errs?.length > 0) {
        toast.error(errs[0].message);
        return;
      }

      if (!payment) {
        toast.error('Payment could not be initialized.');
        return;
      }

      setSelectedPayment(method);
      setPaymentReturnId(nextPaymentReturnId);
      setPaymentSession({
        id: payment.id,
        gateway: payment.gateway,
        status: null,
        clientSecret: null,
        actionUrl: payment.paymentUrl ?? null,
        amount: payment.total?.amount ?? null,
        currency: payment.total?.currency ?? null,
        methodName: method.name,
      });
      markCompleted('payment');
      goToStep('review');
    } catch {
      toast.error(t('orderError') || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handlePlaceOrder() {
    if (!checkoutId) return;
    if (!selectedPayment || !paymentSession) {
      toast.error('Select and initialize a payment method before placing the order.');
      goToStep('payment');
      return;
    }
    setLoading(true);
    try {
      const values = getValues();

      // Update note if provided
      if (values.note?.trim()) {
        await updateNote({ checkoutId, note: values.note.trim() });
      }

      const result = await completeCheckout({
        checkoutId,
      });

      const completionMessage = getCombinedErrorMessage(result.error, t('orderError'));
      const order = result.data?.checkoutComplete?.order;
      const errs = result.data?.checkoutComplete?.errors;

      if (completionMessage) {
        toast.error(completionMessage);
        return;
      }
      if (errs?.length > 0) {
        toast.error(errs[0].message);
        return;
      }

      if (!order) {
        toast.error(t('orderError'));
        return;
      }

      // Use paymentUrl from order or from the payment session
      const redirectUrl = order.paymentUrl ?? paymentSession?.actionUrl ?? null;
      const paymentPhase = normalizePaymentPhase(paymentSession?.status, redirectUrl, false);

      clear();
      toast.success(t('orderSuccess'));

      if (paymentReturnId) {
        savePendingPaymentContext(
          buildPendingPaymentContext(
            paymentReturnId,
            {
              ...paymentSession,
              actionUrl: redirectUrl,
            },
            order.number,
            values.email,
            false
          )
        );
      }

      if (redirectUrl && paymentPhase === 'requires_action') {
        window.location.assign(redirectUrl);
        return;
      }

      router.push(
        buildConfirmationUrl(locale, {
          order: order.number,
          email: values.email,
          paymentReturnId,
        })
      );
    } catch {
      toast.error(t('orderError') || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handlePromoApply() {
    if (!checkoutId || !promoCode.trim()) return;
    setLoading(true);
    try {
      const result = await addPromoCode({
        checkoutId,
        promoCode: promoCode.trim(),
      });
      const promoMessage = getCombinedErrorMessage(result.error, t('orderError'));
      const errs = result.data?.checkoutPromoCodeAdd?.errors;
      if (promoMessage) {
        toast.error(promoMessage);
        return;
      }
      if (errs?.length > 0) {
        toast.error(errs[0].message);
        return;
      }
      const checkout = result.data?.checkoutPromoCodeAdd?.checkout;
      if (checkout?.discount) {
        setDiscount(checkout.discount);
        setPromoApplied(true);
      }
      if (checkout?.totalPrice?.gross) {
        setTotalFromServer(checkout.totalPrice.gross.amount);
      }
      if (selectedPayment) {
        resetPaymentState();
        toast.message('Order total changed. Reconfirm payment before placing the order.');
      }
      toast.success(t('promoApplied') || 'Promo code applied');
    } catch {
      toast.error(t('orderError') || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handlePromoRemove() {
    if (!checkoutId) return;
    setLoading(true);
    try {
      const result = await removePromoCode({ checkoutId });
      const promoRemoveMessage = getCombinedErrorMessage(result.error, t('orderError'));
      const checkout = result.data?.checkoutPromoCodeRemove?.checkout;
      if (promoRemoveMessage) {
        toast.error(promoRemoveMessage);
        return;
      }
      if (checkout?.totalPrice?.gross) {
        setTotalFromServer(checkout.totalPrice.gross.amount);
      }
      setDiscount(null);
      setPromoApplied(false);
      setPromoCode('');
      if (selectedPayment) {
        resetPaymentState();
        toast.message('Order total changed. Reconfirm payment before placing the order.');
      }
    } catch {
      toast.error(t('orderError') || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  if (displayItems.length === 0 && !checkoutId) {
    return (
      <div className="container-grocery py-16 text-center">
        <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <p className="text-sm mb-2" style={{ color: 'var(--color-muted-foreground)' }}>{tCart('empty')}</p>
        <Link href="/products" className="text-sm font-medium inline-block transition-opacity hover:opacity-80" style={{ color: 'var(--color-primary)' }}>
          {t('continueShopping')}
        </Link>
      </div>
    );
  }

  const displayTotal = totalFromServer ?? subtotal + shippingCost;
  const paymentPhase = normalizePaymentPhase(paymentSession?.status, paymentSession?.actionUrl);
  const paymentStatusLabel = paymentSession
    ? getPaymentStatusLabel(paymentPhase, paymentSession.methodName)
    : null;
  const paymentGuidance = paymentSession?.actionUrl
    ? 'You will be redirected to your payment provider after the order is created.'
    : paymentPhase === 'pending'
      ? 'Payment will remain pending until the provider confirms it.'
      : null;
  const placeOrderLabel = paymentSession?.actionUrl
    ? 'Place order and continue to payment'
    : t('placeOrder');

  return (
    <div className="container-grocery py-8 md:py-12">
      <Link
        href="/cart"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors duration-fast hover:opacity-80"
        style={{ color: 'var(--color-muted-foreground)' }}
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        {tCommon('back')}
      </Link>

      <h1 className="heading-display text-2xl md:text-3xl mb-4" style={{ color: 'var(--color-foreground)' }}>
        {t('title')}
      </h1>

      <CheckoutProgress currentStep={step} onStepClick={goToStep} completedSteps={completedSteps} />

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main form area */}
        <div className="lg:col-span-2">
          {/* STEP 1: Delivery */}
          {step === 'delivery' && (
            <form
              onSubmit={handleSubmit(handleDeliverySubmit)}
              noValidate
            >
              <section className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
                <h2 className="heading-section text-lg mb-5" style={{ color: 'var(--color-foreground)' }}>
                  {t('delivery')}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="checkout-fname" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('firstName')} <span style={{ color: 'var(--color-destructive)' }} aria-hidden="true">*</span>
                    </label>
                    <input
                      id="checkout-fname"
                      type="text"
                      autoComplete="given-name"
                      aria-invalid={!!errors.firstName}
                      className={INPUT_CLASS}
                      style={{
                        borderColor: errors.firstName ? 'var(--color-destructive)' : 'var(--color-border)',
                        color: 'var(--color-foreground)',
                      }}
                      {...register('firstName')}
                    />
                    {errors.firstName && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-destructive)' }} role="alert">
                        {t(errors.firstName.message as any) || t('required')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="checkout-lname" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('lastName')} <span style={{ color: 'var(--color-destructive)' }} aria-hidden="true">*</span>
                    </label>
                    <input
                      id="checkout-lname"
                      type="text"
                      autoComplete="family-name"
                      aria-invalid={!!errors.lastName}
                      className={INPUT_CLASS}
                      style={{
                        borderColor: errors.lastName ? 'var(--color-destructive)' : 'var(--color-border)',
                        color: 'var(--color-foreground)',
                      }}
                      {...register('lastName')}
                    />
                    {errors.lastName && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-destructive)' }} role="alert">
                        {t(errors.lastName.message as any) || t('required')}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="checkout-email" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('email')} <span style={{ color: 'var(--color-destructive)' }} aria-hidden="true">*</span>
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                      className={INPUT_CLASS}
                      style={{
                        borderColor: errors.email ? 'var(--color-destructive)' : 'var(--color-border)',
                        color: 'var(--color-foreground)',
                      }}
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-destructive)' }} role="alert">
                        {t(errors.email.message as any) || t('required')}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="checkout-phone" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('phone')}
                    </label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      autoComplete="tel"
                      className={INPUT_CLASS}
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                      {...register('phone')}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="checkout-address" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('address')} <span style={{ color: 'var(--color-destructive)' }} aria-hidden="true">*</span>
                    </label>
                    <input
                      id="checkout-address"
                      type="text"
                      autoComplete="street-address"
                      aria-invalid={!!errors.streetAddress1}
                      className={INPUT_CLASS}
                      style={{
                        borderColor: errors.streetAddress1 ? 'var(--color-destructive)' : 'var(--color-border)',
                        color: 'var(--color-foreground)',
                      }}
                      {...register('streetAddress1')}
                    />
                    {errors.streetAddress1 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-destructive)' }} role="alert">
                        {t('required')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="checkout-city" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('city')} <span style={{ color: 'var(--color-destructive)' }} aria-hidden="true">*</span>
                    </label>
                    <input
                      id="checkout-city"
                      type="text"
                      autoComplete="address-level2"
                      aria-invalid={!!errors.city}
                      className={INPUT_CLASS}
                      style={{
                        borderColor: errors.city ? 'var(--color-destructive)' : 'var(--color-border)',
                        color: 'var(--color-foreground)',
                      }}
                      {...register('city')}
                    />
                    {errors.city && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-destructive)' }} role="alert">
                        {t('required')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="checkout-postal" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('postalCode')} <span style={{ color: 'var(--color-destructive)' }} aria-hidden="true">*</span>
                    </label>
                    <input
                      id="checkout-postal"
                      type="text"
                      autoComplete="postal-code"
                      aria-invalid={!!errors.postalCode}
                      className={INPUT_CLASS}
                      style={{
                        borderColor: errors.postalCode ? 'var(--color-destructive)' : 'var(--color-border)',
                        color: 'var(--color-foreground)',
                      }}
                      {...register('postalCode')}
                    />
                    {errors.postalCode && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-destructive)' }} role="alert">
                        {t('required')}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  {t('nextStep')}
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Shipping */}
          {step === 'shipping' && (
            <section className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
              <h2 className="heading-section text-lg mb-2" style={{ color: 'var(--color-foreground)' }}>
                {t('shippingTitle')}
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('selectShipping')}
              </p>

              {shippingMethods.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  {t('noShippingMethods') || 'No shipping methods available'}
                </p>
              ) : (
                <div className="space-y-3" role="radiogroup" aria-label={t('shippingTitle')}>
                  {shippingMethods.map((method) => {
                    const isSelected = selectedShipping?.id === method.id;
                    const methodPrice = extractMoney(method.price);
                    const isFree = (methodPrice?.amount ?? 0) === 0;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleShippingSelect(method)}
                        disabled={loading}
                        className="w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-colors duration-fast disabled:opacity-60"
                        style={{
                          borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                          backgroundColor: isSelected ? 'color-mix(in srgb, var(--color-primary) 5%, transparent)' : 'transparent',
                        }}
                      >
                        <Truck className="w-5 h-5 shrink-0" style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }} aria-hidden="true" />
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{method.name}</p>
                          {(method.minimumDeliveryDays || method.maximumDeliveryDays) && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                              {t('deliveryDays', { min: method.minimumDeliveryDays ?? 1, max: method.maximumDeliveryDays ?? 3 })}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-bold tabular-nums" style={{ color: isFree ? 'var(--color-fresh)' : 'var(--color-foreground)' }}>
                          {isFree || !methodPrice ? t('freeShipping') : formatPrice(methodPrice.amount, methodPrice.currency)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={() => goToStep('delivery')}
                  className="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  {t('backStep')}
                </button>
              </div>
            </section>
          )}

          {/* STEP 3: Payment */}
          {step === 'payment' && (
            <section className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
              <h2 className="heading-section text-lg mb-2" style={{ color: 'var(--color-foreground)' }}>
                {t('paymentTitle')}
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('selectPayment')}
              </p>

              {paymentMethods.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  {t('noPaymentMethods') || 'No payment methods available'}
                </p>
              ) : (
                <div className="space-y-3" role="radiogroup" aria-label={t('paymentTitle')}>
                  {paymentMethods.map((method) => {
                    const isSelected = selectedPayment?.id === method.id;
                    const Icon =
                      PAYMENT_ICONS[method.type?.toLowerCase() ?? ''] ||
                      PAYMENT_ICONS[method.methodType?.toLowerCase() ?? ''] ||
                      PAYMENT_ICONS[method.provider?.toLowerCase() ?? ''] ||
                      CreditCard;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handlePaymentSelect(method)}
                        disabled={loading}
                        className="w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-colors duration-fast disabled:opacity-60"
                        style={{
                          borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                          backgroundColor: isSelected ? 'color-mix(in srgb, var(--color-primary) 5%, transparent)' : 'transparent',
                        }}
                      >
                        <Icon className="w-5 h-5 shrink-0" style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }} aria-hidden="true" />
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{method.name}</p>
                          {method.description && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{method.description}</p>
                          )}
                        </div>
                        {method.fee && method.fee.amount > 0 && (
                          <span className="text-xs tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                            +{formatPrice(method.fee.amount, method.fee.currency)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={() => goToStep('shipping')}
                  className="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  {t('backStep')}
                </button>
              </div>
            </section>
          )}

          {/* STEP 4: Review */}
          {step === 'review' && (
            <section className="space-y-6">
              <div className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
                <h2 className="heading-section text-lg mb-4" style={{ color: 'var(--color-foreground)' }}>
                  {t('reviewTitle')}
                </h2>

                {/* Delivery summary */}
                <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-muted-foreground)' }}>{t('delivery')}</p>
                  <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>
                    {getValues('firstName')} {getValues('lastName')}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>
                    {getValues('streetAddress1')}, {getValues('postalCode')} {getValues('city')}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{getValues('email')}</p>
                </div>

                {/* Shipping summary */}
                {selectedShipping && (
                  <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-muted-foreground)' }}>{t('shippingTitle')}</p>
                    <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>
                      {selectedShipping.name} — {selectedShipping.price.amount === 0 ? t('freeShipping') : formatPrice(selectedShipping.price.amount, selectedShipping.price.currency)}
                    </p>
                  </div>
                )}

                {/* Payment summary */}
                {selectedPayment && (
                  <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-muted-foreground)' }}>{t('paymentTitle')}</p>
                    <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>{selectedPayment.name}</p>
                    {paymentStatusLabel && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                        {paymentStatusLabel}
                      </p>
                    )}
                  </div>
                )}

                {/* Items */}
                <div className="mb-4">
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-muted-foreground)' }}>{t('summary')}</p>
                  <ul className="space-y-2" role="list">
                    {displayItems.map((item) => (
                      <li key={item.variantId} className="flex justify-between text-sm" role="listitem">
                        <span style={{ color: 'var(--color-foreground)' }}>
                          {item.name} &times; {item.quantity}
                        </span>
                        <span className="tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>
                          {formatPrice(item.price * item.quantity, item.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Allergen warning */}
                {cartAllergens.length > 0 && (
                  <div
                    className="rounded-lg p-3 mb-4 text-xs"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-allergen) 10%, transparent)', color: 'var(--color-allergen)' }}
                    role="alert"
                  >
                    {t('allergenWarning', { allergens: cartAllergens.join(', ') })}
                  </div>
                )}

                {/* Note */}
                <div>
                  <label htmlFor="checkout-note" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                    {t('note')}
                  </label>
                  <textarea
                    id="checkout-note"
                    rows={3}
                    placeholder={t('notePlaceholder')}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm bg-transparent transition-colors duration-fast focus:outline-none focus-visible:ring-2 resize-none"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                    {...register('note')}
                  />
                </div>

                {paymentGuidance && (
                  <div
                    className="rounded-lg p-3 mt-4 text-sm flex items-start gap-2"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                      color: 'var(--color-foreground)',
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                    <span>{paymentGuidance}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => goToStep('payment')}
                  className="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  {t('backStep')}
                </button>
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  ) : (
                    paymentSession?.actionUrl ? (
                      <ExternalLink className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                    )
                  )}
                  {loading ? t('processing') : placeOrderLabel}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Order summary sidebar */}
        <div>
          <div className="sticky top-20 rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
            <h2 className="heading-section text-lg mb-4" style={{ color: 'var(--color-foreground)' }}>
              {t('summary')}
            </h2>

            <ul className="space-y-3 mb-4" role="list">
              {displayItems.map((item) => (
                <li key={item.variantId} className="flex justify-between text-sm" role="listitem">
                  <span className="truncate max-w-[180px]" style={{ color: 'var(--color-foreground)' }}>
                    {item.name} &times; {item.quantity}
                  </span>
                  <span className="tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>
                    {formatPrice(item.price * item.quantity, item.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t pt-3 mb-4 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-muted-foreground)' }}>{tCart('subtotal')}</span>
                <span className="tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>{formatPrice(subtotal)}</span>
              </div>
              {shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-muted-foreground)' }}>{tCart('shipping')}</span>
                  <span className="tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>{formatPrice(shippingCost)}</span>
                </div>
              )}
              {selectedShipping && shippingCost === 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-muted-foreground)' }}>{tCart('shipping')}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-fresh)' }}>{t('freeShipping')}</span>
                </div>
              )}
              {discount && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-fresh)' }}>Discount</span>
                  <span className="tabular-nums font-medium" style={{ color: 'var(--color-fresh)' }}>
                    -{formatPrice(discount.amount, discount.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1">
                <span style={{ color: 'var(--color-foreground)' }}>{tCart('total')}</span>
                <span className="text-lg tabular-nums" style={{ color: 'var(--color-foreground)' }}>{formatPrice(displayTotal)}</span>
              </div>
            </div>

            {/* Promo code */}
            {checkoutId && (
              <div className="mb-4">
                {promoApplied ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="w-4 h-4" style={{ color: 'var(--color-fresh)' }} aria-hidden="true" />
                    <span className="flex-1 font-medium" style={{ color: 'var(--color-fresh)' }}>{promoCode}</span>
                    <button
                      type="button"
                      onClick={handlePromoRemove}
                      className="p-1 rounded hover-surface"
                      aria-label="Remove promo code"
                    >
                      <X className="w-3.5 h-3.5" style={{ color: 'var(--color-muted-foreground)' }} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder={t('promoPlaceholder') || 'Promo code'}
                      className="flex-1 px-3 py-2 rounded-lg border text-sm bg-transparent focus:outline-none focus-visible:ring-2"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                    />
                    <button
                      type="button"
                      onClick={handlePromoApply}
                      disabled={loading || !promoCode.trim()}
                      className="px-3 py-2 rounded-lg text-sm font-medium border transition-colors duration-fast hover-surface disabled:opacity-50"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                    >
                      {t('applyPromo') || 'Apply'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Allergen summary */}
            {cartAllergens.length > 0 && (
              <div
                className="rounded-lg p-2.5 mb-4 text-xs"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-allergen) 10%, transparent)', color: 'var(--color-allergen)' }}
              >
                {t('allergenWarning', { allergens: cartAllergens.join(', ') })}
              </div>
            )}

            {/* Trust badges */}
            <div className="border-t pt-4 space-y-2.5" style={{ borderColor: 'var(--color-border)' }}>
              {[
                { icon: ShieldCheck, label: t('trustSecure') },
                { icon: Truck, label: t('trustFast') },
                { icon: RefreshCw, label: t('trustReturns') },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                  <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

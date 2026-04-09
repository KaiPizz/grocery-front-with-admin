'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Banknote,
  Building2,
  ChevronRight,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Truck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { CheckoutSection, CheckoutProgressBar } from '@/components/checkout/CheckoutProgress';
import { Link, useRouter } from '@/i18n/navigation';
import {
  AVAILABLE_PAYMENT_METHODS_QUERY,
  CHECKOUT_COMPLETE_MUTATION,
  CHECKOUT_CREATE_MUTATION,
  CHECKOUT_NOTE_UPDATE,
  CHECKOUT_PAYMENT_CREATE,
  CHECKOUT_SHIPPING_ADDRESS_UPDATE,
  CHECKOUT_SHIPPING_METHOD_UPDATE,
} from '@/lib/graphql/operations/grocery';
import { getGraphqlErrorMessage, graphqlRequest } from '@/lib/graphql/request';
import { formatPrice } from '@/lib/utils';
import { useChannel } from '@/hooks/use-channel';
import { useHydrated } from '@/hooks/use-hydrated';
import { useCartStore } from '@/stores/cart-store';
import type { CartDeliveryOption } from '@/types';
import type { CheckoutStep, PaymentMethod } from '@/types/checkout';

interface CheckoutMutationError {
  field?: string[] | string | null;
  message: string;
  code?: string | null;
}

interface LegacyCheckout {
  id: string;
  email?: string | null;
  availableShippingMethods?: Array<{
    id: string;
    name: string;
    price?: {
      amount: number;
      currency: string;
    } | null;
  }> | null;
}

interface CheckoutCreateResponse {
  checkoutCreateFull: {
    checkout: LegacyCheckout | null;
    errors: CheckoutMutationError[] | null;
  } | null;
}

interface CheckoutShippingAddressResponse {
  checkoutShippingAddressUpdate: {
    checkout: LegacyCheckout | null;
    errors: CheckoutMutationError[] | null;
  } | null;
}

interface CheckoutShippingMethodResponse {
  checkoutShippingMethodUpdate: {
    checkout: {
      id: string;
      shippingPrice?: {
        amount: number;
        currency: string;
      } | null;
      totalPrice?: {
        gross?: {
          amount: number;
          currency: string;
        } | null;
      } | null;
    } | null;
    errors: CheckoutMutationError[] | null;
  } | null;
}

interface PaymentMethodsResponse {
  availablePaymentMethods: Array<{
    code?: string | null;
    name: string;
  }> | null;
}

interface PaymentCreateResponse {
  checkoutPaymentCreate: {
    payment: {
      id: string;
      gateway?: string | null;
      status?: string | null;
      clientSecret?: string | null;
      actionUrl?: string | null;
      total?: {
        amount: number;
        currency: string;
      } | null;
    } | null;
    errors: CheckoutMutationError[] | null;
  } | null;
}

interface CheckoutNoteUpdateResponse {
  checkoutNoteUpdate: {
    checkout: {
      id: string;
      note?: string | null;
    } | null;
    errors: CheckoutMutationError[] | null;
  } | null;
}

interface CheckoutCompleteResponse {
  checkoutComplete: {
    order: {
      id: string;
      number: string;
      status: string;
      createdAt?: string | null;
      total?: {
        gross?: {
          amount: number;
          currency: string;
        } | null;
      } | null;
    } | null;
    confirmationNeeded?: boolean | null;
    errors: CheckoutMutationError[] | null;
  } | null;
}

interface DeliveryFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress1: string;
  city: string;
  postalCode: string;
  country: string;
  note: string;
}

type FieldErrors = Partial<Record<keyof DeliveryFormState, string>>;

interface PaymentSessionState {
  id: string;
  gateway?: string | null;
  status?: string | null;
  clientSecret?: string | null;
  actionUrl?: string | null;
}

interface CheckoutDraftState {
  step: CheckoutStep;
  completedSteps: CheckoutStep[];
  form: DeliveryFormState;
  checkoutId: string | null;
  promoCode: string;
}

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  cod: Banknote,
  cash: Banknote,
  stripe: CreditCard,
  p24: Building2,
  tpay: Building2,
  bank_transfer: Building2,
  blik: CreditCard,
};

const INPUT_CLASS =
  'w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm transition-colors duration-fast focus:outline-none focus-visible:ring-2';
const CHECKOUT_DRAFT_KEY = 'oms-checkout-draft-v1';

function getPayloadMessage(errors?: CheckoutMutationError[] | null): string | null {
  return errors?.find((error) => error.message?.trim())?.message ?? null;
}

function getRequestMessage(
  topLevelErrors: Parameters<typeof getGraphqlErrorMessage>[0],
  payloadErrors?: CheckoutMutationError[] | null,
  fallback = 'Request failed.'
) {
  return getPayloadMessage(payloadErrors) ?? getGraphqlErrorMessage(topLevelErrors) ?? fallback;
}

function getPaymentIcon(method: PaymentMethod) {
  const code = method.code?.toLowerCase() ?? method.id.toLowerCase();
  return PAYMENT_ICONS[code] ?? CreditCard;
}

function createInitialFormState(email?: string | null): DeliveryFormState {
  return {
    firstName: '',
    lastName: '',
    email: email ?? '',
    phone: '',
    streetAddress1: '',
    city: '',
    postalCode: '',
    country: 'PL',
    note: '',
  };
}

function normalizeCountryCode(value: string): string {
  const normalized = value.trim().toUpperCase();

  if (!normalized) return 'PL';
  if (normalized === 'POLAND' || normalized === 'POLSKA') return 'PL';
  if (normalized.length === 2) return normalized;

  return normalized.slice(0, 2);
}

function translateDeliveryOptionName(locale: string, option: CartDeliveryOption): string {
  const source = `${option.id} ${option.name}`.toLowerCase();

  if (source.includes('pickup') || source.includes('odbiór osobisty') || source.includes('odbior osobisty')) {
    return locale === 'pl' ? 'Odbiór osobisty' : 'Pickup in store';
  }

  return option.name;
}

function translatePaymentMethodName(locale: string, method: PaymentMethod): string {
  const code = (method.code ?? method.id).toLowerCase();

  if (code === 'card') return locale === 'pl' ? 'Karta płatnicza' : 'Credit/Debit Card';
  if (code === 'bank_transfer') return locale === 'pl' ? 'Przelew bankowy' : 'Bank Transfer';
  if (code === 'cod') return locale === 'pl' ? 'Płatność przy odbiorze' : 'Cash on Delivery';
  if (code === 'blik') return 'BLIK';
  if (code === 'p24') return 'Przelewy24';

  return method.name;
}

export default function CheckoutPage() {
  const locale = useLocale();
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHydrated = useHydrated();
  const channel = useChannel();

  const items = useCartStore((state) => state.items);
  const cost = useCartStore((state) => state.cost);
  const buyerIdentity = useCartStore((state) => state.buyerIdentity);
  const note = useCartStore((state) => state.note);
  const discountCodes = useCartStore((state) => state.discountCodes);
  const deliveryOptions = useCartStore((state) => state.deliveryOptions);
  const selectedDeliveryOption = useCartStore((state) => state.selectedDeliveryOption);
  const initialized = useCartStore((state) => state.initialized);
  const isCartLoading = useCartStore((state) => state.isLoading);
  const cartError = useCartStore((state) => state.error);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const updateBuyerIdentity = useCartStore((state) => state.updateBuyerIdentity);
  const updateDiscountCodes = useCartStore((state) => state.updateDiscountCodes);
  const updateNote = useCartStore((state) => state.updateNote);
  const fetchDeliveryOptions = useCartStore((state) => state.fetchDeliveryOptions);
  const selectDeliveryOption = useCartStore((state) => state.selectDeliveryOption);
  const clearCart = useCartStore((state) => state.clearCart);

  const sessionEmail = buyerIdentity?.email ?? '';
  const [step, setStep] = useState<CheckoutStep>('delivery');
  const [completedSteps, setCompletedSteps] = useState<Set<CheckoutStep>>(new Set());
  const [form, setForm] = useState<DeliveryFormState>(() => createInitialFormState(sessionEmail));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [promoCode, setPromoCode] = useState('');
  const [checkoutId, setCheckoutId] = useState<string | null>(searchParams.get('checkoutId'));
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSessionState | null>(null);
  const [shippingCost, setShippingCost] = useState<number>(selectedDeliveryOption?.price.amount ?? 0);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const uiText = useMemo(
    () => ({
      paymentReturned:
        locale === 'pl'
          ? 'Płatność wróciła do checkoutu. Sprawdź zamówienie i dokończ je, jeśli bramka zakończyła się sukcesem.'
          : 'Payment returned to checkout. Review the order and finish if the gateway succeeded.',
      noDeliveryOptions:
        locale === 'pl'
          ? 'Dla tego koszyka nie ma jeszcze dostępnych metod dostawy.'
          : 'No delivery options are available for this cart yet.',
      failedDeliverySelection:
        locale === 'pl'
          ? 'Nie udało się zapisać wybranej metody dostawy.'
          : 'Failed to save delivery selection.',
      selectDeliveryFirst:
        locale === 'pl'
          ? 'Najpierw wybierz metodę dostawy.'
          : 'Select a delivery option before continuing to payment.',
      retryHandoff: locale === 'pl' ? 'Ponów przekazanie checkoutu' : 'Retry handoff',
      noPaymentMethods:
        locale === 'pl'
          ? 'Metody płatności są już skonfigurowane, ale checkout nie został jeszcze poprawnie przekazany z powodu błędu backendu.'
          : 'Payment methods are configured, but checkout handoff has not completed yet because the backend bridge is failing.',
      calculatedNext: locale === 'pl' ? 'Wyliczymy dalej' : 'Calculated next',
      discountLabel: locale === 'pl' ? 'Rabat' : 'Discount',
      noneLabel: locale === 'pl' ? 'Brak' : 'None',
      notSelected: locale === 'pl' ? 'Nie wybrano' : 'Not selected',
      paymentNotInitialized: locale === 'pl' ? 'Płatność nie została zainicjalizowana' : 'Payment not initialized',
    }),
    [locale]
  );

  const loadPaymentMethods = useCallback(async (countryCodeOverride?: string) => {
    const response = await graphqlRequest<PaymentMethodsResponse>(AVAILABLE_PAYMENT_METHODS_QUERY, {
      channel,
      countryCode: countryCodeOverride ?? normalizeCountryCode(form.country),
    });
    const paymentMethodsMessage = getGraphqlErrorMessage(response.errors);

    if (paymentMethodsMessage) {
      setErrorBanner(paymentMethodsMessage);
      toast.error(paymentMethodsMessage);
      return false;
    }

    const mappedMethods: PaymentMethod[] = (response.data?.availablePaymentMethods ?? []).map((method) => ({
      id: method.code ?? method.name,
      code: method.code ?? undefined,
      name: method.name,
    }));

    setPaymentMethods(mappedMethods);
    return true;
  }, [channel, form.country]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      email: current.email || sessionEmail,
      phone: current.phone || buyerIdentity?.phone || '',
      country: current.country || buyerIdentity?.countryCode || 'PL',
      note: current.note || note || '',
    }));
  }, [buyerIdentity?.countryCode, buyerIdentity?.phone, note, sessionEmail]);

  useEffect(() => {
    if (!selectedDeliveryOption) {
      setShippingCost(0);
      return;
    }

    setShippingCost(selectedDeliveryOption.price.amount);
  }, [selectedDeliveryOption]);

  useEffect(() => {
    if (!isHydrated || step !== 'payment' || paymentMethods.length > 0 || !selectedDeliveryOption) {
      return;
    }

    void loadPaymentMethods(normalizeCountryCode(form.country));
  }, [form.country, isHydrated, loadPaymentMethods, paymentMethods.length, selectedDeliveryOption, step]);

  useEffect(() => {
    const returnedCheckoutId = searchParams.get('checkoutId');
    const paymentReturned = searchParams.get('payment');

    if (!returnedCheckoutId) {
      return;
    }

    setCheckoutId((current) => current ?? returnedCheckoutId);
    setCompletedSteps(new Set<CheckoutStep>(['delivery', 'shipping']));
    setStep(paymentReturned ? 'review' : 'payment');

    if (paymentReturned) {
      setErrorBanner(uiText.paymentReturned);
    }
  }, [searchParams, uiText.paymentReturned]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const rawDraft = window.sessionStorage.getItem(CHECKOUT_DRAFT_KEY);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as CheckoutDraftState;
      setForm(draft.form);
      setCompletedSteps(new Set<CheckoutStep>(draft.completedSteps));
      setStep(draft.step);
      setCheckoutId((current) => current ?? draft.checkoutId);
      setPromoCode(draft.promoCode);
    } catch {
      window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    }
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const draft: CheckoutDraftState = {
      step,
      completedSteps: Array.from(completedSteps),
      form,
      checkoutId,
      promoCode,
    };

    window.sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  }, [checkoutId, completedSteps, form, isHydrated, promoCode, step]);

  useEffect(() => {
    if (step === 'review') {
      setMobileSummaryOpen(true);
    }
  }, [step]);

  const displaySubtotal = cost.subtotalAmount?.amount ?? getSubtotal();
  const displayCurrency =
    cost.totalAmount?.currency
    || cost.subtotalAmount?.currency
    || items[0]?.currency
    || 'PLN';
  const discountedTotal = cost.totalAmount?.amount ?? displaySubtotal;
  const displayTotal = serverTotal ?? discountedTotal + shippingCost;
  const appliedDiscount = useMemo(
    () => discountCodes.find((entry) => entry.applicable),
    [discountCodes]
  );
  const summaryContent = (
    <>
      <ul className="space-y-3 mb-5" role="list">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 text-sm" role="listitem">
            <span style={{ color: 'var(--color-foreground)' }}>
              {item.name} x {item.quantity}
            </span>
            <span className="tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>
              {formatPrice(item.totalPrice ?? item.price * item.quantity, item.currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-t pt-4 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-muted-foreground)' }}>{tCart('subtotal')}</span>
          <span className="font-medium tabular-nums" style={{ color: 'var(--color-foreground)' }}>
            {formatPrice(displaySubtotal, displayCurrency)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-muted-foreground)' }}>{tCart('shipping')}</span>
          <span className="font-medium tabular-nums" style={{ color: 'var(--color-foreground)' }}>
            {selectedDeliveryOption
              ? selectedDeliveryOption.price.amount === 0
                ? t('freeShipping')
                : formatPrice(shippingCost, selectedDeliveryOption.price.currency)
              : uiText.calculatedNext}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-muted-foreground)' }}>{uiText.discountLabel}</span>
          <span className="font-medium" style={{ color: appliedDiscount ? 'var(--color-fresh)' : 'var(--color-muted-foreground)' }}>
            {appliedDiscount ? appliedDiscount.code : uiText.noneLabel}
          </span>
        </div>
        <div className="flex justify-between pt-2 font-bold">
          <span style={{ color: 'var(--color-foreground)' }}>{tCart('total')}</span>
          <span className="text-lg tabular-nums" style={{ color: 'var(--color-foreground)' }}>
            {formatPrice(displayTotal, displayCurrency)}
          </span>
        </div>
      </div>

      <div className="mt-5">
        {discountCodes.length > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border px-3 py-3 text-sm" style={{ borderColor: 'var(--color-border)' }}>
            <Tag className="h-4 w-4 shrink-0" style={{ color: 'var(--color-fresh)' }} aria-hidden="true" />
            <span className="flex-1 font-medium" style={{ color: 'var(--color-foreground)' }}>
              {discountCodes.map((entry) => entry.code).join(', ')}
            </span>
            <button
              type="button"
              onClick={() => void handlePromoRemove()}
              disabled={busy}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full"
              aria-label="Remove promo code"
            >
              <X className="h-4 w-4" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              placeholder={t('promoPlaceholder')}
              className={INPUT_CLASS}
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
            />
            <button
              type="button"
              onClick={() => void handlePromoApply()}
              disabled={busy || !promoCode.trim()}
              className="rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
            >
              {t('applyPromo')}
            </button>
          </div>
        )}
      </div>

      <div className="border-t pt-4 mt-5 space-y-2.5" style={{ borderColor: 'var(--color-border)' }}>
        {[
          { icon: ShieldCheck, label: t('trustSecure') },
          { icon: Truck, label: t('trustFast') },
          { icon: RefreshCw, label: t('trustReturns') },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </>
  );

  function setFieldValue<K extends keyof DeliveryFormState>(key: K, value: DeliveryFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  function markCompleted(nextStep: CheckoutStep) {
    setCompletedSteps((current) => {
      const next = new Set(Array.from(current));
      next.add(nextStep);
      return next;
    });
  }

  function validateDeliveryStep() {
    const errors: FieldErrors = {};

    if (!form.firstName.trim()) errors.firstName = t('required');
    if (!form.lastName.trim()) errors.lastName = t('required');
    if (!form.email.trim()) {
      errors.email = t('required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = t('invalidEmail');
    }
    if (!form.streetAddress1.trim()) errors.streetAddress1 = t('required');
    if (!form.city.trim()) errors.city = t('required');
    if (!form.postalCode.trim()) errors.postalCode = t('required');
    if (!form.country.trim()) errors.country = t('required');

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleDeliveryContinue() {
    if (!validateDeliveryStep()) {
      return;
    }

    setBusy(true);
    setErrorBanner(null);

    try {
      const buyerUpdated = await updateBuyerIdentity({
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        countryCode: normalizeCountryCode(form.country),
      });

      if (!buyerUpdated) {
        const message = useCartStore.getState().error ?? t('orderError');
        setErrorBanner(message);
        toast.error(message);
        return;
      }

      if (form.note !== note) {
        await updateNote(form.note);
      }

      const options = await fetchDeliveryOptions();

      if (options.length === 0) {
        const message = uiText.noDeliveryOptions;
        setErrorBanner(message);
        toast.error(message);
        return;
      }

      markCompleted('delivery');
      setStep('shipping');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeliverySelection(option: CartDeliveryOption) {
    setBusy(true);
    setErrorBanner(null);

    try {
      const success = await selectDeliveryOption(option);

      if (!success) {
        const message = useCartStore.getState().error ?? uiText.failedDeliverySelection;
        setErrorBanner(message);
        toast.error(message);
        return;
      }

      await loadPaymentMethods(normalizeCountryCode(form.country));

      markCompleted('shipping');
      setStep('payment');
    } finally {
      setBusy(false);
    }
  }

  async function initializeCheckoutHandoff() {
    if (checkoutId) {
      return checkoutId;
    }

    setBusy(true);
    setErrorBanner(null);

    try {
      const checkoutCreate = await graphqlRequest<CheckoutCreateResponse>(CHECKOUT_CREATE_MUTATION, {
        input: {
          channel,
          email: form.email.trim(),
          lines: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        },
      });
      const createPayload = checkoutCreate.data?.checkoutCreateFull;
      const createMessage = getRequestMessage(
        checkoutCreate.errors,
        createPayload?.errors,
        'Failed to create checkout.'
      );

      if (getGraphqlErrorMessage(checkoutCreate.errors) || getPayloadMessage(createPayload?.errors) || !createPayload?.checkout) {
        setErrorBanner(createMessage);
        toast.error(createMessage);
        return null;
      }

      const nextCheckoutId = createPayload.checkout.id;
      setCheckoutId(nextCheckoutId);

      const shippingAddressResponse = await graphqlRequest<CheckoutShippingAddressResponse>(
        CHECKOUT_SHIPPING_ADDRESS_UPDATE,
        {
          input: {
            checkoutId: nextCheckoutId,
            shippingAddress: {
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              streetAddress1: form.streetAddress1.trim(),
              city: form.city.trim(),
              postalCode: form.postalCode.trim(),
              country: normalizeCountryCode(form.country),
              phone: form.phone.trim(),
            },
          },
        }
      );
      const shippingAddressPayload = shippingAddressResponse.data?.checkoutShippingAddressUpdate;
      const shippingAddressMessage = getRequestMessage(
        shippingAddressResponse.errors,
        shippingAddressPayload?.errors,
        'Failed to set the shipping address.'
      );

      if (getGraphqlErrorMessage(shippingAddressResponse.errors) || getPayloadMessage(shippingAddressPayload?.errors)) {
        setErrorBanner(shippingAddressMessage);
        toast.error(shippingAddressMessage);
        return null;
      }

      const legacyShippingMethodId = selectedDeliveryOption?.id;

      if (!legacyShippingMethodId) {
        const message = uiText.selectDeliveryFirst;
        setErrorBanner(message);
        toast.error(message);
        return null;
      }

      const shippingMethodResponse = await graphqlRequest<CheckoutShippingMethodResponse>(
        CHECKOUT_SHIPPING_METHOD_UPDATE,
        {
          input: {
            checkoutId: nextCheckoutId,
            shippingMethodId: legacyShippingMethodId,
          },
        }
      );
      const shippingMethodPayload = shippingMethodResponse.data?.checkoutShippingMethodUpdate;
      const shippingMethodMessage = getRequestMessage(
        shippingMethodResponse.errors,
        shippingMethodPayload?.errors,
        'Failed to set the shipping method.'
      );

      if (getGraphqlErrorMessage(shippingMethodResponse.errors) || getPayloadMessage(shippingMethodPayload?.errors)) {
        setErrorBanner(shippingMethodMessage);
        toast.error(shippingMethodMessage);
        return null;
      }

      setShippingCost(shippingMethodPayload?.checkout?.shippingPrice?.amount ?? shippingCost);
      setServerTotal(shippingMethodPayload?.checkout?.totalPrice?.gross?.amount ?? null);

      if (form.note.trim()) {
        const noteResponse = await graphqlRequest<CheckoutNoteUpdateResponse>(CHECKOUT_NOTE_UPDATE, {
          input: {
            checkoutId: nextCheckoutId,
            note: form.note.trim(),
          },
        });
        const notePayload = noteResponse.data?.checkoutNoteUpdate;
        const noteMessage = getRequestMessage(noteResponse.errors, notePayload?.errors, 'Failed to sync order note.');

        if (getGraphqlErrorMessage(noteResponse.errors) || getPayloadMessage(notePayload?.errors)) {
          setErrorBanner(noteMessage);
          toast.error(noteMessage);
          return null;
        }
      }

      await loadPaymentMethods(normalizeCountryCode(form.country));
      return nextCheckoutId;
    } finally {
      setBusy(false);
    }
  }

  async function handlePaymentSelection(method: PaymentMethod) {
    const legacyCheckoutId = await initializeCheckoutHandoff();

    if (!legacyCheckoutId) {
      return;
    }

    setBusy(true);
    setErrorBanner(null);

    try {
      const returnUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}?checkoutId=${encodeURIComponent(legacyCheckoutId)}&payment=returned`
          : '';
      const response = await graphqlRequest<PaymentCreateResponse>(CHECKOUT_PAYMENT_CREATE, {
        checkoutId: legacyCheckoutId,
        input: {
          gateway: method.code ?? method.id,
          returnUrl,
        },
      });
      const payload = response.data?.checkoutPaymentCreate;
      const message = getRequestMessage(response.errors, payload?.errors, 'Failed to initialize payment.');

      if (getGraphqlErrorMessage(response.errors) || getPayloadMessage(payload?.errors) || !payload?.payment) {
        setErrorBanner(message);
        toast.error(message);
        return;
      }

      setSelectedPaymentMethod(method);
      setPaymentSession({
        id: payload.payment.id,
        gateway: payload.payment.gateway,
        status: payload.payment.status,
        clientSecret: payload.payment.clientSecret,
        actionUrl: payload.payment.actionUrl,
      });
      markCompleted('payment');
      setStep('review');

      if (payload.payment.total?.amount != null) {
        setServerTotal(payload.payment.total.amount);
      }

      if (payload.payment.actionUrl && typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          'oms-pending-checkout',
          JSON.stringify({ checkoutId: legacyCheckoutId, email: form.email.trim() })
        );
        window.location.assign(payload.payment.actionUrl);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handlePromoApply() {
    if (!promoCode.trim()) {
      return;
    }

    setBusy(true);
    setErrorBanner(null);

    try {
      const success = await updateDiscountCodes([promoCode.trim()]);

      if (!success) {
        const message = useCartStore.getState().error ?? 'Failed to apply promo code.';
        setErrorBanner(message);
        toast.error(message);
        return;
      }

      toast.success(t('promoApplied'));
    } finally {
      setBusy(false);
    }
  }

  async function handlePromoRemove() {
    setBusy(true);
    setErrorBanner(null);

    try {
      const success = await updateDiscountCodes([]);

      if (!success) {
        const message = useCartStore.getState().error ?? 'Failed to remove promo code.';
        setErrorBanner(message);
        toast.error(message);
        return;
      }

      setPromoCode('');
    } finally {
      setBusy(false);
    }
  }

  async function handlePlaceOrder() {
    if (!checkoutId) {
      const message = 'Checkout is not ready yet.';
      setErrorBanner(message);
      toast.error(message);
      return;
    }

    setBusy(true);
    setErrorBanner(null);

    try {
      if (form.note.trim()) {
        await updateNote(form.note.trim());

        const noteResponse = await graphqlRequest<CheckoutNoteUpdateResponse>(CHECKOUT_NOTE_UPDATE, {
          input: {
            checkoutId,
            note: form.note.trim(),
          },
        });
        const notePayload = noteResponse.data?.checkoutNoteUpdate;
        const noteMessage = getRequestMessage(noteResponse.errors, notePayload?.errors, 'Failed to sync order note.');

        if (getGraphqlErrorMessage(noteResponse.errors) || getPayloadMessage(notePayload?.errors)) {
          setErrorBanner(noteMessage);
          toast.error(noteMessage);
          return;
        }
      }

      const response = await graphqlRequest<CheckoutCompleteResponse>(CHECKOUT_COMPLETE_MUTATION, {
        input: {
          checkoutId,
        },
      });
      const payload = response.data?.checkoutComplete;
      const message = getRequestMessage(response.errors, payload?.errors, 'Failed to complete checkout.');

      if (getGraphqlErrorMessage(response.errors) || getPayloadMessage(payload?.errors) || !payload?.order) {
        setErrorBanner(message);
        toast.error(message);
        return;
      }

      clearCart();
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
        window.sessionStorage.removeItem('oms-pending-checkout');
      }
      toast.success(t('orderSuccess'));
      router.push(`/checkout/confirmation?order=${encodeURIComponent(payload.order.number)}&email=${encodeURIComponent(form.email.trim())}`);
    } finally {
      setBusy(false);
    }
  }

  if (!isHydrated || !initialized || isCartLoading) {
    return (
      <div className="container-grocery py-16 text-center">
        <ShoppingCart className="mx-auto mb-4 h-16 w-16 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <h1 className="heading-display text-xl" style={{ color: 'var(--color-foreground)' }}>
          {tCommon('loading')}
        </h1>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-grocery py-16 text-center">
        <ShoppingCart className="mx-auto mb-4 h-16 w-16 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <h1 className="heading-display text-xl mb-2" style={{ color: 'var(--color-foreground)' }}>
          {tCart('empty')}
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-muted-foreground)' }}>
          {tCart('emptyDesc')}
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {t('continueShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-grocery py-8 pb-36 md:py-12 md:pb-12">
      <Link
        href="/cart"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-opacity duration-fast hover:opacity-80"
        style={{ color: 'var(--color-muted-foreground)' }}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {tCommon('back')}
      </Link>

      <h1 className="heading-display text-2xl md:text-3xl mb-4" style={{ color: 'var(--color-foreground)' }}>
        {t('title')}
      </h1>

      <CheckoutProgressBar currentStep={step} completedSteps={completedSteps} />

      {(errorBanner || cartError) && (
        <div
          className="mb-6 rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-destructive) 40%, var(--color-border))',
            backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
            color: 'var(--color-destructive)',
          }}
        >
          {errorBanner || cartError}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {/* ── Step 1: Delivery ── */}
          <CheckoutSection
            step="delivery"
            currentStep={step}
            completedSteps={completedSteps}
            onToggle={setStep}
            summaryContent={
              form.firstName
                ? `${form.firstName} ${form.lastName} · ${form.streetAddress1}, ${form.city}`
                : undefined
            }
          >
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  { key: 'firstName',      label: t('firstName'),   autoComplete: 'given-name',            type: 'text',  inputMode: 'text'    as const },
                  { key: 'lastName',       label: t('lastName'),    autoComplete: 'family-name',           type: 'text',  inputMode: 'text'    as const },
                  { key: 'email',          label: t('email'),       autoComplete: 'email',                 type: 'email', inputMode: 'email'   as const },
                  { key: 'phone',          label: t('phone'),       autoComplete: 'tel',                   type: 'tel',   inputMode: 'tel'     as const },
                  { key: 'streetAddress1', label: t('address'),     autoComplete: 'street-address',        type: 'text',  inputMode: 'text'    as const },
                  { key: 'city',           label: t('city'),        autoComplete: 'address-level2',        type: 'text',  inputMode: 'text'    as const },
                  { key: 'postalCode',     label: t('postalCode'),  autoComplete: 'postal-code',           type: 'text',  inputMode: 'text'    as const },
                  { key: 'country',        label: t('country'),     autoComplete: 'country',               type: 'text',  inputMode: 'text'    as const },
                ] as const).map(({ key, label, autoComplete, type, inputMode }) => {
                  const field = key as keyof DeliveryFormState;
                  const isWide = field === 'streetAddress1' || field === 'email';
                  return (
                    <div key={field} className={isWide ? 'sm:col-span-2' : undefined}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }} htmlFor={`checkout-${field}`}>
                        {label}
                      </label>
                      <input
                        id={`checkout-${field}`}
                        name={key}
                        type={type}
                        inputMode={inputMode}
                        autoComplete={autoComplete}
                        value={form[field]}
                        onChange={(event) => setFieldValue(field, event.target.value)}
                        aria-invalid={Boolean(fieldErrors[field])}
                        className={INPUT_CLASS}
                        style={{
                          borderColor: fieldErrors[field] ? 'var(--color-destructive)' : 'var(--color-border)',
                          color: 'var(--color-foreground)',
                        }}
                      />
                      {fieldErrors[field] && (
                        <p className="text-xs mt-1" style={{ color: 'var(--color-destructive)' }} role="alert">
                          {fieldErrors[field]}
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }} htmlFor="checkout-note">
                    {t('note')}
                  </label>
                  <textarea
                    id="checkout-note"
                    rows={3}
                    value={form.note}
                    onChange={(event) => setFieldValue('note', event.target.value)}
                    className={`${INPUT_CLASS} resize-none`}
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                    placeholder={t('notePlaceholder')}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleDeliveryContinue()}
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all duration-fast disabled:opacity-60 sm:w-auto"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {t('nextStep')}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
          </CheckoutSection>

          {/* ── Step 2: Shipping ── */}
          <CheckoutSection
            step="shipping"
            currentStep={step}
            completedSteps={completedSteps}
            onToggle={setStep}
            summaryContent={
              selectedDeliveryOption
                ? `${translateDeliveryOptionName(locale, selectedDeliveryOption)} · ${
                    selectedDeliveryOption.price.amount === 0
                      ? t('freeShipping')
                      : formatPrice(selectedDeliveryOption.price.amount, selectedDeliveryOption.price.currency)
                  }`
                : undefined
            }
          >
              <p className="text-sm mb-5" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('selectShipping')}
              </p>

              <div className="space-y-3">
                {deliveryOptions.map((option) => {
                  const selected = selectedDeliveryOption?.id === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => void handleDeliverySelection(option)}
                      disabled={busy}
                      className="w-full rounded-2xl border p-4 text-left transition-colors duration-fast disabled:opacity-60"
                      style={{
                        borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                        backgroundColor: selected ? 'color-mix(in srgb, var(--color-primary) 7%, transparent)' : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 shrink-0" style={{ color: selected ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }} aria-hidden="true" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                            {translateDeliveryOptionName(locale, option)}
                          </p>
                        </div>
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                          {option.price.amount === 0 ? t('freeShipping') : formatPrice(option.price.amount, option.price.currency)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
          </CheckoutSection>

          {/* ── Step 3: Payment ── */}
          <CheckoutSection
            step="payment"
            currentStep={step}
            completedSteps={completedSteps}
            onToggle={setStep}
            summaryContent={
              selectedPaymentMethod
                ? translatePaymentMethodName(locale, selectedPaymentMethod)
                : undefined
            }
          >
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  {t('selectPayment')}
                </p>
                <button
                  type="button"
                  onClick={() => void initializeCheckoutHandoff()}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium disabled:opacity-60"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {uiText.retryHandoff}
                </button>
              </div>

              {paymentMethods.length === 0 ? (
                <div className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                  {uiText.noPaymentMethods}
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => {
                    const selected = selectedPaymentMethod?.id === method.id;
                    const Icon = getPaymentIcon(method);

                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => void handlePaymentSelection(method)}
                        disabled={busy}
                        className="w-full rounded-2xl border p-4 text-left transition-colors duration-fast disabled:opacity-60"
                        style={{
                          borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                          backgroundColor: selected ? 'color-mix(in srgb, var(--color-primary) 7%, transparent)' : 'transparent',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 shrink-0" style={{ color: selected ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }} aria-hidden="true" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                              {translatePaymentMethodName(locale, method)}
                            </p>
                            {method.code && (
                              <p className="text-xs mt-1 uppercase tracking-[0.16em]" style={{ color: 'var(--color-muted-foreground)' }}>
                                {method.code}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
          </CheckoutSection>

          {/* ── Step 4: Review & Place Order ── */}
          <CheckoutSection
            step="review"
            currentStep={step}
            completedSteps={completedSteps}
            onToggle={setStep}
          >
              <div className="grid gap-5 md:grid-cols-2 mb-5">
                  <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('delivery')}
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                      {form.firstName} {form.lastName}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                      {form.streetAddress1}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                      {form.postalCode} {form.city}, {form.country.toUpperCase()}
                    </p>
                    <p className="text-sm mt-2" style={{ color: 'var(--color-muted-foreground)' }}>
                      {form.email}
                    </p>
                  </div>

                  <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('shippingTitle')}
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                      {selectedDeliveryOption ? translateDeliveryOptionName(locale, selectedDeliveryOption) : uiText.notSelected}
                    </p>
                    {selectedDeliveryOption && (
                      <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                        {selectedDeliveryOption.price.amount === 0
                          ? t('freeShipping')
                          : formatPrice(selectedDeliveryOption.price.amount, selectedDeliveryOption.price.currency)}
                      </p>
                    )}
                    <p className="text-xs mt-4 uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('paymentTitle')}
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                      {selectedPaymentMethod ? translatePaymentMethodName(locale, selectedPaymentMethod) : uiText.paymentNotInitialized}
                    </p>
                    {paymentSession?.status && (
                      <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                        Status: {paymentSession.status}
                      </p>
                    )}
                  </div>
              </div>

              <div className="mb-5">
                  <label htmlFor="review-note" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                    {t('note')}
                  </label>
                  <textarea
                    id="review-note"
                    rows={3}
                    value={form.note}
                    onChange={(event) => setFieldValue('note', event.target.value)}
                    className={`${INPUT_CLASS} resize-none`}
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                    placeholder={t('notePlaceholder')}
                  />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handlePlaceOrder()}
                  disabled={busy || !checkoutId}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all duration-fast disabled:opacity-60 sm:w-auto"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-5 w-5" aria-hidden="true" />}
                  {busy ? t('processing') : t('placeOrder')}
                </button>
              </div>
          </CheckoutSection>
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-20 rounded-2xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
            <h2 className="heading-section text-lg mb-4" style={{ color: 'var(--color-foreground)' }}>
              {t('summary')}
            </h2>
            {summaryContent}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        {mobileSummaryOpen && (
          <div className="container-grocery mb-3">
            <div
              className="rounded-2xl border p-4 shadow-2xl"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'color-mix(in srgb, var(--color-card) 98%, transparent)',
              }}
              data-testid="mobile-checkout-summary-panel"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="heading-section text-base" style={{ color: 'var(--color-foreground)' }}>
                  {t('summary')}
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileSummaryOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium hover-surface"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  {tCommon('close')}
                </button>
              </div>
              {summaryContent}
            </div>
          </div>
        )}

        <div
          className="border-t backdrop-blur"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'color-mix(in srgb, var(--color-card) 96%, transparent)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
          }}
          data-testid="mobile-checkout-summary-bar"
        >
          <div className="container-grocery flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('summary')}
              </p>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                {formatPrice(displayTotal, displayCurrency)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMobileSummaryOpen((current) => !current)}
              className="inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold hover-surface"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              aria-expanded={mobileSummaryOpen}
            >
              {mobileSummaryOpen ? tCommon('close') : t('summary')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

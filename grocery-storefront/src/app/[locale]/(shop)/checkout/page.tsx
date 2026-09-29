'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Banknote,
  Building2,
  ChevronDown,
  CreditCard,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Truck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/navigation';
import {
  AVAILABLE_PAYMENT_METHODS_QUERY,
  CHECKOUT_COMPLETE_MUTATION,
  UPDATE_PROFILE_MUTATION,
  CHECKOUT_CREATE_MUTATION,
  CHECKOUT_NOTE_UPDATE,
  CHECKOUT_PAYMENT_CREATE,
  CHECKOUT_PROMO_CODE_ADD,
  CHECKOUT_PROMO_CODE_REMOVE,
  CHECKOUT_SHIPPING_ADDRESS_UPDATE,
  CHECKOUT_SHIPPING_METHOD_UPDATE,
  CUSTOMER_ADDRESSES_QUERY,
} from '@/lib/graphql/operations/grocery';
import { getGraphqlErrorMessage, graphqlRequest } from '@/lib/graphql/request';
import { formatPrice } from '@/lib/utils';
import { useChannel } from '@/hooks/use-channel';
import { useHydrated } from '@/hooks/use-hydrated';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useStorefrontConfig } from '@/components/ConfigProvider';
import { getPublicLegalIdentity } from '@/lib/storefront-config-shared';
import {
  getConfiguredText,
  getFulfillmentConfig,
  isPickupFulfillment,
  usesBankTransferPromise,
} from '@/lib/fulfillment';
import type { CartDeliveryOption, CustomerAddress } from '@/types';
import type { PaymentMethod } from '@/types/checkout';
import { saveLastOrder } from '@/lib/last-order';

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
    id: string;
    name: string;
    description: string | null;
    provider: string | null;
    isActive: boolean | null;
    fee: {
      amount: number;
      currency: string;
    } | null;
  }> | null;
}

interface CustomerAddressesResponse {
  customerAddresses: CustomerAddress[] | null;
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

interface CheckoutPromoCodeResponse {
  checkout: {
    id: string;
  } | null;
  errors: CheckoutMutationError[] | null;
}

interface CheckoutPromoCodeAddResponse {
  checkoutPromoCodeAdd: CheckoutPromoCodeResponse | null;
}

interface CheckoutPromoCodeRemoveResponse {
  checkoutPromoCodeRemove: CheckoutPromoCodeResponse | null;
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
  // Someone other than the buyer collects the order ("Odbiera inna osoba").
  recipientFirstName: string;
  recipientLastName: string;
  recipientPhone: string;
}

type FieldErrors = Partial<Record<keyof DeliveryFormState, string>>;

interface CheckoutDraftState {
  form: DeliveryFormState;
  pickupByOther?: boolean;
  checkoutId: string | null;
  checkoutKey: string | null;
  promoCode: string;
  appliedPromoCode: string | null;
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
const CHECKOUT_DRAFT_KEY = 'oms-checkout-draft-v2';
const DELIVERY_FIELD_ORDER: Array<keyof DeliveryFormState> = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'recipientFirstName',
  'recipientLastName',
  'recipientPhone',
  'streetAddress1',
  'city',
  'postalCode',
];

function getPayloadMessage(errors?: CheckoutMutationError[] | null): string | null {
  return errors?.find((error) => error.message?.trim())?.message ?? null;
}

function getRequestMessage(
  topLevelErrors: Parameters<typeof getGraphqlErrorMessage>[0],
  payloadErrors?: CheckoutMutationError[] | null,
  fallback = 'Request failed.'
) {
  return getGraphqlErrorMessage(topLevelErrors) ?? getPayloadMessage(payloadErrors) ?? fallback;
}

function getInsufficientStockError(errors?: CheckoutMutationError[] | null): CheckoutMutationError | null {
  return errors?.find((error) => error.code === 'INSUFFICIENT_STOCK') ?? null;
}

function getPaymentIcon(method: PaymentMethod) {
  const source = `${method.id} ${method.provider ?? ''} ${method.name}`.toLowerCase();

  if (source.includes('cash') || source.includes('cod')) return Banknote;
  if (source.includes('bank') || source.includes('p24') || source.includes('tpay')) return Building2;

  return PAYMENT_ICONS[method.id.toLowerCase()] ?? CreditCard;
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
    recipientFirstName: '',
    recipientLastName: '',
    recipientPhone: '',
  };
}

// Guest contact details kept on this device for the next order (opt-out checkbox).
const REMEMBERED_CONTACT_KEY = 'adg-checkout-contact';

type RememberedContact = Pick<DeliveryFormState, 'firstName' | 'lastName' | 'email' | 'phone'>;

function readRememberedContact(): RememberedContact | null {
  try {
    const raw = window.localStorage.getItem(REMEMBERED_CONTACT_KEY);
    return raw ? (JSON.parse(raw) as RememberedContact) : null;
  } catch {
    return null;
  }
}

function writeRememberedContact(contact: RememberedContact | null) {
  try {
    if (contact) {
      window.localStorage.setItem(REMEMBERED_CONTACT_KEY, JSON.stringify(contact));
    } else {
      window.localStorage.removeItem(REMEMBERED_CONTACT_KEY);
    }
  } catch {
    // Convenience only.
  }
}

function splitFullName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
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
  const code = `${method.id} ${method.provider ?? ''} ${method.name}`.toLowerCase();

  if (code.includes('blik')) return 'BLIK';
  if (code.includes('p24') || code.includes('przelewy24')) return 'Przelewy24';
  if (code.includes('bank_transfer') || code.includes('bank transfer')) return locale === 'pl' ? 'Przelew bankowy' : 'Bank Transfer';
  if (code.includes('cod') || code.includes('cash')) return locale === 'pl' ? 'Płatność przy odbiorze' : 'Cash on Delivery';
  if (code.includes('card') || code.includes('stripe')) return locale === 'pl' ? 'Karta płatnicza' : 'Credit/Debit Card';

  return method.name;
}

function translatePaymentMethodDescription(locale: string, method: PaymentMethod): string | null {
  const code = `${method.id} ${method.provider ?? ''} ${method.name}`.toLowerCase();

  if (code.includes('cod') || code.includes('cash')) {
    return locale === 'pl'
      ? 'Zapłać w sklepie podczas odbioru zamówienia.'
      : 'Pay in store when collecting your order.';
  }

  if (code.includes('p24') || code.includes('przelewy24')) {
    return locale === 'pl'
      ? 'BLIK lub szybki przelew online, od razu po złożeniu zamówienia.'
      : 'BLIK or fast online bank transfer, right after placing the order.';
  }

  return method.description?.trim() || method.provider?.trim() || null;
}

// Przelewy24 is the only gateway that completes the order first and only then
// registers the payment (order → payment → redirect); legacy gateways keep the
// pre-order payment session.
function isP24Method(method: PaymentMethod | null): boolean {
  if (!method) return false;
  const code = `${method.id} ${method.provider ?? ''}`.toLowerCase();
  return code.includes('p24') || code.includes('przelewy24');
}

// Paid in cash (or card at the till) when the order is collected.
function isPayOnCollectionMethod(method: PaymentMethod | null): boolean {
  if (!method) return false;
  const code = `${method.id} ${method.provider ?? ''}`.toLowerCase();
  return code.includes('cash') || code.includes('cod');
}

const P24_PENDING_KEY = 'adg-p24-pending';

function focusDeliveryField(field: keyof DeliveryFormState) {
  focusElement(`checkout-${field}`);
}

function focusElement(id: string) {
  if (typeof window === 'undefined') return;

  window.requestAnimationFrame(() => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ block: 'center' });
    element?.focus({ preventScroll: true });
  });
}

// One numbered block of the one-page checkout (contact → pickup → payment → confirm).
function CheckoutBlock({
  index,
  title,
  testId,
  children,
}: {
  index: number;
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${testId}-title`}
      data-testid={testId}
      className="min-w-0 rounded-2xl border p-4 md:p-6"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      <h2
        id={`${testId}-title`}
        className="heading-section mb-4 flex items-center gap-2.5 text-base md:text-lg"
        style={{ color: 'var(--color-foreground)' }}
      >
        <span
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
          aria-hidden="true"
        >
          {index}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function CheckoutPage() {
  const locale = useLocale();
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
  const tFulfillment = useTranslations('fulfillment');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHydrated = useHydrated();
  const channel = useChannel();
  const siteConfig = useStorefrontConfig();
  const fulfillment = getFulfillmentConfig(siteConfig);
  const pickupMode = isPickupFulfillment(siteConfig);
  const bankTransferMode = usesBankTransferPromise(siteConfig);
  // Consumer law requires the seller's identity before a contract is concluded.
  const sellerIdentityMissing = getPublicLegalIdentity(siteConfig) === null;
  const pickupAddress = fulfillment.pickupAddress;
  const checkoutPickupNotice = getConfiguredText(fulfillment.pickupInstructions, tFulfillment('checkoutPickupNotice'));
  const checkoutBankTransferNotice = getConfiguredText(fulfillment.bankTransferInstructions, tFulfillment('checkoutBankTransferNotice'));

  const items = useCartStore((state) => state.items);
  const cost = useCartStore((state) => state.cost);
  const buyerIdentity = useCartStore((state) => state.buyerIdentity);
  const note = useCartStore((state) => state.note);
  const deliveryOptions = useCartStore((state) => state.deliveryOptions);
  const selectedDeliveryOption = useCartStore((state) => state.selectedDeliveryOption);
  const initialized = useCartStore((state) => state.initialized);
  const isCartLoading = useCartStore((state) => state.isLoading);
  const cartError = useCartStore((state) => state.error);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const updateBuyerIdentity = useCartStore((state) => state.updateBuyerIdentity);
  const updateNote = useCartStore((state) => state.updateNote);
  const fetchDeliveryOptions = useCartStore((state) => state.fetchDeliveryOptions);
  const selectDeliveryOption = useCartStore((state) => state.selectDeliveryOption);
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const clearCart = useCartStore((state) => state.clearCart);

  const sessionEmail = buyerIdentity?.email ?? '';
  const [form, setForm] = useState<DeliveryFormState>(() => createInitialFormState(sessionEmail));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(searchParams.get('checkoutId'));
  // E-mail + basket the backend checkout was created from; any change needs a new checkout.
  const [checkoutKey, setCheckoutKey] = useState<string | null>(null);
  const [deliveryOptionsRequested, setDeliveryOptionsRequested] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsLoaded, setPaymentMethodsLoaded] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [shippingCost, setShippingCost] = useState<number>(selectedDeliveryOption?.price.amount ?? 0);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  // Set once a P24 order exists but its payment session could not be started;
  // lets the shopper retry against the same unpaid order instead of re-ordering.
  const [pendingP24Order, setPendingP24Order] = useState<{ id: string; number: string } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [pickupByOther, setPickupByOther] = useState(false);
  const [rememberContact, setRememberContact] = useState(true);
  // Signed-in shoppers with a complete profile see a summary card instead of inputs.
  const [editingContact, setEditingContact] = useState(true);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const authSession = useAuthStore((s) => s.session);
  const isAuthenticated = authSession.status === 'authenticated';
  const authEmail = authSession.user?.email ?? '';
  const authFullName = authSession.user?.fullName ?? '';
  const authPhone = authSession.user?.phone ?? '';
  const uiText = useMemo(
    () => ({
      paymentReturned:
        locale === 'pl'
          ? 'Płatność wróciła do checkoutu. Sprawdź zamówienie i dokończ je, jeśli bramka zakończyła się sukcesem.'
          : 'Payment returned to checkout. Review the order and finish if the gateway succeeded.',
      noDeliveryOptions:
        pickupMode
          ? locale === 'pl'
            ? 'Odbiór osobisty nie jest jeszcze dostępny dla tego sklepu. Sklep musi dokończyć konfigurację odbioru przed przyjęciem zamówień.'
            : 'Pickup is not available for this store yet. The store must finish pickup setup before accepting orders.'
          : locale === 'pl'
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
      retryHandoff: locale === 'pl' ? 'Odśwież metody płatności' : 'Refresh payment methods',
      noPaymentMethods:
        locale === 'pl'
          ? 'Metody płatności nie są jeszcze dostępne dla tego sklepu. Sklep musi dokończyć konfigurację płatności przed przyjęciem zamówień.'
          : 'Payment methods are not available for this store yet. The store must finish payment setup before accepting orders.',
      loadingPaymentMethods: locale === 'pl' ? 'Ładowanie metod płatności…' : 'Loading payment methods…',
      calculatedNext: locale === 'pl' ? 'Wyliczymy dalej' : 'Calculated next',
      discountLabel: locale === 'pl' ? 'Rabat' : 'Discount',
      insufficientStock:
        locale === 'pl'
          ? 'Nie ma wystarczającego stanu magazynowego, aby złożyć to zamówienie. Sprawdź koszyk i zmień ilości przed ponowną próbą.'
          : 'Not enough stock to complete this order. Review your cart and adjust quantities before trying again.',
      failedSavedAddresses:
        locale === 'pl'
          ? 'Nie udało się załadować zapisanych adresów.'
          : 'Failed to load saved addresses.',
      pickupAddressMissing:
        locale === 'pl'
          ? 'Sklep musi uzupełnić adres odbioru przed przyjęciem zamówień.'
          : 'The store must configure its pickup address before accepting orders.',
    }),
    [locale, pickupMode]
  );

  const loadPaymentMethods = useCallback(async () => {
    const response = await graphqlRequest<PaymentMethodsResponse>(AVAILABLE_PAYMENT_METHODS_QUERY, {
      channel,
    });
    const paymentMethodsMessage = getGraphqlErrorMessage(response.errors);

    if (paymentMethodsMessage) {
      setErrorBanner(paymentMethodsMessage);
      toast.error(paymentMethodsMessage);
      return false;
    }

    const mappedMethods: PaymentMethod[] = (response.data?.availablePaymentMethods ?? [])
      .filter((method) => method.isActive !== false)
      .map((method) => ({
        id: method.id,
        name: method.name,
        description: method.description,
        provider: method.provider,
        isActive: method.isActive,
        fee: method.fee,
      }));

    setPaymentMethods(mappedMethods);
    setPaymentMethodsLoaded(true);
    return true;
  }, [channel]);

  /* ── Fetch saved addresses for authenticated users ── */
  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;

    let cancelled = false;

    async function loadSavedAddresses() {
      try {
        const response = await graphqlRequest<CustomerAddressesResponse>(CUSTOMER_ADDRESSES_QUERY);
        const message = getGraphqlErrorMessage(response.errors);

        if (message) {
          if (!cancelled) {
            setErrorBanner(uiText.failedSavedAddresses);
            toast.error(uiText.failedSavedAddresses);
          }
          return;
        }

        if (!cancelled) {
          setSavedAddresses(response.data?.customerAddresses ?? []);
        }
      } catch {
        if (!cancelled) {
          setErrorBanner(uiText.failedSavedAddresses);
          toast.error(uiText.failedSavedAddresses);
        }
      }
    }

    void loadSavedAddresses();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, isAuthenticated, uiText.failedSavedAddresses]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      email: current.email || (isAuthenticated ? authEmail : '') || sessionEmail,
      phone: current.phone || buyerIdentity?.phone || '',
      country: current.country || buyerIdentity?.countryCode || 'PL',
      note: current.note || note || '',
    }));
  }, [buyerIdentity?.countryCode, buyerIdentity?.phone, note, sessionEmail, isAuthenticated, authEmail]);

  // Signed in: name and phone come from the profile; a complete profile collapses to a card.
  const profilePrefilled = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || profilePrefilled.current) return;
    profilePrefilled.current = true;
    const profileName = splitFullName(authFullName);
    setForm((current) => ({
      ...current,
      firstName: current.firstName || profileName.firstName,
      lastName: current.lastName || profileName.lastName,
      phone: current.phone || authPhone,
    }));
    setEditingContact(!(profileName.firstName && profileName.lastName && authPhone.trim()));
  }, [authFullName, authPhone, isAuthenticated]);

  // Guest: fill empty fields from the details remembered on this device.
  const rememberedApplied = useRef(false);
  useEffect(() => {
    if (!isHydrated || authSession.status !== 'guest' || rememberedApplied.current) return;
    rememberedApplied.current = true;
    const remembered = readRememberedContact();
    if (!remembered) return;
    setForm((current) => ({
      ...current,
      firstName: current.firstName || remembered.firstName || '',
      lastName: current.lastName || remembered.lastName || '',
      email: current.email || remembered.email || '',
      phone: current.phone || remembered.phone || '',
    }));
  }, [authSession.status, isHydrated]);

  useEffect(() => {
    if (!selectedDeliveryOption) {
      setShippingCost(0);
      return;
    }

    setShippingCost(selectedDeliveryOption.price.amount);
  }, [selectedDeliveryOption]);

  // One page: delivery options and payment methods load up front, and a single
  // delivery option (ADG: store pickup) is picked for the shopper.
  const deliveryRequested = useRef(false);
  useEffect(() => {
    if (!isHydrated || !initialized || items.length === 0 || deliveryRequested.current) {
      return;
    }
    deliveryRequested.current = true;

    void (async () => {
      const options = await fetchDeliveryOptions();
      setDeliveryOptionsRequested(true);

      if (options.length === 0) {
        setDeliveryError(uiText.noDeliveryOptions);
        return;
      }

      if (options.length === 1 && useCartStore.getState().selectedDeliveryOption?.id !== options[0].id) {
        await selectDeliveryOption(options[0]);
      }
    })();
  }, [fetchDeliveryOptions, initialized, isHydrated, items.length, selectDeliveryOption, uiText.noDeliveryOptions]);

  const paymentMethodsRequested = useRef(false);
  useEffect(() => {
    if (!isHydrated || paymentMethodsRequested.current) {
      return;
    }
    paymentMethodsRequested.current = true;
    void loadPaymentMethods();
  }, [isHydrated, loadPaymentMethods]);

  useEffect(() => {
    if (paymentMethods.length === 1) {
      setSelectedPaymentMethod((current) => current ?? paymentMethods[0]);
    }
  }, [paymentMethods]);

  // Legacy redirect gateways come back with ?checkoutId=…&payment=returned.
  const gatewayReturned = searchParams.get('payment') === 'returned';
  useEffect(() => {
    const returnedCheckoutId = searchParams.get('checkoutId');

    if (!returnedCheckoutId) {
      return;
    }

    setCheckoutId((current) => current ?? returnedCheckoutId);

    if (searchParams.get('payment')) {
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
      // Only filled draft values win: the profile/remembered prefill may run in the same commit.
      setForm((current) => {
        const next = { ...createInitialFormState(), ...current };
        for (const [key, value] of Object.entries(draft.form ?? {})) {
          if (typeof value === 'string' && value.trim() && key in next) {
            next[key as keyof DeliveryFormState] = value;
          }
        }
        return next;
      });
      setPickupByOther(Boolean(draft.pickupByOther));
      setCheckoutId((current) => current ?? draft.checkoutId);
      setCheckoutKey(draft.checkoutKey ?? null);
      setPromoCode(draft.promoCode);
      setAppliedPromoCode(draft.appliedPromoCode ?? null);
    } catch {
      window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    }
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const draft: CheckoutDraftState = {
      form,
      pickupByOther,
      checkoutId,
      checkoutKey,
      promoCode,
      appliedPromoCode,
    };

    window.sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  }, [appliedPromoCode, checkoutKey, checkoutId, form, isHydrated, pickupByOther, promoCode]);

  const displaySubtotal = getSubtotal();
  const displayCurrency =
    cost.totalAmount?.currency
    || cost.subtotalAmount?.currency
    || items[0]?.currency
    || 'PLN';
  const cartTotalAmount = cost.totalAmount?.amount;
  const discountedTotal = typeof cartTotalAmount === 'number' && (cartTotalAmount > 0 || displaySubtotal <= 0)
    ? cartTotalAmount
    : displaySubtotal;
  const displayTotal = serverTotal ?? discountedTotal + shippingCost;
  const orderSummary = (
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
        {appliedPromoCode && (
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-muted-foreground)' }}>{uiText.discountLabel}</span>
            <span className="font-medium" style={{ color: 'var(--color-fresh)' }}>
              {appliedPromoCode}
            </span>
          </div>
        )}
        <div className="flex justify-between pt-2 font-bold">
          <span style={{ color: 'var(--color-foreground)' }}>{tCart('total')}</span>
          <span className="text-lg tabular-nums" style={{ color: 'var(--color-foreground)' }}>
            {formatPrice(displayTotal, displayCurrency)}
          </span>
        </div>
      </div>

    </>
  );

  const trustRows = (
    <>
      <div className="border-t pt-4 mt-5 space-y-2.5" style={{ borderColor: 'var(--color-border)' }}>
        {[
          ...(pickupMode
            ? [
                { icon: MapPin, label: t('trustPickup') },
                { icon: ShieldCheck, label: t('trustManualConfirmation') },
                { icon: RefreshCw, label: t('trustContact') },
              ]
            : [
                { icon: ShieldCheck, label: t('trustSecure') },
                { icon: Truck, label: t('trustFast') },
                { icon: RefreshCw, label: t('trustReturns') },
              ]),
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </>
  );

  const promoSection = (
    <>
      <div data-testid="checkout-promo">
        {appliedPromoCode ? (
          <div className="flex items-center gap-2 rounded-xl border px-3 py-3 text-sm" style={{ borderColor: 'var(--color-border)' }}>
            <Tag className="h-4 w-4 shrink-0" style={{ color: 'var(--color-fresh)' }} aria-hidden="true" />
            <span className="flex-1 font-medium" style={{ color: 'var(--color-foreground)' }}>
              {appliedPromoCode}
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
        ) : !promoOpen ? (
          <button
            type="button"
            onClick={() => setPromoOpen(true)}
            className="text-sm font-medium underline underline-offset-4"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('havePromo')}
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              placeholder={t('promoPlaceholder')}
              aria-label={t('promoPlaceholder')}
              autoFocus
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

    </>
  );

  function renderCheckoutNotice(message: string) {
    return (
      <div
        className="mb-4 rounded-lg border px-4 py-3 text-sm"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-card))',
          color: 'var(--color-foreground)',
        }}
      >
        {message}
      </div>
    );
  }

  function setFieldValue<K extends keyof DeliveryFormState>(key: K, value: DeliveryFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validateDeliveryStep(formOverride?: DeliveryFormState) {
    const f = formOverride ?? form;
    const errors: FieldErrors = {};

    if (!f.firstName.trim()) errors.firstName = t('required');
    if (!f.lastName.trim()) errors.lastName = t('required');

    /* Authenticated users don't need to type their email — we already have it */
    const effectiveEmail = isAuthenticated ? authEmail : f.email.trim();
    if (!effectiveEmail) {
      errors.email = t('required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail)) {
      errors.email = t('invalidEmail');
    }

    // Required: the store calls if something in the order is missing.
    if (!f.phone.trim()) errors.phone = t('required');

    if (pickupMode && pickupByOther) {
      if (!f.recipientFirstName.trim()) errors.recipientFirstName = t('required');
      if (!f.recipientLastName.trim()) errors.recipientLastName = t('required');
      if (!f.recipientPhone.trim()) errors.recipientPhone = t('required');
    }

    if (!pickupMode) {
      if (!f.streetAddress1.trim()) errors.streetAddress1 = t('required');
      if (!f.city.trim()) errors.city = t('required');
      if (!f.postalCode.trim()) errors.postalCode = t('required');
    }

    const firstErrorField = DELIVERY_FIELD_ORDER.find((field) => Boolean(errors[field]));

    setFieldErrors(errors);
    if (firstErrorField) {
      if (errors.firstName || errors.lastName || errors.email || errors.phone) {
        setEditingContact(true);
      }
      focusDeliveryField(firstErrorField);
    }

    return !firstErrorField;
  }

  /** Fill the form from a saved address */
  function handleSavedAddressSelect(addr: CustomerAddress) {
    const parts = (addr.fullName ?? '').trim().split(/\s+/);
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] ?? '';

    setForm((current) => ({
      ...current,
      firstName,
      lastName,
      email: isAuthenticated ? authEmail : current.email,
      phone: addr.phone,
      streetAddress1: addr.street,
      city: addr.city,
      postalCode: addr.postalCode,
      country: addr.country,
    }));
    setFieldErrors({});
  }

  async function handleDeliverySelection(option: CartDeliveryOption) {
    setBusy(true);
    setErrorBanner(null);

    try {
      const success = await selectDeliveryOption(option);

      if (!success) {
        const message = useCartStore.getState().error ?? uiText.failedDeliverySelection;
        setDeliveryError(message);
        toast.error(message);
        return;
      }

      setDeliveryError(null);
    } finally {
      setBusy(false);
    }
  }

  async function retryDeliveryOptions() {
    setBusy(true);
    setDeliveryError(null);

    try {
      const options = await fetchDeliveryOptions();

      if (options.length === 0) {
        setDeliveryError(uiText.noDeliveryOptions);
      } else if (options.length === 1) {
        await selectDeliveryOption(options[0]);
      }
    } finally {
      setBusy(false);
    }
  }

  // Signed-in shoppers keep the phone they ordered with on their profile, so the
  // next checkout (pickup or delivery) is prefilled. Best effort: the order is placed.
  async function saveProfilePhone(phone: string) {
    try {
      const response = await graphqlRequest<{
        updateProfile: { success: boolean; customer: { phone?: string | null } | null } | null;
      }>(UPDATE_PROFILE_MUTATION, { input: { phone } });
      if (!response.data?.updateProfile?.success) return;
      useAuthStore.setState((state) => ({
        session: state.session.user
          ? { ...state.session, user: { ...state.session.user, phone: response.data?.updateProfile?.customer?.phone ?? phone } }
          : state.session,
      }));
    } catch {
      // The phone is on the order either way.
    }
  }

  // With another collector the pickup name/phone are theirs; the buyer goes into the note
  // so the store still knows who ordered.
  function buildOrderNote(): string {
    const buyerLine = pickupMode && pickupByOther
      ? `${t('orderedBy')}: ${form.firstName.trim()} ${form.lastName.trim()}, ${form.phone.trim()}`
      : '';
    return [buyerLine, form.note.trim()].filter(Boolean).join('\n');
  }

  // Creates the backend checkout (again when the e-mail or the basket changed since
  // the last one) and pushes the current address, delivery method and note into it.
  // Returns the checkout id and the server total, or null after showing the error.
  async function initializeCheckoutHandoff(): Promise<{ id: string; total: number | null } | null> {
    const legacyShippingMethodId = selectedDeliveryOption?.id;

    if (!legacyShippingMethodId) {
      const message = uiText.selectDeliveryFirst;
      setDeliveryError(message);
      toast.error(message);
      return null;
    }

    const email = isAuthenticated ? authEmail : form.email.trim();
    const nextCheckoutKey = JSON.stringify([
      email,
      items.map((item) => [item.variantId, item.quantity]),
    ]);
    let nextCheckoutId = checkoutId && checkoutKey === nextCheckoutKey ? checkoutId : null;

    if (!nextCheckoutId) {
      const checkoutCreate = await graphqlRequest<CheckoutCreateResponse>(CHECKOUT_CREATE_MUTATION, {
        input: {
          channel,
          email,
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

      nextCheckoutId = createPayload.checkout.id;
      setCheckoutId(nextCheckoutId);
      setCheckoutKey(nextCheckoutKey);

      // A promo code belongs to the old checkout; carry it over or drop it visibly.
      if (appliedPromoCode) {
        const promoResponse = await graphqlRequest<CheckoutPromoCodeAddResponse>(CHECKOUT_PROMO_CODE_ADD, {
          checkoutId: nextCheckoutId,
          promoCode: appliedPromoCode,
        });
        const promoPayload = promoResponse.data?.checkoutPromoCodeAdd;

        if (getGraphqlErrorMessage(promoResponse.errors) || getPayloadMessage(promoPayload?.errors) || !promoPayload?.checkout) {
          const message = getRequestMessage(promoResponse.errors, promoPayload?.errors, 'Failed to apply promo code.');
          setAppliedPromoCode(null);
          setErrorBanner(message);
          toast.error(message);
          return null;
        }
      }
    }

    const collectedByOther = pickupMode && pickupByOther;
    const effectiveAddress = pickupMode && pickupAddress
      ? pickupAddress
      : {
          streetAddress1: form.streetAddress1,
          city: form.city,
          postalCode: form.postalCode,
          country: form.country,
        };
    const shippingAddressResponse = await graphqlRequest<CheckoutShippingAddressResponse>(
      CHECKOUT_SHIPPING_ADDRESS_UPDATE,
      {
        input: {
          checkoutId: nextCheckoutId,
          shippingAddress: {
            firstName: (collectedByOther ? form.recipientFirstName : form.firstName).trim(),
            lastName: (collectedByOther ? form.recipientLastName : form.lastName).trim(),
            streetAddress1: effectiveAddress.streetAddress1.trim(),
            city: effectiveAddress.city.trim(),
            postalCode: effectiveAddress.postalCode.trim(),
            country: normalizeCountryCode(effectiveAddress.country),
            phone: (collectedByOther ? form.recipientPhone : form.phone).trim(),
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

    const total = shippingMethodPayload?.checkout?.totalPrice?.gross?.amount ?? null;
    setShippingCost(shippingMethodPayload?.checkout?.shippingPrice?.amount ?? shippingCost);
    setServerTotal(total);

    const orderNote = buildOrderNote();
    if (orderNote) {
      const noteResponse = await graphqlRequest<CheckoutNoteUpdateResponse>(CHECKOUT_NOTE_UPDATE, {
        input: {
          checkoutId: nextCheckoutId,
          note: orderNote,
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

    return { id: nextCheckoutId, total };
  }

  // Choosing a method is local; the payment is registered when the order is placed.
  function handlePaymentSelection(method: PaymentMethod) {
    if (pendingP24Order && !isP24Method(method)) {
      // The checkout is already completed as a P24 order; only that payment can proceed.
      toast.error(t('paymentPendingLocked'));
      return;
    }

    setSelectedPaymentMethod(method);
    setPaymentError(null);
  }

  // Non-P24 gateways get their payment before the order is completed. Returns
  // 'redirect' when the browser is leaving for the gateway, null on error.
  async function createGatewayPayment(method: PaymentMethod, legacyCheckoutId: string) {
    const returnUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}?checkoutId=${encodeURIComponent(legacyCheckoutId)}&payment=returned`
        : '';
    const response = await graphqlRequest<PaymentCreateResponse>(CHECKOUT_PAYMENT_CREATE, {
      checkoutId: legacyCheckoutId,
      input: {
        gateway: method.id,
        returnUrl,
      },
    });
    const payload = response.data?.checkoutPaymentCreate;
    const message = getRequestMessage(response.errors, payload?.errors, 'Failed to initialize payment.');

    if (getGraphqlErrorMessage(response.errors) || getPayloadMessage(payload?.errors) || !payload?.payment) {
      setErrorBanner(message);
      toast.error(message);
      return null;
    }

    if (payload.payment.total?.amount != null) {
      setServerTotal(payload.payment.total.amount);
    }

    if (payload.payment.actionUrl && typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        'oms-pending-checkout',
        JSON.stringify({ checkoutId: legacyCheckoutId })
      );
      window.location.assign(payload.payment.actionUrl);
      return 'redirect' as const;
    }

    return 'ready' as const;
  }

  async function handlePromoApply() {
    if (!promoCode.trim() || !validateDeliveryStep()) {
      return;
    }

    setBusy(true);
    setErrorBanner(null);

    try {
      const handoff = await initializeCheckoutHandoff();

      if (!handoff) {
        return;
      }

      const nextPromoCode = promoCode.trim();
      const response = await graphqlRequest<CheckoutPromoCodeAddResponse>(CHECKOUT_PROMO_CODE_ADD, {
        checkoutId: handoff.id,
        promoCode: nextPromoCode,
      });
      const payload = response.data?.checkoutPromoCodeAdd;
      const message = getRequestMessage(response.errors, payload?.errors, 'Failed to apply promo code.');

      if (getGraphqlErrorMessage(response.errors) || getPayloadMessage(payload?.errors) || !payload?.checkout) {
        setErrorBanner(message);
        toast.error(message);
        return;
      }

      setAppliedPromoCode(nextPromoCode);
      toast.success(t('promoApplied'));
    } finally {
      setBusy(false);
    }
  }

  async function handlePromoRemove() {
    if (!checkoutId) {
      setAppliedPromoCode(null);
      setPromoCode('');
      return;
    }

    setBusy(true);
    setErrorBanner(null);

    try {
      const response = await graphqlRequest<CheckoutPromoCodeRemoveResponse>(CHECKOUT_PROMO_CODE_REMOVE, {
        checkoutId,
      });
      const payload = response.data?.checkoutPromoCodeRemove;
      const message = getRequestMessage(response.errors, payload?.errors, 'Failed to remove promo code.');

      if (getGraphqlErrorMessage(response.errors) || getPayloadMessage(payload?.errors) || !payload?.checkout) {
        setErrorBanner(message);
        toast.error(message);
        return;
      }

      setAppliedPromoCode(null);
      setServerTotal(null);
      setPromoCode('');
    } finally {
      setBusy(false);
    }
  }

  // Registers the Przelewy24 session for an order that already exists, then hands
  // the shopper to P24. Only identifiers go to sessionStorage; the return page
  // asks the backend for the real status.
  async function startP24Payment(order: { id: string; number: string }, legacyCheckoutId: string | null) {
    if (!legacyCheckoutId) return;

    setPendingP24Order(order);
    setBusy(true);
    setErrorBanner(null);

    try {
      const response = await graphqlRequest<PaymentCreateResponse>(CHECKOUT_PAYMENT_CREATE, {
        checkoutId: legacyCheckoutId,
        input: {
          gateway: 'p24',
          orderId: order.id,
          // The backend only reads the locale prefix from this (same origin),
          // so P24 sends the shopper back to the page in their language.
          returnUrl: window.location.href,
        },
      });
      const payload = response.data?.checkoutPaymentCreate;
      const rawMessage = getRequestMessage(response.errors, payload?.errors, t('paymentInitFailed'));

      if (getGraphqlErrorMessage(response.errors) || getPayloadMessage(payload?.errors) || !payload?.payment?.actionUrl) {
        const message = /expired|wygas/i.test(rawMessage) ? t('paymentSessionExpired') : t('paymentInitFailed');
        setErrorBanner(message);
        toast.error(message);
        return;
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          P24_PENDING_KEY,
          JSON.stringify({
            paymentId: payload.payment.id,
            orderId: order.id,
            orderNumber: order.number,
            // Lets the return page offer "back to Przelewy24" while the session is valid.
            actionUrl: payload.payment.actionUrl,
            registeredAt: new Date().toISOString(),
          })
        );
        window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
        window.sessionStorage.removeItem('oms-pending-checkout');
      }
      clearCart();
      toast.success(t('paymentRedirecting'));
      window.location.assign(payload.payment.actionUrl);
    } finally {
      setBusy(false);
    }
  }

  async function handlePlaceOrder() {
    if (pendingP24Order) {
      // The order exists; only its payment is retried.
      await startP24Payment(pendingP24Order, checkoutId);
      return;
    }

    if (!validateDeliveryStep()) {
      return;
    }

    if (!selectedDeliveryOption) {
      setDeliveryError(uiText.selectDeliveryFirst);
      focusElement('checkout-block-delivery');
      return;
    }

    if (!selectedPaymentMethod) {
      setPaymentError(t('selectPayment'));
      focusElement('checkout-block-payment');
      return;
    }

    if (!termsAccepted) {
      setTermsError(t('termsRequired'));
      focusElement('checkout-terms');
      return;
    }

    const payWithP24 = isP24Method(selectedPaymentMethod);

    if (payWithP24 && sellerIdentityMissing) {
      setErrorBanner(t('sellerIdentityMissing'));
      return;
    }

    if (pickupMode && !pickupAddress) {
      setErrorBanner(uiText.pickupAddressMissing);
      toast.error(uiText.pickupAddressMissing);
      return;
    }

    const email = isAuthenticated ? authEmail : form.email.trim();

    setBusy(true);
    setErrorBanner(null);

    try {
      const buyerUpdated = await updateBuyerIdentity({
        email,
        phone: form.phone.trim() || null,
        countryCode: normalizeCountryCode(pickupMode ? pickupAddress?.country ?? 'PL' : form.country),
      });

      if (!buyerUpdated) {
        const message = useCartStore.getState().error ?? t('orderError');
        setErrorBanner(message);
        toast.error(message);
        return;
      }

      const orderNote = buildOrderNote();
      if (orderNote !== note) {
        await updateNote(orderNote);
      }

      const handoff = await initializeCheckoutHandoff();

      if (!handoff) {
        return;
      }

      if (!payWithP24 && !gatewayReturned) {
        const gateway = await createGatewayPayment(selectedPaymentMethod, handoff.id);
        if (gateway !== 'ready') {
          return;
        }
      }

      const response = await graphqlRequest<CheckoutCompleteResponse>(CHECKOUT_COMPLETE_MUTATION, {
        input: {
          checkoutId: handoff.id,
          termsAccepted: true,
          ...(payWithP24 ? { paymentData: 'p24' } : {}),
        },
      });
      const payload = response.data?.checkoutComplete;
      const insufficientStockError = getInsufficientStockError(payload?.errors);
      const message = insufficientStockError
        ? `${uiText.insufficientStock} ${insufficientStockError.message}`
        : getRequestMessage(response.errors, payload?.errors, 'Failed to complete checkout.');

      if (getGraphqlErrorMessage(response.errors) || getPayloadMessage(payload?.errors) || !payload?.order) {
        if (insufficientStockError) {
          await hydrateCart();
        }
        setErrorBanner(message);
        toast.error(message);
        return;
      }

      saveLastOrder({
        number: payload.order.number,
        email,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          total: item.totalPrice ?? item.price * item.quantity,
        })),
        total: payload.order.total?.gross?.amount ?? handoff.total ?? displayTotal,
        currency: payload.order.total?.gross?.currency ?? displayCurrency,
        paymentMethod: translatePaymentMethodName(locale, selectedPaymentMethod),
      });

      const buyerPhone = form.phone.trim();
      if (isAuthenticated && buyerPhone && buyerPhone !== authPhone.trim()) {
        await saveProfilePhone(buyerPhone);
      }

      if (!isAuthenticated) {
        writeRememberedContact(
          rememberContact
            ? { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email, phone: form.phone.trim() }
            : null
        );
      }

      if (payWithP24) {
        await startP24Payment({ id: payload.order.id, number: payload.order.number }, handoff.id);
        return;
      }

      clearCart();
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
        window.sessionStorage.removeItem('oms-pending-checkout');
      }
      toast.success(t('orderSuccess'));
      router.push(`/checkout/confirmation?order=${encodeURIComponent(payload.order.number)}`);
    } finally {
      setBusy(false);
    }
  }

  function renderField(
    field: keyof DeliveryFormState,
    label: string,
    options: { autoComplete: string; type?: string; inputMode?: 'text' | 'email' | 'tel'; wide?: boolean; hint?: string }
  ) {
    const error = fieldErrors[field];
    const hintId = options.hint ? `checkout-${field}-hint` : undefined;
    const describedBy = [error ? `checkout-${field}-error` : null, hintId].filter(Boolean).join(' ') || undefined;
    return (
      <div key={field} className={options.wide ? 'sm:col-span-2' : undefined}>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }} htmlFor={`checkout-${field}`}>
          {label}
        </label>
        <input
          id={`checkout-${field}`}
          name={field}
          type={options.type ?? 'text'}
          inputMode={options.inputMode ?? 'text'}
          autoComplete={options.autoComplete}
          value={form[field]}
          onChange={(event) => setFieldValue(field, event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={INPUT_CLASS}
          style={{
            borderColor: error ? 'var(--color-destructive)' : 'var(--color-border)',
            color: 'var(--color-foreground)',
          }}
        />
        {options.hint && (
          <p id={hintId} className="text-[11px] mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {options.hint}
          </p>
        )}
        {error && (
          <p id={`checkout-${field}-error`} className="text-xs mt-1" style={{ color: 'var(--color-destructive)' }} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  // The only fulfilment option (ADG: store pickup) is a fact, not a choice.
  const singlePickup = pickupMode && deliveryOptions.length === 1;
  const payAtPickup = pickupMode && isPayOnCollectionMethod(selectedPaymentMethod);
  const formattedTotal = formatPrice(displayTotal, displayCurrency);
  const placeOrderLabel = busy
    ? t('processing')
    : pendingP24Order
      ? t('paymentRetry')
      : payAtPickup
        ? t('placeOrderPayAtPickup', { total: formattedTotal })
        : t('placeOrderPay', { total: formattedTotal });

  function placeOrderButton(widthClass: string) {
    return (
      <button
        type="button"
        onClick={() => void handlePlaceOrder()}
        disabled={busy || (isP24Method(selectedPaymentMethod) && sellerIdentityMissing)}
        className={`inline-flex ${widthClass} items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-white transition-all duration-fast disabled:opacity-60`}
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-5 w-5" aria-hidden="true" />}
        <span className="tabular-nums">{placeOrderLabel}</span>
      </button>
    );
  }

  if (!isHydrated || !initialized || (isCartLoading && items.length === 0)) {
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

      <div
        className="mb-4 rounded-2xl border lg:hidden"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        data-testid="mobile-checkout-summary"
      >
        <button
          type="button"
          onClick={() => setMobileSummaryOpen((open) => !open)}
          aria-expanded={mobileSummaryOpen}
          aria-controls="mobile-checkout-summary-panel"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold"
          style={{ color: 'var(--color-foreground)' }}
        >
          <span>{t('yourOrder', { count: itemCount })}</span>
          <span className="flex items-center gap-1.5 tabular-nums">
            {formatPrice(displayTotal, displayCurrency)}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-fast ${mobileSummaryOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </span>
        </button>
        {mobileSummaryOpen && (
          <div
            id="mobile-checkout-summary-panel"
            className="border-t px-4 py-4"
            style={{ borderColor: 'var(--color-border)' }}
            data-testid="mobile-checkout-summary-panel"
          >
            {orderSummary}
          </div>
        )}
      </div>

      {(errorBanner || cartError) && (
        <div
          className="mb-6 rounded-2xl border px-4 py-3 text-sm"
          role="alert"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-destructive) 40%, var(--color-border))',
            backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
            color: 'var(--color-destructive)',
          }}
        >
          {errorBanner || cartError}
        </div>
      )}

      <div className="grid min-w-0 gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {/* ── 1: Contact (and address when delivering) ── */}
          <CheckoutBlock
            index={1}
            title={pickupMode ? t('stepPickupContact') : t('delivery')}
            testId="checkout-block-contact"
          >
              {isAuthenticated && !editingContact ? (
                <div
                  className="flex items-start justify-between gap-3 rounded-xl border p-4"
                  style={{ borderColor: 'var(--color-border)' }}
                  data-testid="checkout-contact-card"
                >
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold" style={{ color: 'var(--color-foreground)' }}>
                      {form.firstName} {form.lastName}
                    </p>
                    <p className="mt-0.5 truncate" style={{ color: 'var(--color-muted-foreground)' }}>{authEmail}</p>
                    <p className="mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{form.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingContact(true)}
                    className="shrink-0 text-sm font-medium underline underline-offset-4"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t('change')}
                  </button>
                </div>
              ) : (
              <>
              {!isAuthenticated && (
                <p className="mb-4 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  {t('haveAccount')}{' '}
                  <Link
                    href={{ pathname: '/login', query: { returnTo: '/checkout' } }}
                    className="font-medium underline underline-offset-4"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t('signIn')}
                  </Link>
                </p>
              )}
              {/* ── Saved address selector ── */}
              {!pickupMode && savedAddresses.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-2.5" style={{ color: 'var(--color-muted-foreground)' }}>
                    {locale === 'pl' ? 'Użyj zapisanego adresu' : 'Use a saved address'}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[...savedAddresses]
                      .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
                      .map((addr) => {
                      const isDefault = addr.isDefault;
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          disabled={busy}
                          onClick={() => handleSavedAddressSelect(addr)}
                          className="w-full rounded-xl border-2 p-3.5 text-left transition-all duration-fast disabled:opacity-60"
                          style={{
                            borderColor: isDefault ? 'var(--color-primary)' : 'var(--color-border)',
                            backgroundColor: isDefault
                              ? 'color-mix(in srgb, var(--color-primary) 6%, transparent)'
                              : 'transparent',
                          }}
                        >
                          <span className="flex items-center gap-2 mb-1">
                            <MapPin
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: isDefault ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
                              aria-hidden="true"
                            />
                            {addr.label && (
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: isDefault ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
                              >
                                {addr.label}
                              </span>
                            )}
                            {isDefault && (
                              <span
                                className="ml-auto text-[9px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5"
                                style={{
                                  backgroundColor: 'var(--color-primary)',
                                  color: 'white',
                                }}
                              >
                                {locale === 'pl' ? 'Domyślny' : 'Default'}
                              </span>
                            )}
                          </span>
                          <span className="block text-xs font-semibold truncate mt-0.5" style={{ color: 'var(--color-foreground)' }}>
                            {addr.fullName}
                          </span>
                          <span className="block text-xs truncate mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                            {addr.street}, {addr.postalCode} {addr.city}
                          </span>
                          <span className="block text-[11px] mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                            {addr.phone}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-b mt-4 mb-1" style={{ borderColor: 'var(--color-border)' }} />
                  <p className="text-[11px] mt-2 mb-1" style={{ color: 'var(--color-muted-foreground)' }}>
                    {locale === 'pl' ? 'Lub wypełnij ręcznie poniżej:' : 'Or fill in manually below:'}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {renderField('firstName', t('firstName'), { autoComplete: 'given-name' })}
                {renderField('lastName', t('lastName'), { autoComplete: 'family-name' })}
                {!isAuthenticated && renderField('email', t('email'), { autoComplete: 'email', type: 'email', inputMode: 'email', wide: true })}
                {renderField('phone', t('phone'), { autoComplete: 'tel', type: 'tel', inputMode: 'tel', hint: t('phoneHint') })}
                {!pickupMode && (
                  <>
                    {renderField('streetAddress1', t('address'), { autoComplete: 'street-address', wide: true })}
                    {renderField('city', t('city'), { autoComplete: 'address-level2' })}
                    {renderField('postalCode', t('postalCode'), { autoComplete: 'postal-code' })}
                    {/* Poland-only delivery: the country is fixed to PL and never asked for. */}
                  </>
                )}
              </div>
              </>
              )}

              {pickupMode && (
                <div className="mt-4">
                  <label htmlFor="checkout-pickup-by-other" className="flex cursor-pointer items-center gap-3 text-sm" style={{ color: 'var(--color-foreground)' }}>
                    <input
                      id="checkout-pickup-by-other"
                      type="checkbox"
                      checked={pickupByOther}
                      onChange={(event) => setPickupByOther(event.target.checked)}
                      className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                    />
                    {t('pickupByOther')}
                  </label>
                  {pickupByOther && (
                    <div className="mt-3 grid gap-4 sm:grid-cols-2" data-testid="checkout-recipient">
                      {renderField('recipientFirstName', t('recipientFirstName'), { autoComplete: 'off' })}
                      {renderField('recipientLastName', t('recipientLastName'), { autoComplete: 'off' })}
                      {renderField('recipientPhone', t('recipientPhone'), { autoComplete: 'off', type: 'tel', inputMode: 'tel', hint: t('pickupByOtherHint') })}
                    </div>
                  )}
                </div>
              )}

              {!isAuthenticated && (
                <label htmlFor="checkout-remember" className="mt-3 flex cursor-pointer items-center gap-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  <input
                    id="checkout-remember"
                    type="checkbox"
                    checked={rememberContact}
                    onChange={(event) => setRememberContact(event.target.checked)}
                    className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                  />
                  {t('rememberContact')}
                </label>
              )}
          </CheckoutBlock>

          {/* ── 2: Pickup / delivery method ── */}
          <CheckoutBlock
            index={2}
            title={pickupMode ? t('stepPickupMethod') : t('shippingTitle')}
            testId="checkout-block-delivery"
          >
              <div id="checkout-block-delivery" tabIndex={-1} className="outline-none">
                {deliveryOptions.length === 0 ? (
                  <div className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                    {deliveryError ? (
                      <div className="flex flex-col items-start gap-3">
                        <span role="alert" style={{ color: 'var(--color-destructive)' }}>{deliveryError}</span>
                        <button
                          type="button"
                          onClick={() => void retryDeliveryOptions()}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium disabled:opacity-60"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                        >
                          <RefreshCw className="h-4 w-4" aria-hidden="true" />
                          {tCommon('retry')}
                        </button>
                      </div>
                    ) : deliveryOptionsRequested ? uiText.noDeliveryOptions : tCommon('loading')}
                  </div>
                ) : singlePickup && selectedDeliveryOption ? (
                  <div className="flex items-start gap-3 text-sm" data-testid="checkout-pickup-single">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold" style={{ color: 'var(--color-foreground)' }}>
                        {translateDeliveryOptionName(locale, selectedDeliveryOption)}
                        {' · '}
                        {selectedDeliveryOption.price.amount === 0
                          ? t('freeShipping')
                          : formatPrice(selectedDeliveryOption.price.amount, selectedDeliveryOption.price.currency)}
                      </p>
                      {pickupAddress && (
                        <p className="mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                          {pickupAddress.streetAddress1}, {pickupAddress.postalCode} {pickupAddress.city}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3" role="radiogroup" aria-label={pickupMode ? t('stepPickupMethod') : t('shippingTitle')}>
                    {deliveryOptions.map((option) => {
                      const selected = selectedDeliveryOption?.id === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => void handleDeliverySelection(option)}
                          disabled={busy}
                          className="w-full rounded-2xl border p-4 text-left transition-colors duration-fast disabled:opacity-60"
                          style={{
                            borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                            backgroundColor: selected ? 'color-mix(in srgb, var(--color-primary) 7%, transparent)' : 'transparent',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {pickupMode
                              ? <MapPin className="h-5 w-5 shrink-0" style={{ color: selected ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }} aria-hidden="true" />
                              : <Truck className="h-5 w-5 shrink-0" style={{ color: selected ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }} aria-hidden="true" />}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                                {translateDeliveryOptionName(locale, option)}
                              </p>
                              {pickupMode && pickupAddress && (
                                <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                                  {pickupAddress.streetAddress1}, {pickupAddress.postalCode} {pickupAddress.city}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                              {option.price.amount === 0 ? t('freeShipping') : formatPrice(option.price.amount, option.price.currency)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {deliveryError && (
                      <p role="alert" className="text-sm" style={{ color: 'var(--color-destructive)' }}>
                        {deliveryError}
                      </p>
                    )}
                  </div>
                )}
                {pickupMode && (
                  <p className="mt-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    {checkoutPickupNotice}
                  </p>
                )}
              </div>
          </CheckoutBlock>

          {/* ── 3: Payment ── */}
          <CheckoutBlock index={3} title={t('paymentTitle')} testId="checkout-block-payment">
              <div id="checkout-block-payment" tabIndex={-1} className="outline-none">
                {bankTransferMode && renderCheckoutNotice(checkoutBankTransferNotice)}

                {paymentMethods.length === 0 ? (
                  <div className="flex flex-col items-start gap-3 rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                    <span>{paymentMethodsLoaded ? uiText.noPaymentMethods : uiText.loadingPaymentMethods}</span>
                    {paymentMethodsLoaded && (
                      <button
                        type="button"
                        onClick={() => void loadPaymentMethods()}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium disabled:opacity-60"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        {uiText.retryHandoff}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3" role="radiogroup" aria-label={t('paymentTitle')}>
                    {paymentMethods.map((method) => {
                      const selected = selectedPaymentMethod?.id === method.id;
                      const Icon = getPaymentIcon(method);
                      const paymentDetail = translatePaymentMethodDescription(locale, method);

                      return (
                        <button
                          key={method.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => handlePaymentSelection(method)}
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
                              {paymentDetail && (
                                <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                                  {paymentDetail}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {paymentError && (
                  <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--color-destructive)' }}>
                    {paymentError}
                  </p>
                )}
              </div>
          </CheckoutBlock>

          {/* ── 4: Confirm ── */}
          <CheckoutBlock index={4} title={t('confirmTitle')} testId="checkout-section-review">
              {bankTransferMode && renderCheckoutNotice(tFulfillment('checkoutReviewNotice'))}
              {pickupMode && renderCheckoutNotice(tFulfillment('checkoutPickupReviewNotice'))}
              {isP24Method(selectedPaymentMethod) && sellerIdentityMissing && renderCheckoutNotice(t('sellerIdentityMissing'))}

              <div className="mb-5 space-y-3">
                {promoSection}
                {noteOpen || form.note ? (
                  <div>
                    <label htmlFor="checkout-note" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('note')}
                    </label>
                    <textarea
                      id="checkout-note"
                      rows={2}
                      value={form.note}
                      onChange={(event) => setFieldValue('note', event.target.value)}
                      autoFocus={noteOpen && !form.note}
                      className={`${INPUT_CLASS} resize-none`}
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                      placeholder={t('notePlaceholder')}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNoteOpen(true)}
                    className="block text-sm font-medium underline underline-offset-4"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t('addNote')}
                  </button>
                )}
              </div>

              <div className="mb-5">
                <label htmlFor="checkout-terms" className="flex cursor-pointer items-start gap-3 text-sm" style={{ color: 'var(--color-foreground)' }}>
                  <input
                    id="checkout-terms"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => {
                      setTermsAccepted(event.target.checked);
                      if (event.target.checked) setTermsError(null);
                    }}
                    aria-required="true"
                    aria-invalid={termsError ? 'true' : undefined}
                    aria-describedby={termsError ? 'checkout-terms-error' : undefined}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                  />
                  <span>
                    {t.rich('termsAccept', {
                      terms: (chunks) => (
                        <Link href="/terms" target="_blank" rel="noopener" className="underline underline-offset-2">
                          {chunks}
                        </Link>
                      ),
                      privacy: (chunks) => (
                        <Link href="/privacy" target="_blank" rel="noopener" className="underline underline-offset-2">
                          {chunks}
                        </Link>
                      ),
                    })}
                  </span>
                </label>
                {termsError && (
                  <p id="checkout-terms-error" role="alert" className="mt-2 text-sm" style={{ color: 'var(--color-destructive)' }}>
                    {termsError}
                  </p>
                )}
              </div>

              <div className="hidden justify-end lg:flex">
                {placeOrderButton('w-auto')}
              </div>
          </CheckoutBlock>
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-20 rounded-2xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
            <h2 className="heading-section text-lg mb-4" style={{ color: 'var(--color-foreground)' }}>
              {t('summary')}
            </h2>
            {orderSummary}
            {trustRows}
          </div>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur lg:hidden"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-card) 96%, transparent)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
        }}
        data-testid="mobile-checkout-summary-bar"
      >
        <div className="container-grocery py-3">
          {placeOrderButton('w-full')}
        </div>
      </div>
    </div>
  );
}

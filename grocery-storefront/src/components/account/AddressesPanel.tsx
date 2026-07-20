'use client';

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react';
import { useTranslations } from 'next-intl';
import {
  Loader2,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  CUSTOMER_ADDRESSES_QUERY,
  CUSTOMER_ADDRESS_CREATE_MUTATION,
  CUSTOMER_ADDRESS_DELETE_MUTATION,
  CUSTOMER_ADDRESS_SET_DEFAULT_MUTATION,
  CUSTOMER_ADDRESS_UPDATE_MUTATION,
} from '@/lib/graphql/operations/grocery';
import { getGraphqlErrorMessage, graphqlRequest } from '@/lib/graphql/request';
import type { CustomerAddress, CustomerAddressInput } from '@/types';

interface CustomerAddressesResponse {
  customerAddresses: CustomerAddress[] | null;
}

interface AddressMutationPayload {
  success: boolean;
  address: CustomerAddress | null;
  errors: string[] | null;
}

interface AddressMutationResponse {
  customerAddressCreate?: AddressMutationPayload | null;
  customerAddressUpdate?: AddressMutationPayload | null;
  customerAddressDelete?: Omit<AddressMutationPayload, 'address'> | null;
  customerAddressSetDefault?: AddressMutationPayload | null;
}

interface AddressFormState {
  label: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

/* ---------- empty form state ---------- */

function createEmptyAddressForm(): AddressFormState {
  return {
    label: '',
    fullName: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'PL',
  };
}

/* ---------- component ---------- */

export function AddressesPanel() {
  const tAccount = useTranslations('account');

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(createEmptyAddressForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* ---------- inline notice auto-hide ---------- */
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  /* ---------- fetch addresses ---------- */
  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await graphqlRequest<CustomerAddressesResponse>(CUSTOMER_ADDRESSES_QUERY);
      const message = getGraphqlErrorMessage(response.errors);

      if (message) {
        setError(tAccount('loadAddressesFailed'));
        return;
      }

      setAddresses(response.data?.customerAddresses ?? []);
    } catch {
      setError(tAccount('loadAddressesFailed'));
    } finally {
      setLoading(false);
    }
  }, [tAccount]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  /* ---------- open / close form ---------- */
  function openNew() {
    setEditingId(null);
    setForm(createEmptyAddressForm());
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(addr: CustomerAddress) {
    setEditingId(addr.id);
    setForm({
      label: addr.label ?? '',
      fullName: addr.fullName,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      postalCode: addr.postalCode,
      country: addr.country || 'PL',
    });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
  }

  /* ---------- create / update ---------- */
  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const input: CustomerAddressInput = {
      label: form.label.trim() || null,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      street: form.street.trim(),
      city: form.city.trim(),
      postalCode: form.postalCode.trim(),
      country: form.country.trim().toUpperCase(),
    };

    if (!input.fullName || !input.phone || !input.street || !input.city || !input.postalCode || !input.country) {
      const message = tAccount('addressRequiredFields');
      setFormError(message);
      return;
    }

    setFormSaving(true);

    try {
      const isEdit = Boolean(editingId);
      const response = await graphqlRequest<AddressMutationResponse>(
        isEdit ? CUSTOMER_ADDRESS_UPDATE_MUTATION : CUSTOMER_ADDRESS_CREATE_MUTATION,
        isEdit ? { id: editingId, input } : { input },
      );
      const topLevelError = getGraphqlErrorMessage(response.errors);
      const payload = isEdit
        ? response.data?.customerAddressUpdate
        : response.data?.customerAddressCreate;

      if (topLevelError || !payload?.success) {
        const message = tAccount('addressSaveFailed');
        setFormError(message);
        return;
      }

      const message = isEdit ? tAccount('addressUpdated') : tAccount('addressCreated');
      setNotice({ type: 'success', message });
      closeForm();
      await loadAddresses();
    } catch {
      const message = tAccount('addressSaveFailed');
      setFormError(message);
    } finally {
      setFormSaving(false);
    }
  }

  /* ---------- delete ---------- */
  async function handleDelete(id: string) {
    setActionLoading(id);
    try {
      const response = await graphqlRequest<AddressMutationResponse>(CUSTOMER_ADDRESS_DELETE_MUTATION, { id });
      const topLevelError = getGraphqlErrorMessage(response.errors);
      const payload = response.data?.customerAddressDelete;

      if (topLevelError || !payload?.success) {
        const message = tAccount('addressDeleteFailed');
        setNotice({ type: 'error', message });
        return;
      }

      await loadAddresses();
      const message = tAccount('addressDeleted');
      setNotice({ type: 'success', message });
    } catch {
      const message = tAccount('addressDeleteFailed');
      setNotice({ type: 'error', message });
    } finally {
      setActionLoading(null);
    }
  }

  /* ---------- set default ---------- */
  async function handleSetDefault(id: string) {
    setActionLoading(id);
    try {
      const response = await graphqlRequest<AddressMutationResponse>(CUSTOMER_ADDRESS_SET_DEFAULT_MUTATION, { id });
      const topLevelError = getGraphqlErrorMessage(response.errors);
      const payload = response.data?.customerAddressSetDefault;

      if (topLevelError || !payload?.success) {
        const message = tAccount('addressDefaultFailed');
        setNotice({ type: 'error', message });
        return;
      }

      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === id })),
      );
      const message = tAccount('addressDefaultSet');
      setNotice({ type: 'success', message });
    } catch {
      const message = tAccount('addressDefaultFailed');
      setNotice({ type: 'error', message });
    } finally {
      setActionLoading(null);
    }
  }

  /* ---------- render ---------- */
  return (
    <section
      className="rounded-2xl border p-5 md:p-6"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      {/* header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
          >
            <MapPin className="w-5 h-5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
              {tAccount('addressesTitle')}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
              {tAccount('addressesDescription')}
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-fast active:scale-[0.98]"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {tAccount('addAddress')}
          </button>
        )}
      </div>

      {/* persistent inline outcome */}
      {notice && (
        <div
          role={notice.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm mb-5"
          style={{
            borderColor: notice.type === 'success'
              ? 'color-mix(in srgb, var(--color-primary) 40%, var(--color-border))'
              : 'color-mix(in srgb, var(--color-destructive) 40%, var(--color-border))',
            backgroundColor: notice.type === 'success'
              ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
              : 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
            color: notice.type === 'success' ? 'var(--color-primary)' : 'var(--color-destructive)',
          }}
        >
          {notice.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {notice.message}
        </div>
      )}

      {/* form */}
      {showForm && (
        <AddressForm
          form={form}
          setForm={setForm}
          saving={formSaving}
          error={formError}
          isEdit={Boolean(editingId)}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
        />
      )}

      {/* list */}
      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-3" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {tAccount('loadingAddresses')}
          </p>
        </div>
      ) : error ? (
        <div
          className="rounded-2xl border px-4 py-4 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-destructive) 40%, var(--color-border))',
            backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
            color: 'var(--color-destructive)',
          }}
        >
          {error}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <div className="py-12 text-center">
          <MapPin className="mx-auto h-10 w-10 mb-3 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
          <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            {tAccount('noAddresses')}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {tAccount('noAddressesHint')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((addr) => (
            <article
              key={addr.id}
              className="rounded-2xl border p-4 relative"
              style={{ borderColor: addr.isDefault ? 'var(--color-primary)' : 'var(--color-border)' }}
            >
              {addr.isDefault && (
                <span
                  className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }}
                >
                  <Star className="w-3 h-3" aria-hidden="true" />
                  {tAccount('defaultBadge')}
                </span>
              )}

              {addr.label && (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--color-primary)' }}>
                  {addr.label}
                </p>
              )}
              <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                {addr.fullName}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                {addr.street}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {addr.postalCode} {addr.city}, {addr.country}
              </p>
              {addr.phone && (
                <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                  {addr.phone}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => openEdit(addr)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-fast hover-surface"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  {tAccount('editAddress')}
                </button>

                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => void handleSetDefault(addr.id)}
                    disabled={actionLoading === addr.id}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-fast hover-surface disabled:opacity-60"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                  >
                    <Star className="w-3.5 h-3.5" aria-hidden="true" />
                    {tAccount('setDefault')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void handleDelete(addr.id)}
                  disabled={actionLoading === addr.id}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-fast disabled:opacity-60"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-destructive) 30%, var(--color-border))',
                    color: 'var(--color-destructive)',
                  }}
                >
                  {actionLoading === addr.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {tAccount('deleteAddress')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- address form sub-component ---------- */

interface AddressFormProps {
  form: AddressFormState;
  setForm: Dispatch<SetStateAction<AddressFormState>>;
  saving: boolean;
  error: string | null;
  isEdit: boolean;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

function AddressForm({ form, setForm, saving, error, isEdit, onSubmit, onCancel }: AddressFormProps) {
  const tAccount = useTranslations('account');

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const fields: Array<{
    key: keyof AddressFormState;
    label: string;
    required: boolean;
    placeholder: string;
    colSpan?: number;
    type?: 'text' | 'tel';
    autoComplete?: string;
    maxLength?: number;
  }> = [
    { key: 'label', label: tAccount('addressLabelField'), required: false, placeholder: tAccount('addressLabelPlaceholder'), colSpan: 1 },
    { key: 'fullName', label: tAccount('fullNameLabel'), required: true, placeholder: tAccount('fullNamePlaceholder'), colSpan: 1, autoComplete: 'name' },
    { key: 'phone', label: tAccount('phoneLabel'), required: true, placeholder: tAccount('phonePlaceholder'), colSpan: 2, type: 'tel', autoComplete: 'tel' },
    { key: 'street', label: tAccount('streetLabel'), required: true, placeholder: tAccount('streetPlaceholder'), colSpan: 2, autoComplete: 'street-address' },
    { key: 'city', label: tAccount('cityLabel'), required: true, placeholder: tAccount('cityPlaceholder'), colSpan: 1, autoComplete: 'address-level2' },
    { key: 'postalCode', label: tAccount('postalCodeLabel'), required: true, placeholder: tAccount('postalCodePlaceholder'), colSpan: 1, autoComplete: 'postal-code' },
    { key: 'country', label: tAccount('countryLabel'), required: true, placeholder: tAccount('countryPlaceholder'), colSpan: 2, autoComplete: 'country', maxLength: 2 },
  ];

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="rounded-2xl border p-4 mb-5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
          {isEdit ? tAccount('editAddress') : tAccount('addAddress')}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label={tAccount('closeAddressForm')}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 transition-colors duration-fast hover-surface"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, required, placeholder, colSpan, type = 'text', autoComplete, maxLength }) => (
          <div key={key} className={colSpan === 2 ? 'col-span-2' : ''}>
            <label htmlFor={`addr-${key}`} className="block text-xs font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>
              {label}
              {required && <span style={{ color: 'var(--color-destructive)' }}> *</span>}
            </label>
            <input
              id={`addr-${key}`}
              type={type}
              value={form[key]}
              onChange={(e) => update(key, e.target.value)}
              required={required}
              placeholder={placeholder}
              autoComplete={autoComplete}
              maxLength={maxLength}
              className="min-h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors duration-fast focus:ring-2"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-card)',
                color: 'var(--color-foreground)',
              }}
            />
          </div>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm mt-4"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-destructive) 40%, var(--color-border))',
            backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
            color: 'var(--color-destructive)',
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 mt-4">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {isEdit ? tAccount('saveAddress') : tAccount('addAddress')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors duration-fast hover-surface"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
        >
          {tAccount('cancelAddress')}
        </button>
      </div>
    </form>
  );
}

'use client';

import { useEffect, useState, useCallback, type FormEvent } from 'react';
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
import { getAuthToken } from '@/lib/auth';
import type { CustomerAddress, CustomerAddressInput } from '@/types';

/* ---------- local address API helper ---------- */

/**
 * Calls the local /api/addresses endpoint.
 * This works around a backend bug where the GraphQL mutations
 * (customerAddressCreate / customerAddressUpdate) reject all input fields.
 */
async function addressApi<T = unknown>(
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('/api/addresses', {
    method,
    headers,
    cache: 'no-store',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  return res.json();
}

interface AddressListResponse {
  addresses: CustomerAddress[];
  error?: string;
}

interface AddressMutationResponse {
  success: boolean;
  address?: CustomerAddress | null;
  errors?: string[] | null;
  error?: string;
}

/* ---------- empty form state ---------- */

const EMPTY_FORM: CustomerAddressInput & { label: string } = {
  label: '',
  fullName: '',
  phone: '',
  street: '',
  city: '',
  postalCode: '',
  country: '',
};

/* ---------- component ---------- */

export function AddressesPanel() {
  const tAccount = useTranslations('account');

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* ---------- toast auto-hide ---------- */
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ---------- fetch addresses ---------- */
  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await addressApi<AddressListResponse>('GET');
      if (res.error) {
        setError(res.error);
        return;
      }
      setAddresses(res.addresses ?? []);
    } catch {
      setError('Failed to load addresses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  /* ---------- open / close form ---------- */
  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(addr: CustomerAddress) {
    setEditingId(addr.id);
    setForm({
      label: addr.label ?? '',
      fullName: addr.fullName ?? '',
      phone: addr.phone ?? '',
      street: addr.street,
      city: addr.city,
      postalCode: addr.postalCode,
      country: addr.country,
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
    setFormSaving(true);
    setFormError(null);

    const input: CustomerAddressInput = {
      label: form.label.trim() || null,
      fullName: form.fullName.trim(),
      phone: form.phone?.trim() || null,
      street: form.street.trim(),
      city: form.city.trim(),
      postalCode: form.postalCode.trim(),
      country: form.country.trim(),
    };

    try {
      const isEdit = Boolean(editingId);
      const res = await addressApi<AddressMutationResponse>('POST', isEdit
        ? { action: 'update', id: editingId, input }
        : { action: 'create', input },
      );

      if (res.error || !res.success) {
        const errArr = res.errors;
        setFormError(res.error ?? (Array.isArray(errArr) && errArr.length > 0 ? errArr[0] : tAccount('addressSaveFailed')));
        return;
      }

      setToast({ type: 'success', message: isEdit ? tAccount('addressUpdated') : tAccount('addressCreated') });
      closeForm();
      void loadAddresses();
    } catch {
      setFormError(tAccount('addressSaveFailed'));
    } finally {
      setFormSaving(false);
    }
  }

  /* ---------- delete ---------- */
  async function handleDelete(id: string) {
    setActionLoading(id);
    try {
      const res = await addressApi<AddressMutationResponse>('POST', { action: 'delete', id });

      if (!res.success) {
        setToast({ type: 'error', message: res.errors?.[0] ?? tAccount('addressDeleteFailed') });
        return;
      }

      setAddresses((prev) => prev.filter((a) => a.id !== id));
      setToast({ type: 'success', message: tAccount('addressDeleted') });
    } catch {
      setToast({ type: 'error', message: tAccount('addressDeleteFailed') });
    } finally {
      setActionLoading(null);
    }
  }

  /* ---------- set default ---------- */
  async function handleSetDefault(id: string) {
    setActionLoading(id);
    try {
      const res = await addressApi<AddressMutationResponse>('POST', { action: 'setDefault', id });

      if (!res.success) {
        setToast({ type: 'error', message: res.errors?.[0] ?? tAccount('addressDefaultFailed') });
        return;
      }

      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === id })),
      );
      setToast({ type: 'success', message: tAccount('addressDefaultSet') });
    } catch {
      setToast({ type: 'error', message: tAccount('addressDefaultFailed') });
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
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-fast active:scale-[0.98]"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {tAccount('addAddress')}
          </button>
        )}
      </div>

      {/* toast */}
      {toast && (
        <div
          className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm mb-5"
          style={{
            borderColor: toast.type === 'success'
              ? 'color-mix(in srgb, var(--color-primary) 40%, var(--color-border))'
              : 'color-mix(in srgb, var(--color-destructive) 40%, var(--color-border))',
            backgroundColor: toast.type === 'success'
              ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
              : 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
            color: toast.type === 'success' ? 'var(--color-primary)' : 'var(--color-destructive)',
          }}
        >
          {toast.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.message}
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

              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => openEdit(addr)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-fast hover-surface"
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
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-fast hover-surface disabled:opacity-60"
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
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-fast disabled:opacity-60"
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
  form: typeof EMPTY_FORM;
  setForm: (fn: typeof EMPTY_FORM | ((prev: typeof EMPTY_FORM) => typeof EMPTY_FORM)) => void;
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

  const fields: { key: keyof typeof form; label: string; required: boolean; placeholder?: string; colSpan?: number }[] = [
    { key: 'label', label: tAccount('addressLabelField'), required: false, placeholder: 'Home, Work…', colSpan: 1 },
    { key: 'fullName', label: tAccount('fullNameLabel'), required: true, colSpan: 1 },
    { key: 'phone', label: tAccount('phoneLabel'), required: false, placeholder: '+48 123 456 789', colSpan: 2 },
    { key: 'street', label: tAccount('streetLabel'), required: true, colSpan: 2 },
    { key: 'city', label: tAccount('cityLabel'), required: true, colSpan: 1 },
    { key: 'postalCode', label: tAccount('postalCodeLabel'), required: true, colSpan: 1 },
    { key: 'country', label: tAccount('countryLabel'), required: true, placeholder: 'PL', colSpan: 2 },
  ];

  return (
    <form
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
          className="rounded-lg p-1.5 transition-colors duration-fast hover-surface"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, required, placeholder, colSpan }) => (
          <div key={key} className={colSpan === 2 ? 'col-span-2' : ''}>
            <label htmlFor={`addr-${key}`} className="block text-xs font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>
              {label}
              {required && <span style={{ color: 'var(--color-destructive)' }}> *</span>}
            </label>
            <input
              id={`addr-${key}`}
              type="text"
              value={form[key] ?? ''}
              onChange={(e) => update(key, e.target.value)}
              required={required}
              placeholder={placeholder}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors duration-fast focus:ring-2"
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
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {isEdit ? tAccount('saveAddress') : tAccount('addAddress')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors duration-fast hover-surface"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
        >
          {tAccount('cancelAddress')}
        </button>
      </div>
    </form>
  );
}

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';

import { FormCard } from '@/components/FormCard';
import { PageHeader } from '@/components/PageHeader';
import { useLanguage } from '@/i18n';

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmation?: string;
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  autoComplete: 'current-password' | 'new-password';
  error?: string;
  hint?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
  showLabel: string;
  hideLabel: string;
}

function PasswordField({
  id,
  label,
  value,
  visible,
  autoComplete,
  error,
  hint,
  inputRef,
  onChange,
  onToggleVisibility,
  showLabel,
  hideLabel,
}: PasswordFieldProps) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : '']
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="min-h-12 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-3.5 pr-14 text-base text-slate-950 outline-none transition-[border-color,box-shadow] hover:border-slate-400 focus:border-[#169B45] focus:ring-2 focus:ring-[#169B45]/20"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex min-w-12 items-center justify-center rounded-r-lg text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#169B45]"
        >
          {visible
            ? <EyeOff aria-hidden="true" className="h-5 w-5" />
            : <Eye aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}

export default function SecurityPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState({ current: false, next: false, confirmation: false });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function focusServerError() {
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setServerError('');
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!currentPassword) errors.currentPassword = t('security.currentRequired');
    if (!newPassword) errors.newPassword = t('security.newRequired');
    else if (newPassword.length < 16) errors.newPassword = t('security.tooShort');
    else if (newPassword === currentPassword) errors.newPassword = t('security.unchanged');
    if (!confirmation) errors.confirmation = t('security.confirmationRequired');
    else if (newPassword !== confirmation) errors.confirmation = t('security.mismatch');
    return errors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const errors = validate();
    setFieldErrors(errors);
    setServerError('');

    if (errors.currentPassword) {
      currentPasswordRef.current?.focus();
      return;
    }
    if (errors.newPassword) {
      newPasswordRef.current?.focus();
      return;
    }
    if (errors.confirmation) {
      confirmationRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ currentPassword, newPassword, confirmation }),
      });
      const data = await response.json().catch(() => ({})) as {
        success?: boolean;
        code?: string;
      };

      if (response.ok && data.success === true) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmation('');
        router.replace('/login?passwordChanged=1');
        router.refresh();
        return;
      }

      if (response.status === 401 && data.code === 'CURRENT_PASSWORD_INVALID') {
        setCurrentPassword('');
        setFieldErrors({ currentPassword: t('security.incorrectCurrent') });
        setSubmitting(false);
        submittingRef.current = false;
        requestAnimationFrame(() => currentPasswordRef.current?.focus());
        return;
      }

      if (response.status === 401 || data.code === 'SESSION_CHANGED') {
        router.replace('/login?from=%2Fadmin%2Fsecurity');
        router.refresh();
        return;
      }

      const message = data.code === 'PASSWORD_TOO_SHORT'
        ? t('security.tooShort')
        : data.code === 'PASSWORD_MISMATCH'
          ? t('security.mismatch')
          : data.code === 'PASSWORD_UNCHANGED'
            ? t('security.unchanged')
            : response.status === 429
              ? t('security.tooManyAttempts')
              : t('security.serviceUnavailable');

      setServerError(message);
      setSubmitting(false);
      submittingRef.current = false;
      focusServerError();
    } catch {
      setServerError(t('security.serviceUnavailable'));
      setSubmitting(false);
      submittingRef.current = false;
      focusServerError();
    }
  }

  return (
    <div>
      <PageHeader title={t('security.title')} description={t('security.description')} />

      <div className="max-w-2xl space-y-5">
        <div className="flex gap-3 rounded-xl border border-green-200 bg-green-50/70 px-4 py-3.5 text-sm text-green-950">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
          <div>
            <p className="font-semibold">{t('security.sessionNoticeTitle')}</p>
            <p className="mt-0.5 leading-6 text-green-900/80">{t('security.sessionNotice')}</p>
          </div>
        </div>

        <FormCard
          title={t('security.cardTitle')}
          description={t('security.cardDescription')}
        >
          <form
            method="post"
            onSubmit={handleSubmit}
            noValidate
            aria-busy={submitting}
            className="space-y-5"
          >
            {serverError && (
              <div
                ref={errorRef}
                role="alert"
                aria-live="assertive"
                tabIndex={-1}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-900 outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
              >
                {serverError}
              </div>
            )}

            <PasswordField
              id="currentPassword"
              label={t('security.currentPassword')}
              value={currentPassword}
              visible={visible.current}
              autoComplete="current-password"
              error={fieldErrors.currentPassword}
              inputRef={currentPasswordRef}
              onChange={(value) => {
                setCurrentPassword(value);
                clearFieldError('currentPassword');
              }}
              onToggleVisibility={() => setVisible((current) => ({
                ...current,
                current: !current.current,
              }))}
              showLabel={t('security.showPassword')}
              hideLabel={t('security.hidePassword')}
            />

            <PasswordField
              id="newPassword"
              label={t('security.newPassword')}
              value={newPassword}
              visible={visible.next}
              autoComplete="new-password"
              error={fieldErrors.newPassword}
              hint={t('security.minimumLength')}
              inputRef={newPasswordRef}
              onChange={(value) => {
                setNewPassword(value);
                clearFieldError('newPassword');
              }}
              onToggleVisibility={() => setVisible((current) => ({
                ...current,
                next: !current.next,
              }))}
              showLabel={t('security.showPassword')}
              hideLabel={t('security.hidePassword')}
            />

            <PasswordField
              id="confirmation"
              label={t('security.confirmPassword')}
              value={confirmation}
              visible={visible.confirmation}
              autoComplete="new-password"
              error={fieldErrors.confirmation}
              inputRef={confirmationRef}
              onChange={(value) => {
                setConfirmation(value);
                clearFieldError('confirmation');
              }}
              onToggleVisibility={() => setVisible((current) => ({
                ...current,
                confirmation: !current.confirmation,
              }))}
              showLabel={t('security.showPassword')}
              hideLabel={t('security.hidePassword')}
            />

            <div className="border-t border-slate-100 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition-[background-color,box-shadow,transform] hover:bg-slate-800 hover:shadow-md active:translate-y-px disabled:cursor-wait disabled:bg-slate-400 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 sm:w-auto"
              >
                {submitting
                  ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  : <LockKeyhole aria-hidden="true" className="h-4 w-4" />}
                {submitting ? t('security.submitting') : t('security.submit')}
              </button>
            </div>
          </form>
        </FormCard>
      </div>
    </div>
  );
}

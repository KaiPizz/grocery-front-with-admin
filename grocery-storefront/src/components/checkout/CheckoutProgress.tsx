'use client';

import { useTranslations } from 'next-intl';
import { Check, ChevronDown, Lock } from 'lucide-react';
import type { CheckoutStep } from '@/types/checkout';

const STEPS: CheckoutStep[] = ['delivery', 'shipping', 'payment', 'review'];

interface CheckoutSectionProps {
  step: CheckoutStep;
  currentStep: CheckoutStep;
  completedSteps: Set<CheckoutStep>;
  onToggle: (step: CheckoutStep) => void;
  summaryContent?: React.ReactNode;
  children: React.ReactNode;
}

export function CheckoutSection({
  step,
  currentStep,
  completedSteps,
  onToggle,
  summaryContent,
  children,
}: CheckoutSectionProps) {
  const t = useTranslations('checkout');

  const stepLabels: Record<CheckoutStep, string> = {
    delivery: t('stepDelivery'),
    shipping: t('stepShipping'),
    payment: t('stepPayment'),
    review: t('stepReview'),
  };

  const stepIndex = STEPS.indexOf(step);
  const currentIndex = STEPS.indexOf(currentStep);
  const isActive = step === currentStep;
  const isCompleted = completedSteps.has(step);
  const isClickable = isCompleted || stepIndex <= currentIndex;
  const isLocked = !isClickable;

  return (
    <section
      className="rounded-2xl border overflow-hidden transition-all duration-300"
      style={{
        borderColor: isActive
          ? 'var(--color-primary)'
          : 'var(--color-border)',
        backgroundColor: 'var(--color-card)',
        opacity: isLocked ? 0.55 : 1,
      }}
      data-testid={`checkout-section-${step}`}
    >
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => isClickable && onToggle(step)}
        disabled={isLocked}
        className="w-full flex items-center gap-3 px-4 sm:px-5 md:px-6 py-4 text-left transition-colors duration-200 disabled:cursor-not-allowed"
        style={{
          backgroundColor: isActive
            ? 'color-mix(in srgb, var(--color-primary) 5%, transparent)'
            : 'transparent',
        }}
        aria-expanded={isActive}
        aria-controls={`checkout-panel-${step}`}
      >
        {/* Step Number / Check / Lock */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-200"
          style={{
            backgroundColor: isCompleted
              ? 'var(--color-primary)'
              : isActive
                ? 'var(--color-primary)'
                : 'var(--color-muted)',
            color: isCompleted || isActive ? 'white' : 'var(--color-muted-foreground)',
          }}
        >
          {isCompleted && !isActive ? (
            <Check className="w-4 h-4" aria-hidden="true" />
          ) : isLocked ? (
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            stepIndex + 1
          )}
        </div>

        {/* Label + inline summary */}
        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-semibold block"
            style={{
              color: isActive || isCompleted ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
            }}
          >
            {stepLabels[step]}
          </span>

          {/* Completed summary shown when collapsed */}
          {isCompleted && !isActive && summaryContent && (
            <div
              className="text-xs mt-0.5 truncate"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              {summaryContent}
            </div>
          )}
        </div>

        {/* Edit badge / Chevron */}
        {isCompleted && !isActive ? (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-lg shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              color: 'var(--color-primary)',
            }}
          >
            {t('backStep') || 'Edit'}
          </span>
        ) : (
          <ChevronDown
            className="w-4 h-4 shrink-0 transition-transform duration-300"
            style={{
              color: 'var(--color-muted-foreground)',
              transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
            aria-hidden="true"
          />
        )}
      </button>

      {/* Accordion Panel */}
      <div
        id={`checkout-panel-${step}`}
        className="transition-all duration-300 ease-in-out"
        aria-hidden={!isActive}
        inert={!isActive ? true : undefined}
        style={{
          maxHeight: isActive ? '2000px' : '0px',
          opacity: isActive ? 1 : 0,
          overflow: 'hidden',
        }}
      >
        <div className="px-4 sm:px-5 md:px-6 pb-5 pt-1">
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * Overall progress bar (compact) - shown at the top of the checkout page.
 */
interface CheckoutProgressBarProps {
  currentStep: CheckoutStep;
  completedSteps: Set<CheckoutStep>;
}

export function CheckoutProgressBar({ currentStep, completedSteps }: CheckoutProgressBarProps) {
  const currentIndex = STEPS.indexOf(currentStep);
  const completedCount = Array.from(completedSteps).length;
  const progressPercent = ((currentIndex + 1) / STEPS.length) * 100;

  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center justify-between text-xs mb-2">
        <span
          className="font-medium"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          Step {currentIndex + 1} of {STEPS.length}
        </span>
        <span
          className="font-medium"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          {completedCount} completed
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: 'var(--color-muted)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: 'var(--color-primary)',
          }}
        />
      </div>
    </div>
  );
}

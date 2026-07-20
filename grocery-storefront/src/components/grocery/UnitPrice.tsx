import { formatPrice } from '@/lib/utils';
import { getLocalizedUnitLabel } from '@/lib/catalog-display-localization';

interface UnitPriceProps {
  pricePerUnit: number | null | undefined;
  unitOfMeasure: string | null | undefined;
  currency: string;
  locale: string;
  className?: string;
}

/**
 * Per-unit price display for grocery products. Renders e.g. `6,99 zł / l`,
 * `17,00 zł / kg`. Returns null when either pricePerUnit or unitOfMeasure is
 * missing — matches the EU consumer-protection requirement (Reg. 1169/2011)
 * that prepackaged foods carry a unit-price indication.
 *
 * Intentionally does NOT gate on `sellByWeight`: the unit price is mandatory
 * for EU prepackaged grocery whether or not the SKU is sold by weight.
 *
 * Caller controls sizing via `className` (e.g. `text-[10px]` on cards,
 * `text-sm` on the product detail page).
 */
export function UnitPrice({ pricePerUnit, unitOfMeasure, currency, locale, className }: UnitPriceProps) {
  if (pricePerUnit == null || !unitOfMeasure) return null;
  return (
    <span
      className={className ?? 'text-xs'}
      style={{ color: 'var(--color-muted-foreground)' }}
      data-testid="unit-price"
    >
      {formatPrice(pricePerUnit, currency)} / {getLocalizedUnitLabel(unitOfMeasure, locale)}
    </span>
  );
}

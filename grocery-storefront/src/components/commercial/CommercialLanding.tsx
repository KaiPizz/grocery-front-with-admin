/* eslint-disable @next/next/no-img-element -- Runtime-configured commercial media can use arbitrary URLs until the production media loader policy is defined. */

import { ArrowRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { getImageSrc } from '@/lib/utils';
import type { CommercialCollection } from '@/types/storefront-config';

interface CommercialLandingProps {
  collection: CommercialCollection;
  title?: string;
}

export function CommercialLanding({ collection, title }: CommercialLandingProps) {
  const heroImageSrc = getImageSrc(collection.heroImageUrl);
  const tiles = collection.tiles
    .filter((tile) => tile.enabled)
    .sort((a, b) => a.order - b.order);
  const heading = title ?? collection.title;

  return (
    <>
      <section
        className="relative isolate overflow-hidden"
        style={{ backgroundColor: 'var(--color-accent)' }}
      >
        {heroImageSrc && (
          <img
            src={heroImageSrc}
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
        )}
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundColor: heroImageSrc
              ? 'color-mix(in srgb, var(--color-background) 38%, transparent)'
              : 'transparent',
          }}
          aria-hidden="true"
        />
        <div className="container-grocery flex min-h-[260px] flex-col justify-end py-10 md:min-h-[340px] md:py-14">
          <h1 className="heading-display max-w-3xl text-3xl md:text-5xl" style={{ color: 'var(--color-foreground)' }}>
            {heading}
          </h1>
          {collection.subtitle && (
            <p className="mt-4 max-w-2xl text-sm md:text-base" style={{ color: 'var(--color-foreground)' }}>
              {collection.subtitle}
            </p>
          )}
        </div>
      </section>

      <section className="container-grocery py-8 md:py-12">
        {tiles.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tiles.map((tile) => {
              const tileImageSrc = getImageSrc(tile.imageUrl);

              return (
                <Link
                  key={tile.id}
                  href={tile.href}
                  className="group overflow-hidden rounded-lg border transition-shadow duration-fast hover:shadow-md"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
                >
                  {tileImageSrc && (
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={tileImageSrc}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-normal ease-out group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
                        {tile.title}
                      </h2>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 transition-transform duration-fast group-hover:translate-x-0.5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                    </div>
                    {tile.description && (
                      <p className="mt-2 text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
                        {tile.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border px-5 py-8 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
              No enabled collection tiles.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

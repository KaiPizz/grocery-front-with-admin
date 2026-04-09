'use client';

import { HeroBanner } from '@/components/blocks/HeroBanner';
import { HorizontalBanner } from '@/components/blocks/HorizontalBanner';
import { GridBanner } from '@/components/blocks/GridBanner';
import { RoundGridBanner } from '@/components/blocks/RoundGridBanner';
import { SidebarBanner } from '@/components/blocks/SidebarBanner';
import { SmallStickyBanner } from '@/components/blocks/SmallStickyBanner';
import type { BannerBlock } from '@/types/storefront-config';

interface BlockRendererProps {
  block: BannerBlock;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  if (!block.enabled) return null;

  switch (block.type) {
    case 'hero':
      return <HeroBanner block={block} />;
    case 'horizontal':
      return <HorizontalBanner block={block} />;
    case 'grid':
      return <GridBanner block={block} />;
    case 'round_grid':
      return <RoundGridBanner block={block} />;
    case 'sidebar':
      return <SidebarBanner block={block} />;
    case 'small_sticky':
      return <SmallStickyBanner block={block} />;
    default:
      return null;
  }
}

export interface PromotionCampaign {
  id: string;
  titleLo: string;
  titleEn: string;
  badge: string;
  badgeColor: string;
  type: 'event' | 'discount' | 'package' | 'special';
  applicableModels: ('AVATR 11' | 'AVATR 12' | 'AVATR 07')[];
  period: string;
  eventLocation?: string;
  highlightBenefit: string;
  freeGifts: string[];
  discountAmountUSD?: number;
  specialInterestRate?: string;
  descriptionLo: string;
  imageUrl: string;
  featuredVin?: string;
}

export const ACTIVE_PROMOTIONS: PromotionCampaign[] = [];

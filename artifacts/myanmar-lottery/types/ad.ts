export type AdPlacement = "home" | "search" | "both";

export interface AppAd {
  id?: string;
  titleMm: string;
  titleEn?: string;
  imageUrl: string;
  targetUrl: string;
  placement: AdPlacement;
  isActive: boolean;
  order: number;
  clickCount?: number;
  lastClickedAt?: string;
  startAt?: string;
  endAt?: string;
  createdAt?: number;
  updatedAt?: number;
}

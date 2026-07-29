import type { LucideIcon } from 'lucide-react';
import { ChartNoAxesCombined, Cloud, Palette } from 'lucide-react';

export type MembershipTier = 'free' | 'plus';

export interface MembershipBenefit {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface MembershipPlan {
  id: MembershipTier;
  name: string;
  status: 'available' | 'coming-soon';
  benefits: MembershipBenefit[];
}

/**
 * Membership is intentionally presentation-only for the local-first release.
 * A future account service can map its entitlement response onto this stable
 * tier id without coupling the focus timer or IndexedDB data to a provider.
 */
export const membershipPlans: MembershipPlan[] = [
  {
    id: 'free',
    name: '栖时 Free',
    status: 'available',
    benefits: [],
  },
  {
    id: 'plus',
    name: '栖时 Plus',
    status: 'coming-soon',
    benefits: [
      {
        title: '跨设备同步',
        description: '任务、偏好与专注轨迹安全同步',
        icon: Cloud,
      },
      {
        title: '限定疗愈场景',
        description: '更多季节动景与细腻声音空间',
        icon: Palette,
      },
      {
        title: '进阶专注报告',
        description: '周报、月报与长期节律洞察',
        icon: ChartNoAxesCombined,
      },
    ],
  },
];

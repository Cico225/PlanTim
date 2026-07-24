import { IconType } from 'react-icons';
import {
  FiPackage,
  FiTrendingUp,
  FiDollarSign,
  FiShoppingBag,
  FiVolume2,
  FiUsers,
  FiStar,
} from 'react-icons/fi';

export type PlanikaSubmoduleId = 'sales' | 'finance' | 'retail' | 'marketing' | 'hr' | 'club';

export interface PlanikaSubmoduleDefinition {
  id: PlanikaSubmoduleId;
  nameKey: string;
  descriptionKey: string;
  route: string;
  icon: IconType;
  color: string;
  actions: string[];
}

export const PLANIKA_SUBMODULES: PlanikaSubmoduleDefinition[] = [
  {
    id: 'sales',
    nameKey: 'planika.sales',
    descriptionKey: 'planikaDescriptions.sales',
    route: '/planika/sales',
    icon: FiTrendingUp,
    color: 'orange',
    actions: ['leadManagement', 'productSync', 'pricingRules'],
  },
  {
    id: 'finance',
    nameKey: 'planika.finance',
    descriptionKey: 'planikaDescriptions.finance',
    route: '/planika/finance',
    icon: FiDollarSign,
    color: 'teal',
    actions: ['krediti', 'reporting', 'expenseControl'],
  },
  {
    id: 'retail',
    nameKey: 'planika.retail',
    descriptionKey: 'planikaDescriptions.retail',
    route: '/planika/retail',
    icon: FiShoppingBag,
    color: 'pink',
    actions: ['inventory', 'pricing', 'posMonitoring'],
  },
  {
    id: 'marketing',
    nameKey: 'planika.marketing',
    descriptionKey: 'planikaDescriptions.marketing',
    route: '/planika/marketing',
    icon: FiVolume2,
    color: 'purple',
    actions: ['campaignBuilder', 'audienceSegmentation', 'contentHub'],
  },
  {
    id: 'hr',
    nameKey: 'planika.hr',
    descriptionKey: 'planikaDescriptions.hr',
    route: '/planika/hr',
    icon: FiUsers,
    color: 'green',
    actions: ['talentPool', 'shiftPlanning', 'performanceReviews'],
  },
  {
    id: 'club',
    nameKey: 'planika.club',
    descriptionKey: 'planikaDescriptions.club',
    route: '/planika/club',
    icon: FiStar,
    color: 'yellow',
    actions: ['loyaltyCampaigns', 'rewards', 'clubAnalytics'],
  },
];

export const PLANIKA_OVERVIEW_CARD = {
  route: '/planika',
  icon: FiPackage,
  color: 'orange',
};



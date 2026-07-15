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
  highlights: Array<{ label: string; value: string; trend?: string }>;
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
    highlights: [
      { label: 'KPI', value: '+18%', trend: 'growth' },
      { label: 'Aktivni ugovori', value: '126' },
    ],
    actions: ['leadManagement', 'productSync', 'pricingRules'],
  },
  {
    id: 'finance',
    nameKey: 'planika.finance',
    descriptionKey: 'planikaDescriptions.finance',
    route: '/planika/finance/krediti',
    icon: FiDollarSign,
    color: 'teal',
    highlights: [
      { label: 'Budžet', value: '3.2M €' },
      { label: 'Računi', value: '54' },
    ],
    actions: ['krediti', 'reporting', 'expenseControl'],
  },
  {
    id: 'retail',
    nameKey: 'planika.retail',
    descriptionKey: 'planikaDescriptions.retail',
    route: '/planika/retail',
    icon: FiShoppingBag,
    color: 'pink',
    highlights: [
      { label: 'Prodavnice', value: '42' },
      { label: 'POS uređaji', value: '128' },
    ],
    actions: ['inventory', 'pricing', 'posMonitoring'],
  },
  {
    id: 'marketing',
    nameKey: 'planika.marketing',
    descriptionKey: 'planikaDescriptions.marketing',
    route: '/planika/marketing',
    icon: FiVolume2,
    color: 'purple',
    highlights: [
      { label: 'Kampanje', value: '12 aktivnih' },
      { label: 'ROI', value: '142%' },
    ],
    actions: ['campaignBuilder', 'audienceSegmentation', 'contentHub'],
  },
  {
    id: 'hr',
    nameKey: 'planika.hr',
    descriptionKey: 'planikaDescriptions.hr',
    route: '/planika/hr',
    icon: FiUsers,
    color: 'green',
    highlights: [
      { label: 'Zaposleni', value: '640' },
      { label: 'Otvorene pozicije', value: '18' },
    ],
    actions: ['talentPool', 'shiftPlanning', 'performanceReviews'],
  },
  {
    id: 'club',
    nameKey: 'planika.club',
    descriptionKey: 'planikaDescriptions.club',
    route: '/planika/club',
    icon: FiStar,
    color: 'yellow',
    highlights: [
      { label: 'Članova', value: '52k' },
      { label: 'Aktivne kartice', value: '91%' },
    ],
    actions: ['loyaltyCampaigns', 'rewards', 'clubAnalytics'],
  },
];

export const PLANIKA_OVERVIEW_CARD = {
  route: '/planika',
  icon: FiPackage,
  color: 'orange',
};



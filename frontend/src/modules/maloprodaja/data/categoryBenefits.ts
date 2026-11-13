import {
  AlertCircle,
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  Gift,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type CategoryLetter = 'A' | 'B' | 'C';

export interface CategoryBenefitItem {
  text: string;
  icon: LucideIcon;
}

export interface CategoryBenefitsInfo {
  category: CategoryLetter;
  title: string;
  description: string;
  benefits: CategoryBenefitItem[];
  colorScheme: {
    bg: string;
    bgLight: string;
    bgDark: string;
    border: string;
    text: string;
    icon: string;
    gradient: string;
    hero: string;
    badge: string;
  };
}

const sellerColors = {
  C: {
    bg: 'bg-rose-500',
    bgLight: 'bg-rose-50 dark:bg-rose-900/20',
    bgDark: 'bg-rose-100 dark:bg-rose-900/30',
    border: 'border-rose-300 dark:border-rose-700',
    text: 'text-rose-700 dark:text-rose-300',
    icon: 'text-rose-600 dark:text-rose-400',
    gradient: 'from-rose-500 to-rose-600',
    hero: 'from-rose-500 via-rose-500 to-orange-400',
    badge: 'text-rose-600',
  },
  B: {
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-50 dark:bg-amber-900/20',
    bgDark: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-500 to-amber-600',
    hero: 'from-amber-500 via-amber-500 to-yellow-400',
    badge: 'text-amber-600',
  },
  A: {
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
    bgDark: 'bg-emerald-100 dark:bg-emerald-900/30',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: 'text-emerald-600 dark:text-emerald-400',
    gradient: 'from-emerald-500 to-emerald-600',
    hero: 'from-emerald-500 via-teal-500 to-cyan-400',
    badge: 'text-emerald-600',
  },
} as const;

const managerColors = sellerColors;

export const SELLER_CATEGORY_BENEFITS: CategoryBenefitsInfo[] = [
  {
    category: 'C',
    title: 'Prodavač kategorija C',
    description: 'Prodavač čiji učinak ne zadovoljava standard',
    colorScheme: sellerColors.C,
    benefits: [
      { text: 'Osnovna plaća', icon: Users },
      { text: 'Osnovni uposlenički popust', icon: Gift },
      { text: 'Dodatni treninzi', icon: BookOpen },
      { text: 'Plan poboljšanja učinka', icon: TrendingUp },
      { text: 'Osnovni raspored smjena', icon: Calendar },
    ],
  },
  {
    category: 'B',
    title: 'Prodavač kategorija B',
    description: 'Prodavači koji stabilno ispunjavaju očekivanja',
    colorScheme: sellerColors.B,
    benefits: [
      { text: '+10% osnovna plaća', icon: TrendingUp },
      { text: 'Osnovni uposlenički popust', icon: Gift },
      { text: 'Mogućnost učešća u radionicama i kolekcijama', icon: Award },
      { text: 'Mogućnost unapređenja u poslovođu', icon: Briefcase },
    ],
  },
  {
    category: 'A',
    title: 'Prodavač kategorija A',
    description: 'Prodavači koji kontinuirano ostvaruju vrhunske rezultate',
    colorScheme: sellerColors.A,
    benefits: [
      { text: '+20% osnovna plaća', icon: TrendingUp },
      { text: 'Uposlenički popust (3 para po sezoni)', icon: Gift },
      { text: 'Petodnevna radna sedmica kvartalno', icon: Calendar },
      { text: 'Mogućnost unapređenja u poslovođu', icon: Briefcase },
    ],
  },
];

export const MANAGER_CATEGORY_BENEFITS: CategoryBenefitsInfo[] = [
  {
    category: 'C',
    title: 'Menadžeri prodavnica kategorija C',
    description: 'koji ne ispunjavaju očekivanja',
    colorScheme: managerColors.C,
    benefits: [
      { text: 'Osnovna plaća', icon: Users },
      { text: 'Uposlenički popust (3 para po sezoni)', icon: Gift },
      { text: 'Petodnevna radna sedmica kvartalno', icon: Calendar },
      { text: 'Plan poboljšanja učinka', icon: TrendingUp },
      { text: 'Pristup edukacijama i treninzima', icon: BookOpen },
    ],
  },
  {
    category: 'B',
    title: 'Menadžeri prodavnica kategorija B',
    description: 'ostvaruju stabilne rezultate',
    colorScheme: managerColors.B,
    benefits: [
      { text: '+10% osnovna plaća', icon: TrendingUp },
      { text: 'Uposlenički popust (3 para po sezoni)', icon: Gift },
      { text: 'Petodnevna radna sedmica kvartalno', icon: Calendar },
      { text: 'Plan poboljšanja učinka', icon: TrendingUp },
      { text: 'Pristup edukacijama i treninzima', icon: BookOpen },
      { text: 'Kolekcije i ankete', icon: Award },
    ],
  },
  {
    category: 'A',
    title: 'Menadžeri prodavnica kategorija A',
    description: 'dosljedno postižu visoke rezultate',
    colorScheme: managerColors.A,
    benefits: [
      { text: '+20% osnovna plaća', icon: TrendingUp },
      { text: 'Uposlenički popust (4 para po sezoni)', icon: Gift },
      { text: 'Petodnevna radna sedmica mjesečno', icon: Calendar },
      { text: 'Poklon vaucher', icon: Gift },
      { text: 'Mogućnost učešća u edukacijama kao mentor', icon: Users },
    ],
  },
];

export function getCategoryBenefits(
  positionType: 'seller' | 'manager' | string,
  category: string | null | undefined,
): CategoryBenefitsInfo | null {
  const letter = (category ?? '').toUpperCase() as CategoryLetter;
  if (letter !== 'A' && letter !== 'B' && letter !== 'C') return null;
  const list = positionType === 'manager' ? MANAGER_CATEGORY_BENEFITS : SELLER_CATEGORY_BENEFITS;
  return list.find((c) => c.category === letter) ?? null;
}

export function categoryIcon(letter: CategoryLetter): LucideIcon {
  if (letter === 'A') return Award;
  if (letter === 'B') return TrendingUp;
  return AlertCircle;
}

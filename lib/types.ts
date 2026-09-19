export interface PersonBusiness {
  id: string;
  businessName: string;
  businessNameGu: string;
  category: "textiles" | "agriculture" | "finance" | "manufacturing" | "construction" | "it-services" | "jewelry" | "food" | "legal" | "other" | string;
  categoryLabelEn: string;
  categoryLabelGu: string;
  images?: string;
  description: string;
  descriptionGu: string;
  personName: string;
  personNameGu: string;
  personName2?: string;
  personName2Gu?: string;
  personPhoto?: string;
  email?: string;
  website?: string;
  address?: string;
  addressGu?: string;
  city: string;
  cityGu: string;
  state?: string;
  stateGu?: string;
  mapUrl?: string;
  phone: string;
  phone2?: string;
  whatsapp: string;
  comment?: string;
  services?: string[];
  servicesGu?: string[];
  village?: string;
  villageGu?: string;
  establishedYear?: string;
  isActive?: boolean;
  isApproved?: boolean;
  createdAt?: string | Date;
}

export interface BusinessCategory {
  id: string;
  nameEn: string;
  nameGu: string;
  icon: string;
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { id: "all", nameEn: "All Businesses", nameGu: "બધા વ્યવસાયો", icon: "🏢" },
  { id: "textiles", nameEn: "Textiles & Garments", nameGu: "કાપડ & ગારમેન્ટ્સ", icon: "🧵" },
  { id: "agriculture", nameEn: "Agriculture & Machinery", nameGu: "ખેતીવાડી & સાધનો", icon: "🌾" },
  { id: "finance", nameEn: "Finance & Insurance", nameGu: "ફાઇનાન્સ & ઇન્સ્યોરન્સ", icon: "💰" },
  { id: "manufacturing", nameEn: "Manufacturing & Engineering", nameGu: "ઉદ્યોગ & એન્જિનિયરિંગ", icon: "⚙️" },
  { id: "construction", nameEn: "Construction & Developers", nameGu: "બાંધકામ & ડેવલપર્સ", icon: "🏗️" },
  { id: "it-services", nameEn: "IT & Digital Services", nameGu: "આઈટી & સોફ્ટવેર", icon: "💻" },
  { id: "jewelry", nameEn: "Diamonds & Jewelry", nameGu: "હીરા & જ્વેલરી", icon: "💎" },
  { id: "food", nameEn: "Restaurant & Food", nameGu: "રેસ્ટોરન્ટ & ફૂડ", icon: "🍽️" },
  { id: "legal", nameEn: "Advocate & Legal", nameGu: "એડવોકેટ & સલાહકાર", icon: "⚖️" },
  { id: "other", nameEn: "Other Services", nameGu: "અન્ય સેવાઓ", icon: "📦" },
];

export interface EventScheduleItem {
  timeGu: string;
  timeEn?: string;
  labelGu: string;
  labelEn?: string;
}

export interface EventItem {
  id: string;
  titleEn: string;
  titleGu: string;
  dateEn: string;
  dateGu: string;
  timeEn?: string;
  timeGu?: string;
  locationEn: string;
  locationGu: string;
  descriptionEn: string;
  descriptionGu: string;
  badgeEn?: string;
  badgeGu?: string;
  schedule?: EventScheduleItem[];
  isActive?: boolean;
  order?: number;
}

export interface AdminUser {
  username: string;
  name: string;
  role: "super_admin" | "admin" | "moderator";
}

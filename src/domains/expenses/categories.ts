import { Car, CircleDollarSign, Home, Plane, ShieldCheck, ShoppingBag, Shirt, Ticket, Utensils, type LucideIcon } from 'lucide-react';
import type { ExpenseCategory, PaymentMethod } from '@/lib/database.types';

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  meals: 'Meals',
  transport: 'Transport',
  clothes: 'Clothes',
  shopping: 'Shopping',
  activities: 'Activities',
  pg_rent: 'PG Rent',
  flight: 'Flight',
  visa: 'Visa',
  other: 'Other',
};

/** Fixed per category so a category keeps its colour across every chart and period. */
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  meals: '#A83CFF',
  transport: '#52D6A0',
  clothes: '#E8B45A',
  shopping: '#F06A83',
  activities: '#5AB8FF',
  pg_rent: '#B47CFF',
  flight: '#FF9F5A',
  visa: '#7DE0E0',
  other: '#9B8FA3',
};

export const PAYMENT_LABELS: Record<PaymentMethod | 'unspecified', string> = {
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
  unspecified: 'Not specified',
};

export const PAYMENT_COLORS: Record<PaymentMethod | 'unspecified', string> = {
  cash: '#52D6A0',
  card: '#A83CFF',
  other: '#E8B45A',
  unspecified: '#806E88',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  meals: Utensils,
  transport: Car,
  clothes: Shirt,
  shopping: ShoppingBag,
  activities: Ticket,
  pg_rent: Home,
  flight: Plane,
  visa: ShieldCheck,
  other: CircleDollarSign,
};

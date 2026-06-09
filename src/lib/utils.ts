import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatShortAddress(address: string): string {
  if (typeof address !== 'string' || !address) return '';
  const parts = address.split(',').map(p => p.trim());
  if (parts.length <= 1) return address;

  const country = parts[parts.length - 1];
  
  // Heuristic to find city:
  // 1. Filter out purely numeric parts (zip codes)
  // 2. Filter out known "fillers"
  const fillers = ['france métropolitaine', 'maroc', 'france'].map(f => f.toLowerCase());
  const cleanParts = parts.filter(p => {
    const lp = p.toLowerCase();
    const isZip = /^\d{5,8}$/.test(p) || /^\d{2,3} \d{3}$/.test(p);
    return !isZip && !fillers.includes(lp);
  });

  if (cleanParts.length === 0) return country;
  
  // Usually the last part of cleanParts (before country was removed or if it stayed) is the region or city
  // Let's try to take the last remaining part as city if it's not the country itself
  const city = cleanParts[cleanParts.length - 1];
  
  // If city is same as country, and more parts exist, take one before
  if (city.toLowerCase() === country.toLowerCase() && cleanParts.length > 1) {
    return `${cleanParts[cleanParts.length - 2]}, ${country}`;
  }

  return `${city}, ${country}`;
}

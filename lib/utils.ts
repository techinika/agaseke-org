import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function brandColorValues(hex: string): { primary: string; primaryForeground: string } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const primaryForeground = luminance > 0.5 ? '#000000' : '#ffffff';

  return { primary: `#${cleanHex}`, primaryForeground };
}

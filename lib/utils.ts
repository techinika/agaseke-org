import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hexToOklch(hex: string): { primary: string; primaryForeground: string } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const bVal = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const rLin = toLinear(r);
  const gLin = toLinear(g);
  const bLin = toLinear(bVal);

  const l = 0.4124564 * rLin + 0.3575761 * gLin + 0.1804375 * bLin;
  const m = 0.2126729 * rLin + 0.7151522 * gLin + 0.072175 * bLin;
  const s = 0.0193339 * rLin + 0.119192 * gLin + 0.9503041 * bLin;

  const l_ = l > 0.008856 ? Math.pow(l, 1/3) : 7.787 * l + 16/116;
  const m_ = m > 0.008856 ? Math.pow(m, 1/3) : 7.787 * m + 16/116;
  const s_ = s > 0.008856 ? Math.pow(s, 1/3) : 7.787 * s + 16/116;

  const L = 116 * m_ - 16;
  const a = 500 * (l_ - m_);
  const bOklch = 200 * (m_ - s_);

  const L_o = L;
  const C = Math.sqrt(a * a + bOklch * bOklch);
  const h = Math.atan2(bOklch, a) * 180 / Math.PI;

  const primaryOklch = `oklch(${L_o.toFixed(4)} ${C.toFixed(4)} ${h.toFixed(2)})`;

  const luminance = 0.299 * r + 0.587 * g + 0.114 * bVal;
  const primaryForeground = luminance > 0.5 ? '#000000' : '#ffffff';

  return { primary: primaryOklch, primaryForeground };
}

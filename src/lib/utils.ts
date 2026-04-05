import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Утилита объединяет обычные className и корректно сливает Tailwind-классы.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const generateOTP = () => {
    // Generates OTP in the format: AS0E-321-0E
    const letters = () => Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
    const digits = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
    const part1 = letters() + digits(2); // e.g. AS0E
    const part2 = digits(3);             // e.g. 321
    const part3 = digits(1) + letters(); // e.g. 0E
    return `${part1}-${part2}-${part3}`;
  };
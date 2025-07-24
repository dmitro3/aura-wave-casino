import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Security validation functions
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  // Remove HTML tags and dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .trim();
}

export function validateBetAmount(amount: string | number): { isValid: boolean; sanitized: number; error?: string } {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return { isValid: false, sanitized: 0, error: 'Invalid number format' };
  }
  
  if (num <= 0) {
    return { isValid: false, sanitized: 0, error: 'Bet amount must be greater than 0' };
  }
  
  if (num > 1000) {
    return { isValid: false, sanitized: 0, error: 'Maximum bet amount is $1,000' };
  }
  
  // Ensure max 2 decimal places
  const sanitized = Math.round(num * 100) / 100;
  
  return { isValid: true, sanitized };
}

export function validateUsername(username: string): { isValid: boolean; sanitized: string; error?: string } {
  if (!username) {
    return { isValid: false, sanitized: '', error: 'Username is required' };
  }
  
  const sanitized = sanitizeString(username);
  
  if (sanitized.length < 3) {
    return { isValid: false, sanitized, error: 'Username must be at least 3 characters' };
  }
  
  if (sanitized.length > 20) {
    return { isValid: false, sanitized, error: 'Username must be 20 characters or less' };
  }
  
  // Only allow alphanumeric and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(sanitized)) {
    return { isValid: false, sanitized, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  // Check for reserved usernames
  const reserved = ['admin', 'moderator', 'system', 'null', 'undefined', 'test'];
  if (reserved.includes(sanitized.toLowerCase())) {
    return { isValid: false, sanitized, error: 'This username is reserved' };
  }
  
  return { isValid: true, sanitized };
}

export function validateEmail(email: string): { isValid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeString(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, sanitized, error: 'Invalid email format' };
  }
  
  if (sanitized.length > 254) {
    return { isValid: false, sanitized, error: 'Email is too long' };
  }
  
  return { isValid: true, sanitized };
}

export function validateChatMessage(message: string): { isValid: boolean; sanitized: string; error?: string } {
  if (!message) {
    return { isValid: false, sanitized: '', error: 'Message cannot be empty' };
  }
  
  const sanitized = sanitizeString(message);
  
  if (sanitized.length > 200) {
    return { isValid: false, sanitized, error: 'Message is too long (max 200 characters)' };
  }
  
  if (sanitized.trim().length === 0) {
    return { isValid: false, sanitized, error: 'Message cannot be empty' };
  }
  
  return { isValid: true, sanitized };
}

export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long (max 128 characters)' };
  }
  
  // Check for at least one uppercase, lowercase, and number
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter, lowercase letter, and number' };
  }
  
  return { isValid: true };
}

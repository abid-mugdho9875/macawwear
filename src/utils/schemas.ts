import { z } from "zod";

/**
 * Shared validation schemas — used by both the browser (for inline form
 * feedback) and the Netlify Function (for authoritative validation).
 *
 * Phone numbers are validated as digits, spaces, dashes, parentheses,
 * and an optional leading `+`. Length is bounded to 8–20 characters.
 */
const phoneRegex = /^\+?[0-9\s\-()]{8,20}$/;

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(120, "Name is too long."),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email.")
    .email("Please enter a valid email address."),
  phone: z
    .string()
    .trim()
    .min(8, "Please enter a valid phone number.")
    .max(20, "Phone number is too long.")
    .regex(phoneRegex, "Please enter a valid phone number."),
  address: z
    .string()
    .trim()
    .min(5, "Please enter your full delivery address.")
    .max(500, "Address is too long."),
});

export const cartItemSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, "Missing product id.")
    .max(40, "Invalid product id."),
  quantity: z
    .number()
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .max(50, "Quantity is too large."),
  size: z.string().trim().min(1).max(20).optional(),
  color: z.string().trim().min(1).max(40).optional(),
});

export const createOrderRequestSchema = z.object({
  customer: customerSchema,
  items: z
    .array(cartItemSchema)
    .min(1, "Your cart is empty.")
    .max(50, "Too many items in one order."),
  clientOrderId: z
    .string()
    .trim()
    .min(8, "Invalid client order id.")
    .max(80, "Invalid client order id."),
  paymentMethod: z.enum(["cod"]).default("cod"),
});

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;
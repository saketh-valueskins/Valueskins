/**
 * Request Validation Schemas
 * Using Zod for runtime type validation
 */

import { z } from 'zod';

// Campaign Schemas
export const CreateCampaignSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be 200 characters or less'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be 2000 characters or less'),
  budget: z.number().positive('Budget must be greater than 0'),
  deadline: z.string().datetime('Deadline must be a valid date'),
  target_valueSkins: z.array(z.enum(['Type1', 'Type2', 'Type3'])).min(1, 'At least one ValueSkin is required'),
  location: z.string().optional(),
  requirements: z.string().optional(),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;

// Deal/Offer Schemas
export const SubmitOfferSchema = z.object({
  deal_id: z.string().uuid('Invalid deal ID'),
  deliverables: z.record(z.any()).refine((obj) => Object.keys(obj).length > 0, 'Deliverables cannot be empty'),
  price: z.number().positive('Price must be greater than 0'),
  currency: z.string().min(3).max(3),
  terms: z.string().optional(),
});

export type SubmitOfferInput = z.infer<typeof SubmitOfferSchema>;

// Message Schemas
export const SendMessageSchema = z.object({
  conversation_id: z.string().uuid('Invalid conversation ID'),
  deal_id: z.string().uuid('Invalid deal ID'),
  recipient_id: z.string().uuid('Invalid recipient ID'),
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message must be 5000 characters or less'),
  message_type: z.enum(['text', 'file', 'media', 'system']).default('text'),
  file_urls: z.array(z.string().url()).optional(),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;

// Reputation Schemas
export const SubmitReviewSchema = z.object({
  deal_id: z.string().uuid('Invalid deal ID'),
  reviewee_id: z.string().uuid('Invalid reviewee ID'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be 100 characters or less'),
  content: z.string().min(10, 'Review must be at least 10 characters').max(5000, 'Review must be 5000 characters or less'),
});

export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;

export const SubmitRatingSchema = z.object({
  deal_id: z.string().uuid('Invalid deal ID'),
  ratee_id: z.string().uuid('Invalid ratee ID'),
  rating: z.number().min(1).max(5, 'Rating must be between 1 and 5'),
  categories: z.object({
    communication: z.number().min(1).max(5).optional(),
    professionalism: z.number().min(1).max(5).optional(),
    content_quality: z.number().min(1).max(5).optional(),
    on_time_delivery: z.number().min(1).max(5).optional(),
    value_for_money: z.number().min(1).max(5).optional(),
  }).optional(),
});

export type SubmitRatingInput = z.infer<typeof SubmitRatingSchema>;

// Escrow Schemas
export const FundEscrowSchema = z.object({
  escrow_id: z.string().uuid('Invalid escrow ID'),
  deal_id: z.string().uuid('Invalid deal ID'),
  amount: z.number().positive('Amount must be greater than 0'),
  payment_intent_id: z.string().min(1, 'Payment intent ID required'),
});

export type FundEscrowInput = z.infer<typeof FundEscrowSchema>;

export const ReleaseEscrowSchema = z.object({
  escrow_id: z.string().uuid('Invalid escrow ID'),
  deal_id: z.string().uuid('Invalid deal ID'),
  creator_id: z.string().uuid('Invalid creator ID'),
  amount: z.number().positive('Amount must be greater than 0'),
  payout_method: z.enum(['bank_transfer', 'wallet', 'crypto']),
});

export type ReleaseEscrowInput = z.infer<typeof ReleaseEscrowSchema>;

// Helper function to validate and parse
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`Validation error: ${message}`);
    }
    throw error;
  }
}

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('creator', 'brand');

-- CreateTable Account
CREATE TABLE "Account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "display_name" TEXT,
  "avatar_url" TEXT,
  "onboarding_stage" TEXT NOT NULL DEFAULT 'incomplete',
  "instagram_id" TEXT UNIQUE,
  "instagram_bio" TEXT,
  "instagram_avatar" TEXT,
  "account_type" TEXT NOT NULL DEFAULT 'creator',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateTable CreatorProfile
CREATE TABLE "CreatorProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "account_id" TEXT NOT NULL UNIQUE,
  "bio" TEXT,
  "niche" TEXT,
  "rate" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreatorProfile_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);

-- CreateTable BrandProfile
CREATE TABLE "BrandProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "account_id" TEXT NOT NULL UNIQUE,
  "company_name" TEXT,
  "industry" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrandProfile_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);

-- CreateTable CreatorPayout
CREATE TABLE "CreatorPayout" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "creator_id" TEXT NOT NULL UNIQUE,
  "razorpay_contact_id" TEXT NOT NULL UNIQUE,
  "fund_account_id" TEXT NOT NULL UNIQUE,
  "upi_id_masked" TEXT,
  "bank_account_masked" TEXT,
  "payment_method" TEXT NOT NULL DEFAULT 'upi',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreatorPayout_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);

-- CreateTable Deal
CREATE TABLE "Deal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "creator_id" TEXT NOT NULL,
  "brand_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "requirements" TEXT NOT NULL,
  "script" TEXT,
  "total_budget" DECIMAL(10,2) NOT NULL,
  "commission_amount" DECIMAL(10,2) NOT NULL,
  "creator_payout_amount" DECIMAL(10,2) NOT NULL,
  "creator_advance" DECIMAL(10,2) NOT NULL,
  "creator_final" DECIMAL(10,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending_commission_payment',
  "commission_paid_at" TIMESTAMP(3),
  "razorpay_commission_payment_id" TEXT,
  "advance_initiated_at" TIMESTAMP(3),
  "advance_paid_at" TIMESTAMP(3),
  "razorpay_advance_transfer_id" TEXT,
  "final_initiated_at" TIMESTAMP(3),
  "final_paid_at" TIMESTAMP(3),
  "razorpay_final_transfer_id" TEXT,
  "work_submitted_at" TIMESTAMP(3),
  "work_approved_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "adp_generated" BOOLEAN NOT NULL DEFAULT false,
  "adp_generated_at" TIMESTAMP(3),
  "adp_number" BIGINT UNIQUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Deal_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Account" ("id") ON DELETE CASCADE,
  CONSTRAINT "Deal_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);

-- CreateTable Transaction
CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deal_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "razorpay_payment_id" TEXT,
  "razorpay_transfer_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "Transaction_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "Deal" ("id") ON DELETE CASCADE,
  CONSTRAINT "Transaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);

-- CreateTable GSTInvoice
CREATE TABLE "GSTInvoice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invoice_number" TEXT NOT NULL UNIQUE,
  "deal_id" TEXT NOT NULL UNIQUE,
  "brand_id" TEXT NOT NULL,
  "base_amount" DECIMAL(10,2) NOT NULL,
  "gst_rate" INTEGER NOT NULL DEFAULT 18,
  "gst_amount" DECIMAL(10,2) NOT NULL,
  "total_amount" DECIMAL(10,2) NOT NULL,
  "razorpay_invoice_id" TEXT,
  "razorpay_short_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'issued',
  "sent_to_email" TEXT,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GSTInvoice_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "Deal" ("id") ON DELETE CASCADE
);

-- CreateTable ADPDocument
CREATE TABLE "ADPDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deal_id" TEXT NOT NULL UNIQUE,
  "adp_number" BIGINT NOT NULL UNIQUE,
  "pdf_data" BYTEA NOT NULL,
  "pdf_size_bytes" BIGINT,
  "hash" TEXT,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ADPDocument_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "Deal" ("id") ON DELETE CASCADE
);

-- CreateTable DealMessage
CREATE TABLE "DealMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deal_id" TEXT NOT NULL,
  "sender_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DealMessage_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "Deal" ("id") ON DELETE CASCADE,
  CONSTRAINT "DealMessage_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Account" ("id") ON DELETE CASCADE
);

-- CreateTable ADPCounter
CREATE TABLE "ADPCounter" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "current_number" BIGINT NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "CreatorProfile_account_id_idx" ON "CreatorProfile"("account_id");
CREATE INDEX "BrandProfile_account_id_idx" ON "BrandProfile"("account_id");
CREATE INDEX "Deal_creator_id_idx" ON "Deal"("creator_id");
CREATE INDEX "Deal_brand_id_idx" ON "Deal"("brand_id");
CREATE INDEX "Deal_status_idx" ON "Deal"("status");
CREATE INDEX "Transaction_deal_id_idx" ON "Transaction"("deal_id");
CREATE INDEX "Transaction_account_id_idx" ON "Transaction"("account_id");
CREATE INDEX "DealMessage_deal_id_idx" ON "DealMessage"("deal_id");
CREATE INDEX "DealMessage_sender_id_idx" ON "DealMessage"("sender_id");

import type { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '@/lib/db';
import type {
  PlatformFeeConfig, ProviderFeeOverride, PlatformFeeRecord,
  TransactionLedgerEntry, FeeCalculationResult, PaymentDashboardData,
  FeeType, PaymentProvider,
} from '@/features/events/data/types';
import {
  DEFAULT_PLATFORM_FEE_CENTS,
  DEFAULT_PLATFORM_FEE_PERCENTAGE,
} from '@/lib/platformFees';
import { getBusinessBankConfig } from '@/lib/businessBank';

// ── Fee Calculation (mirrors Rust fee_engine) ──────────────

function calculateFee(
  amountCents: number,
  provider: string,
  config: PlatformFeeConfig,
  overrides: ProviderFeeOverride[],
): FeeCalculationResult {
  const override_ = overrides.find(o => o.provider === provider && o.isActive);
  const feeType: FeeType = override_?.feeType ?? config.feeType;
  const flatFeeCents: number = override_?.flatFeeCents ?? config.flatFeeCents;
  const percentageRate: number = override_?.percentageRate ?? config.percentageRate;
  const minFeeCents: number | null = config.minFeeCents;
  const maxFeeCents: number | null = config.maxFeeCents;

  const flatComponent = feeType === 'flat' || feeType === 'hybrid' ? flatFeeCents : 0;
  const percentageComponent = feeType === 'percentage' || feeType === 'hybrid'
    ? Math.round(amountCents * (percentageRate / 100))
    : 0;

  let total = flatComponent + percentageComponent;

  if (feeType === 'percentage') {
    if (minFeeCents !== null) total = Math.max(total, minFeeCents);
    if (maxFeeCents !== null) total = Math.min(total, maxFeeCents);
  }

  return {
    feeCents: total,
    netAmountCents: amountCents - total,
    breakdown: { flatComponent, percentageComponent, totalFeeCents: total },
    configUsed: override_ ?? config,
    provider,
  };
}

// ── DB Helpers ──────────────────────────────────────────────

async function getFeeConfig(): Promise<PlatformFeeConfig> {
  const row = await queryOne('SELECT * FROM platform_fee_config WHERE is_active = true ORDER BY created_at DESC LIMIT 1');
  if (!row) {
    return {
      id: 'fee-cfg-default',
      feeType: 'percentage',
      flatFeeCents: DEFAULT_PLATFORM_FEE_CENTS,
      percentageRate: DEFAULT_PLATFORM_FEE_PERCENTAGE,
      minFeeCents: null,
      maxFeeCents: null,
      description: 'Default platform fee: 2% of every ticket transaction',
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    id: row.id,
    feeType: row.fee_type,
    flatFeeCents: row.flat_fee_cents,
    percentageRate: Number(row.percentage_rate),
    minFeeCents: row.min_fee_cents,
    maxFeeCents: row.max_fee_cents,
    description: row.description || '',
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at?.toISOString() || new Date().toISOString(),
    updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
  };
}

async function updateFeeConfig(body: any): Promise<PlatformFeeConfig> {
  const current = await getFeeConfig();
  const updated = {
    ...current,
    feeType: body.feeType ?? current.feeType,
    flatFeeCents: body.flatFeeCents ?? current.flatFeeCents,
    percentageRate: body.percentageRate ?? current.percentageRate,
    minFeeCents: body.minFeeCents ?? current.minFeeCents,
    maxFeeCents: body.maxFeeCents ?? current.maxFeeCents,
    description: body.description ?? current.description,
    isActive: body.isActive ?? current.isActive,
    updatedAt: new Date().toISOString(),
  };
  await query(
    `UPDATE platform_fee_config SET
      fee_type = $1, flat_fee_cents = $2, percentage_rate = $3,
      min_fee_cents = $4, max_fee_cents = $5, description = $6,
      is_active = $7, updated_at = now()
    WHERE id = $8`,
    [updated.feeType, updated.flatFeeCents, updated.percentageRate,
     updated.minFeeCents, updated.maxFeeCents, updated.description,
     updated.isActive, current.id]
  );
  return updated;
}

async function getProviderOverrides(): Promise<ProviderFeeOverride[]> {
  const rows = await query('SELECT * FROM provider_fee_overrides ORDER BY provider');
  return rows.rows.map(r => ({
    id: r.id,
    provider: r.provider,
    feeType: r.fee_type,
    flatFeeCents: r.flat_fee_cents,
    percentageRate: r.percentage_rate ? Number(r.percentage_rate) : null,
    isActive: r.is_active,
  }));
}

// ── Handler ────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const route = Array.isArray(path) ? path.join('/') : path || '';

  const [resource, ...rest] = route.split('/');
  const id = rest[0] || null;

  try {
    switch (resource) {
      case 'config': {
        if (req.method === 'GET') {
          const config = await getFeeConfig();
          return res.status(200).json(config);
        }
        if (req.method === 'PUT' || req.method === 'PATCH') {
          const config = await updateFeeConfig(req.body);
          return res.status(200).json(config);
        }
        return res.status(405).json({ error: 'Method not allowed' });
      }

      case 'calculate': {
        if (req.method === 'POST') {
          const { amountCents, provider } = req.body;
          if (typeof amountCents !== 'number' || amountCents < 0) {
            return res.status(400).json({ error: 'amountCents must be a positive number' });
          }
          const config = await getFeeConfig();
          const overrides = await getProviderOverrides();
          const result = calculateFee(amountCents, provider || 'stripe', config, overrides);
          return res.status(200).json(result);
        }
        return res.status(405).json({ error: 'Method not allowed' });
      }

      case 'providers': {
        if (req.method === 'GET') {
          const overrides = await getProviderOverrides();
          return res.status(200).json(overrides);
        }
        if (req.method === 'POST') {
          const body = req.body;
          const existing = await queryOne('SELECT * FROM provider_fee_overrides WHERE provider = $1', [body.provider]);
          const override = {
            id: body.id || `override-${Date.now()}`,
            provider: body.provider,
            feeType: body.feeType ?? null,
            flatFeeCents: body.flatFeeCents ?? null,
            percentageRate: body.percentageRate ?? null,
            isActive: body.isActive ?? true,
          };
          if (existing) {
            await query(
              `UPDATE provider_fee_overrides SET fee_type = $1, flat_fee_cents = $2, percentage_rate = $3, is_active = $4, updated_at = now() WHERE provider = $5`,
              [override.feeType, override.flatFeeCents, override.percentageRate, override.isActive, override.provider]
            );
          } else {
            await query(
              `INSERT INTO provider_fee_overrides (id, provider, fee_type, flat_fee_cents, percentage_rate, is_active) VALUES ($1, $2, $3, $4, $5, $6)`,
              [override.id, override.provider, override.feeType, override.flatFeeCents, override.percentageRate, override.isActive]
            );
          }
          return res.status(200).json(override);
        }
        if (req.method === 'DELETE' && id) {
          await query('DELETE FROM provider_fee_overrides WHERE id = $1', [id]);
          return res.status(200).json({ deleted: true });
        }
        return res.status(405).json({ error: 'Method not allowed' });
      }

      case 'fees': {
        if (req.method === 'GET') {
          const eventFilter = rest[1] === 'event' ? rest[2] : null;
          let rows;
          if (eventFilter) {
            rows = await query('SELECT * FROM platform_fee_records WHERE event_id = $1 ORDER BY created_at DESC', [eventFilter]);
          } else {
            rows = await query('SELECT * FROM platform_fee_records ORDER BY created_at DESC LIMIT 100');
          }
          const records: PlatformFeeRecord[] = rows.rows.map(r => ({
            id: r.id,
            transactionId: r.transaction_id,
            provider: r.provider,
            grossAmountCents: r.gross_amount_cents,
            feeCents: r.fee_cents,
            netAmountCents: r.net_amount_cents,
            currency: r.currency,
            status: r.status,
            payerId: r.payer_id,
            payeeId: r.payee_id,
            eventId: r.event_id,
            metadata: r.metadata,
            createdAt: r.created_at?.toISOString() || '',
            collectedAt: r.collected_at?.toISOString() || '',
          }));
          return res.status(200).json(records);
        }
        if (req.method === 'POST') {
          const body = req.body;
          const grossCents: number = body.grossAmountCents;
          const provider: string = body.provider || 'stripe';
          const config = await getFeeConfig();
          const overrides = await getProviderOverrides();
          const calc = calculateFee(grossCents, provider, config, overrides);
          const record = {
            id: `fee-${Date.now()}`,
            transactionId: body.transactionId || `txn-${Date.now()}`,
            provider,
            grossAmountCents: grossCents,
            feeCents: calc.feeCents,
            netAmountCents: calc.netAmountCents,
            currency: body.currency || 'INR',
            status: 'collected',
            payerId: body.payerId || null,
            payeeId: body.payeeId || null,
            eventId: body.eventId || null,
            metadata: body.metadata || null,
          };
          await query(
            `INSERT INTO platform_fee_records (id, transaction_id, provider, gross_amount_cents, fee_cents, net_amount_cents, currency, status, payer_id, payee_id, event_id, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [record.id, record.transactionId, record.provider, record.grossAmountCents, record.feeCents, record.netAmountCents, record.currency, record.status, record.payerId, record.payeeId, record.eventId, record.metadata ? JSON.stringify(record.metadata) : null]
          );
          return res.status(201).json(record);
        }
        return res.status(405).json({ error: 'Method not allowed' });
      }

      case 'ledger': {
        if (req.method === 'GET') {
          const rows = await query('SELECT * FROM transaction_ledger ORDER BY created_at DESC LIMIT 100');
          const entries: TransactionLedgerEntry[] = rows.rows.map(r => ({
            id: r.id,
            externalId: r.external_id,
            provider: r.provider,
            type: r.type,
            amountCents: r.amount_cents,
            currency: r.currency,
            grossAmountCents: r.gross_amount_cents,
            feeCents: r.fee_cents,
            netAmountCents: r.net_amount_cents,
            status: r.status,
            payerId: r.payer_id,
            payeeId: r.payee_id,
            eventId: r.event_id,
            idempotencyKey: r.idempotency_key,
            description: r.description,
            metadata: r.metadata,
            createdAt: r.created_at?.toISOString() || '',
            updatedAt: r.updated_at?.toISOString() || '',
          }));
          return res.status(200).json(entries);
        }
        if (req.method === 'POST') {
          const body = req.body;
          const grossCents: number = body.amountCents;
          const provider: string = body.provider || 'stripe';
          const config = await getFeeConfig();
          const overrides = await getProviderOverrides();
          const calc = body.feeCents !== undefined
            ? { feeCents: body.feeCents, netAmountCents: grossCents - body.feeCents }
            : calculateFee(grossCents, provider, config, overrides);

          const entry = {
            id: `ledger-${Date.now()}`,
            externalId: body.externalId || null,
            provider,
            type: body.type || 'payment',
            amountCents: grossCents,
            currency: body.currency || 'INR',
            grossAmountCents: grossCents + (body.providerFeeCents || 0),
            feeCents: calc.feeCents,
            netAmountCents: calc.netAmountCents,
            status: body.status || 'succeeded',
            payerId: body.payerId || null,
            payeeId: body.payeeId || null,
            eventId: body.eventId || null,
            idempotencyKey: body.idempotencyKey || null,
            description: body.description || null,
            metadata: body.metadata || null,
          };
          await query(
            `INSERT INTO transaction_ledger (id, external_id, provider, type, amount_cents, currency, gross_amount_cents, fee_cents, net_amount_cents, status, payer_id, payee_id, event_id, idempotency_key, description, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
            [entry.id, entry.externalId, entry.provider, entry.type, entry.amountCents, entry.currency, entry.grossAmountCents, entry.feeCents, entry.netAmountCents, entry.status, entry.payerId, entry.payeeId, entry.eventId, entry.idempotencyKey, entry.description, entry.metadata ? JSON.stringify(entry.metadata) : null]
          );
          return res.status(201).json(entry);
        }
        return res.status(405).json({ error: 'Method not allowed' });
      }

      case 'dashboard': {
        if (req.method === 'GET') {
          const feeSum = await queryOne(
            `SELECT COALESCE(SUM(CASE WHEN status = 'collected' THEN fee_cents ELSE 0 END), 0) as total_fees,
                    COALESCE(SUM(CASE WHEN status = 'pending' THEN fee_cents ELSE 0 END), 0) as pending_fees,
                    COUNT(*) as total_records FROM platform_fee_records`
          );
          const ledgerSum = await queryOne(
            `SELECT COALESCE(SUM(CASE WHEN type = 'payment' AND status = 'succeeded' THEN amount_cents ELSE 0 END), 0) as total_revenue,
                    COUNT(*) FILTER (WHERE type = 'payment') as total_transactions FROM transaction_ledger`
          );

          const totalFeesCents = Number(feeSum?.total_fees || 0);
          const pendingFeesCents = Number(feeSum?.pending_fees || 0);
          const totalRevenueCents = Number(ledgerSum?.total_revenue || 0);
          const totalTransactions = Number(ledgerSum?.total_transactions || 0);
          const config = await getFeeConfig();
          const overrides = await getProviderOverrides();

          const recentLedger = (await query('SELECT * FROM transaction_ledger ORDER BY created_at DESC LIMIT 10')).rows;
          const recentFees = (await query('SELECT * FROM platform_fee_records ORDER BY created_at DESC LIMIT 10')).rows;

          let virtualBank: PaymentDashboardData['virtualBank'] = null;
          try {
            await query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_provider TEXT,
              ADD COLUMN IF NOT EXISTS payment_order_ref TEXT,
              ADD COLUMN IF NOT EXISTS payment_ref TEXT,
              ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
              ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER NOT NULL DEFAULT 0,
              ADD COLUMN IF NOT EXISTS net_amount_cents INTEGER NOT NULL DEFAULT 0,
              ADD COLUMN IF NOT EXISTS fee_status TEXT DEFAULT 'pending',
              ADD COLUMN IF NOT EXISTS settlement_account_label TEXT`);

            const stats = await query(
              `SELECT
                 COUNT(*) FILTER (WHERE payment_provider = 'razorpay' AND fee_status = 'collected')::int AS ticket_count,
                 COALESCE(SUM(price_cents) FILTER (WHERE payment_provider = 'razorpay' AND fee_status = 'collected'), 0)::int AS gross_sales_cents,
                 COALESCE(SUM(platform_fee_cents) FILTER (WHERE payment_provider = 'razorpay' AND fee_status = 'collected'), 0)::int AS fee_revenue_cents,
                 COALESCE(SUM(net_amount_cents) FILTER (WHERE payment_provider = 'razorpay' AND fee_status = 'collected'), 0)::int AS net_sales_cents,
                 COALESCE(SUM(platform_fee_cents) FILTER (WHERE payment_provider = 'razorpay' AND fee_status = 'pending'), 0)::int AS pending_fee_cents,
                 MAX(created_at) FILTER (WHERE payment_provider = 'razorpay') AS last_payment_at
               FROM tickets`
            );

            if (stats.rows.length > 0) {
              const row = stats.rows[0];
              const bank = getBusinessBankConfig();
              virtualBank = {
                label: bank.label,
                bankName: bank.bankName,
                accountHolderName: bank.accountHolderName,
                accountNumberMasked: `${'*'.repeat(Math.max(bank.accountNumber.length - 4, 0))}${bank.accountNumber.slice(-4)}`,
                ifsc: bank.ifsc,
                currentBalanceCents: Number(row.fee_revenue_cents || 0),
                netTicketSalesCents: Number(row.net_sales_cents || 0),
                ticketsSoldCount: Number(row.ticket_count || 0),
                lastPaymentAt: row.last_payment_at || null,
              };
            }
          } catch { virtualBank = null; }

          const dashboard: PaymentDashboardData = {
            totalRevenueCents,
            totalFeesCents,
            totalTransactions,
            pendingFeesCents,
            collectedFeesCents: totalFeesCents,
            feeConfig: config,
            recentTransactions: recentLedger.map(r => ({
              id: r.id, externalId: r.external_id, provider: r.provider,
              type: r.type, amountCents: r.amount_cents, currency: r.currency,
              grossAmountCents: r.gross_amount_cents, feeCents: r.fee_cents,
              netAmountCents: r.net_amount_cents, status: r.status,
              payerId: r.payer_id, payeeId: r.payee_id, eventId: r.event_id,
              idempotencyKey: r.idempotency_key, description: r.description,
              metadata: r.metadata,
              createdAt: r.created_at?.toISOString() || '',
              updatedAt: r.updated_at?.toISOString() || '',
            })),
            recentFees: recentFees.map(r => ({
              id: r.id, transactionId: r.transaction_id, provider: r.provider,
              grossAmountCents: r.gross_amount_cents, feeCents: r.fee_cents,
              netAmountCents: r.net_amount_cents, currency: r.currency,
              status: r.status, payerId: r.payer_id, payeeId: r.payee_id,
              eventId: r.event_id, metadata: r.metadata,
              createdAt: r.created_at?.toISOString() || '',
              collectedAt: r.collected_at?.toISOString() || '',
            })),
            providerOverrides: overrides,
            virtualBank,
          };
          return res.status(200).json(dashboard);
        }
        return res.status(405).json({ error: 'Method not allowed' });
      }

      default:
        return res.status(404).json({ error: `Unknown resource: ${resource}` });
    }
  } catch (err) {
    console.error('Payments API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

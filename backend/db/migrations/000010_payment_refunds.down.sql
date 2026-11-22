DROP INDEX IF EXISTS uq_payment_orders_reservation;

ALTER TABLE payment_orders
    DROP COLUMN IF EXISTS refunded_at,
    DROP COLUMN IF EXISTS refund_retryable,
    DROP COLUMN IF EXISTS refund_error,
    DROP COLUMN IF EXISTS refund_conversation_id,
    DROP COLUMN IF EXISTS refund_status;

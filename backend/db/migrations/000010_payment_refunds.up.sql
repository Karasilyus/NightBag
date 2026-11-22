ALTER TABLE payment_orders
    ADD COLUMN refund_status TEXT
        CHECK (refund_status IN ('pending', 'refunded', 'failed', 'unknown')),
    ADD COLUMN refund_conversation_id TEXT,
    ADD COLUMN refund_error TEXT,
    ADD COLUMN refund_retryable BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN refunded_at TIMESTAMPTZ;

CREATE UNIQUE INDEX uq_payment_orders_reservation
    ON payment_orders(reservation_id) WHERE reservation_id IS NOT NULL;

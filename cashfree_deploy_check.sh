#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/vanca-patina/backend
set -a
. ./.env
set +a

base="https://api.cashfree.com/pg"
if [[ "${CASHFREE_ENVIRONMENT:-production}" != "production" ]]; then
  base="https://sandbox.cashfree.com/pg"
fi

body=$(mktemp)
code=$(curl -s -o "$body" -w '%{http_code}' \
  -X POST "$base/orders" \
  -H 'Content-Type: application/json' \
  -H "x-client-id: ${CASHFREE_CLIENT_ID:-${CASHFREE_APP_ID:-}}" \
  -H "x-client-secret: ${CASHFREE_CLIENT_SECRET:-${CASHFREE_SECRET_KEY:-}}" \
  -H 'x-api-version: 2023-08-01' \
  -d "{\"order_id\":\"deploy_check_$(date +%s)\",\"order_amount\":\"1.00\",\"order_currency\":\"INR\",\"customer_details\":{\"customer_id\":\"deploy_check\",\"customer_name\":\"Deploy Check\",\"customer_email\":\"test@example.com\",\"customer_phone\":\"9999999999\"}}")

has_session=0
if grep -q 'payment_session_id' "$body"; then
  has_session=1
fi
order_status=$(grep -o '"order_status":"[^"]*"' "$body" | head -1 | cut -d: -f2 | tr -d '"')
rm -f "$body"

echo "cashfree_http=$code has_payment_session_id=$has_session order_status=${order_status:-unknown}"

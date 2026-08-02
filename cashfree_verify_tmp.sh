#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/home/ubuntu/vanca-patina/backend/.env"

read_env() {
  local key="$1"
  local value
  value=$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$ENV_FILE" | tail -n 1 | sed -E "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//" | tr -d '\r')
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

client_id="$(read_env CASHFREE_CLIENT_ID)"
client_secret="$(read_env CASHFREE_CLIENT_SECRET)"
if [ -z "$client_id" ]; then client_id="$(read_env CASHFREE_APP_ID)"; fi
if [ -z "$client_secret" ]; then client_secret="$(read_env CASHFREE_SECRET_KEY)"; fi
cashfree_env="$(read_env CASHFREE_ENVIRONMENT)"

base_url="https://api.cashfree.com/pg"
case "$(printf '%s' "$cashfree_env" | tr '[:upper:]' '[:lower:]')" in
  sandbox|test) base_url="https://sandbox.cashfree.com/pg" ;;
esac

body_file=$(mktemp)
http_status=$(curl -sS -o "$body_file" -w '%{http_code}' \
  -X POST "$base_url/orders" \
  -H 'Content-Type: application/json' \
  -H "x-client-id: $client_id" \
  -H "x-client-secret: $client_secret" \
  -H 'x-api-version: 2023-08-01' \
  -d "{\"order_id\":\"verify_$(date +%s)\",\"order_amount\":\"1.00\",\"order_currency\":\"INR\",\"customer_details\":{\"customer_id\":\"verify\",\"customer_name\":\"Verify\",\"customer_email\":\"verify@example.com\",\"customer_phone\":\"9999999999\"}}")

has_payment_session_id=false
if grep -q '"payment_session_id"' "$body_file"; then has_payment_session_id=true; fi
order_status=$(grep -o '"order_status"[[:space:]]*:[[:space:]]*"[^"]*"' "$body_file" | head -n 1 | sed -E 's/.*"order_status"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')
rm -f "$body_file"

printf 'HTTP status: %s\n' "$http_status"
printf 'has_payment_session_id: %s\n' "$has_payment_session_id"
printf 'order_status: %s\n' "${order_status:-}"

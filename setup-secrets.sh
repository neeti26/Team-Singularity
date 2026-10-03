#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TeamPulse — Create Google Secret Manager secrets from .env.local
# Run this ONCE before the first deployment.
# Usage: GCP_PROJECT_ID=your-project ./setup-secrets.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-your-gcp-project-id}"
ENV_FILE=".env.local"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "❌  ${ENV_FILE} not found. Copy .env.local.example → .env.local and fill in values first."
  exit 1
fi

gcloud config set project "${PROJECT_ID}"
gcloud services enable secretmanager.googleapis.com --quiet

# Map: env var name → Secret Manager secret name
declare -A SECRET_MAP=(
  [GEMINI_API_KEY]="teampulse-gemini-key"
  [FIREBASE_PROJECT_ID]="teampulse-firebase-project"
  [FIREBASE_CLIENT_EMAIL]="teampulse-firebase-email"
  [FIREBASE_PRIVATE_KEY]="teampulse-firebase-key"
  [NEXT_PUBLIC_FIREBASE_API_KEY]="teampulse-fb-api-key"
  [NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN]="teampulse-fb-auth-domain"
  [NEXT_PUBLIC_FIREBASE_PROJECT_ID]="teampulse-fb-project-id"
  [NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET]="teampulse-fb-storage"
  [NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID]="teampulse-fb-sender"
  [NEXT_PUBLIC_FIREBASE_APP_ID]="teampulse-fb-app-id"
)

# Source env file
set -a; source "${ENV_FILE}"; set +a

for ENV_VAR in "${!SECRET_MAP[@]}"; do
  SECRET_NAME="${SECRET_MAP[$ENV_VAR]}"
  VALUE="${!ENV_VAR:-}"

  if [[ -z "${VALUE}" ]]; then
    echo "⚠️   Skipping ${ENV_VAR} (not set in ${ENV_FILE})"
    continue
  fi

  # Create or update secret
  if gcloud secrets describe "${SECRET_NAME}" --quiet 2>/dev/null; then
    echo "► Updating secret: ${SECRET_NAME}"
    printf '%s' "${VALUE}" | gcloud secrets versions add "${SECRET_NAME}" --data-file=-
  else
    echo "► Creating secret: ${SECRET_NAME}"
    printf '%s' "${VALUE}" | gcloud secrets create "${SECRET_NAME}" \
      --replication-policy="automatic" \
      --data-file=-
  fi
done

# Grant Cloud Run service account access to secrets
SA="${PROJECT_ID}@appspot.gserviceaccount.com"
echo "► Granting Secret Manager access to ${SA}…"
for SECRET_NAME in "${SECRET_MAP[@]}"; do
  gcloud secrets add-iam-policy-binding "${SECRET_NAME}" \
    --member="serviceAccount:${SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet 2>/dev/null || true
done

echo ""
echo "✅  All secrets created. Run ./deploy.sh to deploy."

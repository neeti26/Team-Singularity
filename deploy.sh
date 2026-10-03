#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Team Singularity — Google Cloud Run Deployment Script
# Usage: ./deploy.sh
# Prerequisites: gcloud CLI authenticated, Docker running
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration — edit these ───────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:-your-gcp-project-id}"
REGION="${GCP_REGION:-asia-southeast1}"          # Singapore (JAPAC region)
SERVICE_NAME="team-singularity"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
TAG="${DEPLOY_TAG:-$(date +%Y%m%d-%H%M%S)}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Team Singularity → Cloud Run Deployment"
echo "  Project : ${PROJECT_ID}"
echo "  Region  : ${REGION}"
echo "  Image   : ${IMAGE}:${TAG}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Set GCP project ────────────────────────────────────────────────────────
gcloud config set project "${PROJECT_ID}"

# ── 2. Enable required APIs ───────────────────────────────────────────────────
echo "► Enabling GCP APIs…"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com \
  --quiet

# ── 3. Build & push Docker image via Cloud Build ──────────────────────────────
echo "► Building Docker image with Cloud Build…"
gcloud builds submit \
  --tag "${IMAGE}:${TAG}" \
  --timeout=20m \
  .

# Also tag as latest
gcloud container images add-tag "${IMAGE}:${TAG}" "${IMAGE}:latest" --quiet

# ── 4. Deploy to Cloud Run ────────────────────────────────────────────────────
echo "► Deploying to Cloud Run…"
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}:${TAG}" \
  --platform managed \
  --region "${REGION}" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 80 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "\
GEMINI_API_KEY=singularity-gemini-key:latest,\
FIREBASE_PROJECT_ID=singularity-firebase-project:latest,\
FIREBASE_CLIENT_EMAIL=singularity-firebase-email:latest,\
FIREBASE_PRIVATE_KEY=singularity-firebase-key:latest,\
NEXT_PUBLIC_FIREBASE_API_KEY=singularity-fb-api-key:latest,\
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=singularity-fb-auth-domain:latest,\
NEXT_PUBLIC_FIREBASE_PROJECT_ID=singularity-fb-project-id:latest,\
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=singularity-fb-storage:latest,\
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=singularity-fb-sender:latest,\
NEXT_PUBLIC_FIREBASE_APP_ID=singularity-fb-app-id:latest"

# ── 5. Get the service URL ────────────────────────────────────────────────────
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --format "value(status.url)")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Deployment complete!"
echo "  🌐  URL: ${SERVICE_URL}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

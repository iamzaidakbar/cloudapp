#!/usr/bin/env bash
# Sync Secret Manager values into the Phase A Kubernetes Secret.
# Prerequisites: gcloud auth, kubectl context on the Autopilot cluster.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
NAMESPACE="${NAMESPACE:-development}"
SECRET_NAME="${SECRET_NAME:-cloudshiftg-secrets}"

SESSION_SECRET="$(gcloud secrets versions access latest --secret=cloudshiftg-session-secret --project="$PROJECT_ID")"
DATABASE_URL="$(gcloud secrets versions access latest --secret=cloudshiftg-database-url --project="$PROJECT_ID")"
APP_DATABASE_URL="$(gcloud secrets versions access latest --secret=cloudshiftg-app-database-url --project="$PROJECT_ID")"

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

kubectl -n "$NAMESPACE" create secret generic "$SECRET_NAME" \
  --from-literal=SESSION_SECRET="$SESSION_SECRET" \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=APP_DATABASE_URL="$APP_DATABASE_URL" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret $SECRET_NAME upserted in namespace $NAMESPACE"

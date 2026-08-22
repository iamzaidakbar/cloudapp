#!/usr/bin/env bash
# Helm install/upgrade for a target namespace (development / staging / production).
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-us-east1}"
NAMESPACE="${NAMESPACE:-development}"
TAG="${IMAGE_TAG:?Set IMAGE_TAG from phase-a-build-push.sh}"
REGISTRY="${REGISTRY:-${REGION}-docker.pkg.dev/${PROJECT_ID}/cloudshiftg}"

SQL_CONNECTION_NAME="${SQL_CONNECTION_NAME:?Set SQL_CONNECTION_NAME (terraform output -raw sql_connection_name)}"
WEB_GSA="${WEB_GSA:?Set WEB_GSA (terraform output -raw web_gsa_email)}"
WORKER_GSA="${WORKER_GSA:?Set WORKER_GSA (terraform output -raw worker_gsa_email)}"
TF_GSA="${TF_GSA:?Set TF_GSA (terraform output -raw terraform_job_gsa_email)}"

VALUES_FILE="deploy/helm/cloudshiftg/values-${NAMESPACE}.yaml"
if [ ! -f "$VALUES_FILE" ]; then
  echo "Missing values file: $VALUES_FILE"
  exit 1
fi

helm upgrade --install cloudshiftg deploy/helm/cloudshiftg \
  --namespace "$NAMESPACE" --create-namespace \
  -f "$VALUES_FILE" \
  --set image.registry="$REGISTRY" \
  --set image.webTag="$TAG" \
  --set image.workerTag="$TAG" \
  --set image.terraformJobTag="$TAG" \
  --set env.GCP_PROJECT_ID="$PROJECT_ID" \
  --set cloudsql.instanceConnectionName="$SQL_CONNECTION_NAME" \
  --set serviceAccount.web.gcpServiceAccount="$WEB_GSA" \
  --set serviceAccount.worker.gcpServiceAccount="$WORKER_GSA" \
  --set serviceAccount.terraformJob.gcpServiceAccount="$TF_GSA" \
  --wait --timeout 15m

echo "Helm release cloudshiftg installed in $NAMESPACE"

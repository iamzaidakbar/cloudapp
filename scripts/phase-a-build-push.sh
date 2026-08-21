#!/usr/bin/env bash
# Build and push Phase A images to Artifact Registry.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-us-east1}"
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo manual)}"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/cloudshiftg"

gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

docker build -t "${REGISTRY}/web:${TAG}" -f Dockerfile .
docker build -t "${REGISTRY}/worker:${TAG}" -f Dockerfile.worker .
docker build -t "${REGISTRY}/terraform-job:${TAG}" -f Dockerfile.terraform-job .

docker push "${REGISTRY}/web:${TAG}"
docker push "${REGISTRY}/worker:${TAG}"
docker push "${REGISTRY}/terraform-job:${TAG}"

echo "Pushed tag ${TAG} to ${REGISTRY}"
echo "export IMAGE_TAG=${TAG}"
echo "export REGISTRY=${REGISTRY}"

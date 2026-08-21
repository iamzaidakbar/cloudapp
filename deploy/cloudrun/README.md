# Cloud Run parallel path (kept until GKE production is approved).
# Prefer GKE Autopilot for production; use this for staging experiments.

## Web

```bash
REGION=us-central1
PROJECT_ID=YOUR_GCP_PROJECT_ID
REGISTRY=$REGION-docker.pkg.dev/$PROJECT_ID/cloudshiftg

docker build -t $REGISTRY/web:manual -f Dockerfile .
docker push $REGISTRY/web:manual

gcloud run deploy cloudshiftg-web \
  --image $REGISTRY/web:manual \
  --region $REGION \
  --set-env-vars JOB_RUNTIME=pubsub,GCP_PROJECT_ID=$PROJECT_ID \
  --set-secrets DATABASE_URL=cloudshiftg-database-url:latest,APP_DATABASE_URL=cloudshiftg-app-database-url:latest,SESSION_SECRET=cloudshiftg-session-secret:latest
```

## Worker

```bash
docker build -t $REGISTRY/worker:manual -f Dockerfile.worker .
docker push $REGISTRY/worker:manual

gcloud run deploy cloudshiftg-worker \
  --image $REGISTRY/worker:manual \
  --region $REGION \
  --no-allow-unauthenticated \
  --set-env-vars JOB_RUNTIME=pubsub,GCP_PROJECT_ID=$PROJECT_ID \
  --set-secrets DATABASE_URL=cloudshiftg-database-url:latest,APP_DATABASE_URL=cloudshiftg-app-database-url:latest,SESSION_SECRET=cloudshiftg-session-secret:latest
```

Note: Terraform apply/rollback on Cloud Run still uses in-process (`inline`)
handlers unless you point `JOB_RUNTIME` at a Job-capable control plane.
For full terraform Job isolation, use GKE.

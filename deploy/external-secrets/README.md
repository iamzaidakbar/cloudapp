# External Secrets Operator (Phase B)

Syncs GCP Secret Manager → Kubernetes Secret `cloudshiftg-secrets` so web/worker
keep using `secretKeyRef` (no CSI file mounts).

## Prerequisites

- Autopilot cluster from `infra/` applied (includes GSA `cloudshiftg-eso` + WI)
- `kubectl` context on that cluster
- Helm 3+

```bash
export PROJECT_ID="$(gcloud config get-value project)"
export ESO_GSA="$(cd infra && terraform output -raw eso_gsa_email)"
```

## Install ESO

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm upgrade --install external-secrets external-secrets/external-secrets \
  --namespace external-secrets --create-namespace \
  --set installCRDs=true \
  --set webhook.create=false \
  --set certController.create=false \
  --set serviceAccount.annotations."iam\.gke\.io/gcp-service-account"="$ESO_GSA" \
  --wait --timeout 5m
```

> Autopilot free/trial quotas often cannot schedule the webhook + cert-controller
> Deployments. Disabling them is supported; apply CRs without admission webhooks.

## Apply store + sync

Edit `projectID` in the YAML files if needed, then:

```bash
kubectl apply -f deploy/external-secrets/secretstore.yaml
kubectl apply -f deploy/external-secrets/externalsecret-cloudshiftg.yaml

kubectl -n development get secretstore,externalsecret
kubectl -n development get secret cloudshiftg-secrets
```

## AWS secret versions

Create SM versions (never commit keys). See `scripts/phase-b-push-aws-secrets.ps1`
and [docs/PHASE_B_CHECKLIST.md](../../docs/PHASE_B_CHECKLIST.md).

After versions exist, ESO refreshes within ~1 minute; restart pods if needed:

```bash
kubectl -n development rollout restart deploy/cloudshiftg-web deploy/cloudshiftg-worker
```

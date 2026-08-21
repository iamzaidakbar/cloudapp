# Phase B — Secret Manager sync + AWS on GKE

Sync secrets via External Secrets Operator and enable real AWS AssumeRole from
the Autopilot cluster (leave Dev Adapter behind).

**Project / region:** see `infra/environments/dev.tfvars` (currently us-east1).

---

## Prerequisites

- [ ] Phase A complete (cluster, Helm web/worker, health/ready OK)
- [ ] `gcloud` + `kubectl` + `helm` available
- [ ] Local AWS access key / secret for CloudShift-G’s IAM identity (from `.env`, not committed)

---

## B1 — Terraform (SM shells + ESO GSA)

```bash
cd infra
terraform apply -var-file=environments/dev.tfvars
terraform output -raw eso_gsa_email
```

- [ ] AWS / billing Secret Manager shells created
- [ ] GSA `cloudshiftg-eso` + WI bindings applied
- [ ] `eso_gsa_email` recorded

---

## B2 — Push AWS (and optional billing) secret versions

**Never commit keys.** Use the script (prompts securely) or `gcloud` yourself:

```powershell
.\scripts\phase-b-push-aws-secrets.ps1 -ProjectId project-7fe2c753-1df6-4821-bf9
```

Optional billing key:

```powershell
.\scripts\phase-b-push-aws-secrets.ps1 -ProjectId ... -IncludeBillingKey
```

- [ ] `cloudshiftg-aws-access-key-id` has a version
- [ ] `cloudshiftg-aws-secret-access-key` has a version
- [ ] Region secret present (`us-east-1` from Terraform is fine)

---

## B3 — Install External Secrets Operator

```bash
export ESO_GSA="$(cd infra && terraform output -raw eso_gsa_email)"

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

> On tight Autopilot quotas, disable webhook + certController (as above) so only
> the controller pod must schedule.

- [ ] ESO pods Ready in `external-secrets`

---

## B4 — SecretStore + ExternalSecret

```bash
kubectl apply -f deploy/external-secrets/secretstore.yaml
kubectl apply -f deploy/external-secrets/externalsecret-cloudshiftg.yaml

kubectl -n development get secretstore gcp-secret-manager
kubectl -n development get externalsecret cloudshiftg-secrets
kubectl -n development get secret cloudshiftg-secrets -o jsonpath="{.data}" | jq 'keys'
```

Expect keys: `SESSION_SECRET`, `DATABASE_URL`, `APP_DATABASE_URL`, `AWS_*`, `GCP_BILLING_API_KEY`.

- [ ] SecretStore Ready
- [ ] ExternalSecret SecretSynced
- [ ] Manual `phase-a-sync-k8s-secrets` no longer required for steady state

---

## B5 — Helm upgrade (AWS env on pods)

```bash
# Same --set flags as Phase A helm install, plus ensure secrets.awsOptional=false
helm upgrade --install cloudshiftg deploy/helm/cloudshiftg \
  --namespace development \
  -f deploy/helm/cloudshiftg/values-development.yaml \
  --set image.registry=us-east1-docker.pkg.dev/PROJECT/cloudshiftg \
  --set image.webTag=phase-a \
  --set image.workerTag=phase-a \
  --set image.terraformJobTag=phase-a \
  --set env.GCP_PROJECT_ID=PROJECT \
  --set cloudsql.instanceConnectionName=PROJECT:us-east1:cloudshiftg-pg-development \
  --set serviceAccount.web.gcpServiceAccount=... \
  --set serviceAccount.worker.gcpServiceAccount=... \
  --set serviceAccount.terraformJob.gcpServiceAccount=... \
  --wait --timeout 10m

kubectl -n development rollout restart deploy/cloudshiftg-web deploy/cloudshiftg-worker
```

- [ ] Web/worker Ready
- [ ] Pods receive AWS_* from secret (no Dev Adapter for app identity)

---

## B6 — Verify real AWS

```bash
kubectl -n development port-forward svc/cloudshiftg-web 8080:80
```

- [ ] Settings → AWS: trust policy Principal is a **real** IAM ARN (not placeholder)
- [ ] Re-verify connection — no “simulated dev adapter” banner for *app* credentials
- [ ] Run Audit — no “Simulated (Dev Adapter)” on the audit **if** tenant role trusts that Principal and has read perms; otherwise fix IAM role trust/policy first

---

## Definition of done

**Secrets platform**
- [ ] ESO installed; SecretStore Ready
- [ ] ExternalSecret syncs `cloudshiftg-secrets`
- [ ] Phase A sync scripts are break-glass only

**AWS on GKE**
- [ ] SM versions for access key + secret + region
- [ ] Web/worker env includes AWS_*
- [ ] Trust Principal real ARN
- [ ] Re-verify without Dev Adapter (app side)
- [ ] Audit real or blocked only by tenant role misconfig (not missing app keys)

**Handoff**
- [ ] Phase C next (remote TF state + Job prove-out) — see [docs/PHASE_C_CHECKLIST.md](PHASE_C_CHECKLIST.md)

---

## Troubleshooting

| Symptom | Check |
|---|---|
| ExternalSecret `SecretSyncedError` | AWS SM versions missing; ESO GSA `secretAccessor`; WI on `cloudshiftg-eso-sa` |
| Still Dev Adapter | Pods not restarted after sync; Helm missing AWS env; wrong secret keys |
| Trust Principal placeholder | `AWS_ACCESS_KEY_ID` empty in pod — describe secret keys / env |
| AssumeRole denied | Tenant role trust Principal must match `aws sts get-caller-identity` Arn for app keys |

# Phase E — Logging, monitoring, alerts

Centralized observability for CloudShift-G on Autopilot. **No GitHub Actions.**

GKE Autopilot already sends container stdout/stderr to **Cloud Logging**. This
phase adds Monitoring **alert policies** + a **workload dashboard** via Terraform.

---

## Prerequisites

- [x] Phase A–D (cluster running; Actions skipped)
- [ ] `terraform` authenticated to the project

---

## E1 — Apply monitoring stack

```bash
cd infra
terraform apply -var-file=environments/dev.tfvars
```

Creates:

- Alert: web container restarts (namespace `development`)
- Alert: worker container restarts (namespace `development`)
- Dashboard: **CloudShift-G workloads** (CPU/memory)

- [ ] Apply succeeded
- [ ] Alerts visible in Cloud Monitoring → Alerting
- [ ] Dashboard visible in Cloud Monitoring → Dashboards

---

## E2 — Logging (already on)

In Cloud Console → Logging → Logs Explorer:

```
resource.type="k8s_container"
resource.labels.namespace_name="development"
resource.labels.container_name="web"
```

Worker:

```
resource.labels.container_name="worker"
```

Or:

```bash
kubectl -n development logs deploy/cloudshiftg-web -c web --tail=50
kubectl -n development logs deploy/cloudshiftg-worker -c worker --tail=50
```

- [ ] Can view web/worker logs in Logging or kubectl

---

## E3 — Optional email notifications

Alerts exist without a notification channel (open incidents in console).
To email yourself later: Monitoring → Alerting → Edit policy → Notification channels.

---

## Definition of done

- [ ] Restart alerts created for development web/worker
- [ ] Workload dashboard created
- [ ] Log query path documented

**Handoff:** Phase F next (product E2E on GKE development) — see [docs/PHASE_F_CHECKLIST.md](PHASE_F_CHECKLIST.md).

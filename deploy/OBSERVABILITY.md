# Observability notes (GKE)

## Logging
- Web and worker containers log JSON-friendly lines to stdout/stderr.
- On GKE Autopilot, Cloud Logging ingests container logs automatically.
- Filter examples:
  - `resource.type="k8s_container" AND resource.labels.container_name="web"`
  - `textPayload:"[worker]"` or `jsonPayload.message=~"job:"`

## Metrics / alerts (suggested)
Create alerting policies for:
1. Web Deployment unavailable / readiness probe failures
2. Worker message backlog on `cloudshiftg-*-jobs-worker` subscriptions (`num_undelivered_messages`)
3. Cloud SQL CPU > 80% for 15m
4. Failed Jobs: `kubectl get jobs -l app=cloudshiftg` with `Failed` status

## Smoke checks after deploy
```bash
curl -fsS https://YOUR_HOST/api/health
curl -fsS https://YOUR_HOST/api/ready
kubectl -n development get deploy,pods,hpa,pdb,ingress
kubectl -n development logs -l app.kubernetes.io/component=worker --tail=100
```

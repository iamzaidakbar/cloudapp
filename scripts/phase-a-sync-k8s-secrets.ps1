# Sync Secret Manager values into the Phase A Kubernetes Secret (PowerShell).
# Uses a temp env file to avoid shell mangling of connection strings.
param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [string]$Namespace = "development",
  [string]$SecretName = "cloudshiftg-secrets"
)

$ErrorActionPreference = "Stop"

$session = (gcloud secrets versions access latest --secret=cloudshiftg-session-secret --project=$ProjectId | Out-String).Trim()
$dbUrl = (gcloud secrets versions access latest --secret=cloudshiftg-database-url --project=$ProjectId | Out-String).Trim()
$appDbUrl = (gcloud secrets versions access latest --secret=cloudshiftg-app-database-url --project=$ProjectId | Out-String).Trim()

kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -

$tmp = Join-Path $env:TEMP "cloudshiftg-secrets-$PID.env"
# kubectl --from-env-file expects KEY=VALUE lines; escape is not supported so
# values must not contain newlines (ours do not).
@(
  "SESSION_SECRET=$session"
  "DATABASE_URL=$dbUrl"
  "APP_DATABASE_URL=$appDbUrl"
) | Set-Content -Path $tmp -Encoding ascii

try {
  kubectl -n $Namespace create secret generic $SecretName `
    --from-env-file=$tmp `
    --dry-run=client -o yaml | kubectl apply -f -
  Write-Host "Secret $SecretName upserted in namespace $Namespace"
}
finally {
  Remove-Item -Force $tmp -ErrorAction SilentlyContinue
}

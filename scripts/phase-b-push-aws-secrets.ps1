# Push CloudShift-G AWS credentials into Secret Manager (Phase B).
# Never prints secret values. Does not read .env from disk unless -FromEnvFile is set.
param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [string]$AccessKeyId,
  [string]$SecretAccessKey,
  [string]$Region = "us-east-1",
  [switch]$IncludeBillingKey,
  [string]$BillingApiKey,
  [string]$FromEnvFile
)

$ErrorActionPreference = "Stop"

function Write-SecretVersion([string]$SecretId, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Refusing to write empty value for $SecretId"
  }
  $tmp = Join-Path $env:TEMP "sm-$SecretId-$PID.txt"
  try {
    Set-Content -Path $tmp -Value $Value -NoNewline -Encoding ascii
    gcloud secrets versions add $SecretId --data-file=$tmp --project=$ProjectId | Out-Null
    Write-Host "Added version: $SecretId"
  }
  finally {
    Remove-Item -Force $tmp -ErrorAction SilentlyContinue
  }
}

if ($FromEnvFile) {
  Get-Content $FromEnvFile | ForEach-Object {
    if ($_ -match '^\s*AWS_ACCESS_KEY_ID=(.*)$') { $AccessKeyId = $Matches[1].Trim('"') }
    if ($_ -match '^\s*AWS_SECRET_ACCESS_KEY=(.*)$') { $SecretAccessKey = $Matches[1].Trim('"') }
    if ($_ -match '^\s*AWS_REGION=(.*)$') { $Region = $Matches[1].Trim('"') }
    if ($_ -match '^\s*GCP_BILLING_API_KEY=(.*)$') { $BillingApiKey = $Matches[1].Trim('"') }
  }
}

if (-not $AccessKeyId) {
  $AccessKeyId = Read-Host "AWS_ACCESS_KEY_ID"
}
if (-not $SecretAccessKey) {
  $secure = Read-Host "AWS_SECRET_ACCESS_KEY" -AsSecureString
  $SecretAccessKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  )
}

Write-SecretVersion -SecretId "cloudshiftg-aws-access-key-id" -Value $AccessKeyId
Write-SecretVersion -SecretId "cloudshiftg-aws-secret-access-key" -Value $SecretAccessKey
Write-SecretVersion -SecretId "cloudshiftg-aws-region" -Value $Region

if ($IncludeBillingKey) {
  if (-not $BillingApiKey) {
    $BillingApiKey = Read-Host "GCP_BILLING_API_KEY"
  }
  Write-SecretVersion -SecretId "cloudshiftg-gcp-billing-api-key" -Value $BillingApiKey
}

Write-Host "Done. Wait ~1m for ExternalSecret refresh, then restart web/worker if needed."

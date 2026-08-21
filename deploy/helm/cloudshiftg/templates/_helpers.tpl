{{- define "cloudshiftg.cloudSqlProxyContainer" -}}
- name: cloud-sql-proxy
  image: {{ .Values.cloudsql.proxyImage | quote }}
  imagePullPolicy: IfNotPresent
  args:
    - "--structured-logs"
    - "--private-ip"
    - "--port=5432"
    - {{ .Values.cloudsql.instanceConnectionName | quote }}
  securityContext:
    runAsNonRoot: true
    allowPrivilegeEscalation: false
    capabilities:
      drop: ["ALL"]
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 250m
      memory: 128Mi
{{- end -}}

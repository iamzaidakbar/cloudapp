# Phase E monitoring (Cloud Logging + alerts + dashboard)

# Autopilot already ships container logs to Cloud Logging. This file adds
# Monitoring alert policies and a simple workload dashboard for development.

resource "google_project_service" "monitoring" {
  project            = var.project_id
  service            = "monitoring.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "logging" {
  project            = var.project_id
  service            = "logging.googleapis.com"
  disable_on_destroy = false
}

# Alert when the web container restarts more than once in 5 minutes (development).
resource "google_monitoring_alert_policy" "web_restarts" {
  display_name = "CloudShift-G web restarts (development)"
  combiner     = "OR"
  enabled      = true
  depends_on   = [google_project_service.monitoring]

  documentation {
    content   = "Web container restarted in namespace development. Check: kubectl -n development logs deploy/cloudshiftg-web -c web --tail=100"
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "Web container restart count rate"
    condition_threshold {
      filter = <<-EOT
        resource.type = "k8s_container"
        AND resource.labels.cluster_name = "${google_container_cluster.autopilot.name}"
        AND resource.labels.namespace_name = "development"
        AND resource.labels.container_name = "web"
        AND metric.type = "kubernetes.io/container/restart_count"
      EOT
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.pod_name"]
      }
      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }
}

# Alert when worker restarts similarly.
resource "google_monitoring_alert_policy" "worker_restarts" {
  display_name = "CloudShift-G worker restarts (development)"
  combiner     = "OR"
  enabled      = true
  depends_on   = [google_project_service.monitoring]

  documentation {
    content   = "Worker container restarted in namespace development. Check: kubectl -n development logs deploy/cloudshiftg-worker -c worker --tail=100"
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "Worker container restart count rate"
    condition_threshold {
      filter = <<-EOT
        resource.type = "k8s_container"
        AND resource.labels.cluster_name = "${google_container_cluster.autopilot.name}"
        AND resource.labels.namespace_name = "development"
        AND resource.labels.container_name = "worker"
        AND metric.type = "kubernetes.io/container/restart_count"
      EOT
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.pod_name"]
      }
      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }
}

resource "google_monitoring_dashboard" "cloudshiftg" {
  depends_on = [google_project_service.monitoring]

  dashboard_json = jsonencode({
    displayName = "CloudShift-G workloads"
    mosaicLayout = {
      columns = 12
      tiles = [
        {
          width  = 6
          height = 4
          widget = {
            title = "Web CPU (development)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"k8s_container\" resource.labels.namespace_name=\"development\" resource.labels.container_name=\"web\" metric.type=\"kubernetes.io/container/cpu/core_usage_time\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_RATE"
                    }
                  }
                }
                plotType = "LINE"
              }]
            }
          }
        },
        {
          xPos   = 6
          width  = 6
          height = 4
          widget = {
            title = "Worker CPU (development)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"k8s_container\" resource.labels.namespace_name=\"development\" resource.labels.container_name=\"worker\" metric.type=\"kubernetes.io/container/cpu/core_usage_time\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_RATE"
                    }
                  }
                }
                plotType = "LINE"
              }]
            }
          }
        },
        {
          yPos   = 4
          width  = 6
          height = 4
          widget = {
            title = "Web memory (development)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"k8s_container\" resource.labels.namespace_name=\"development\" resource.labels.container_name=\"web\" metric.type=\"kubernetes.io/container/memory/used_bytes\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_MEAN"
                    }
                  }
                }
                plotType = "LINE"
              }]
            }
          }
        },
        {
          xPos   = 6
          yPos   = 4
          width  = 6
          height = 4
          widget = {
            title = "Worker memory (development)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"k8s_container\" resource.labels.namespace_name=\"development\" resource.labels.container_name=\"worker\" metric.type=\"kubernetes.io/container/memory/used_bytes\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_MEAN"
                    }
                  }
                }
                plotType = "LINE"
              }]
            }
          }
        }
      ]
    }
  })
}

output "monitoring_dashboard_name" {
  value = google_monitoring_dashboard.cloudshiftg.id
}

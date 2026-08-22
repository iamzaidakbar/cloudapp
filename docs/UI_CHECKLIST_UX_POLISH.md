# UI checklist — UX polish

Verify after a refresh (or `docker compose up -d --build` / `npm run dev`). Use a **Tenant Member** account for cue checks and a **Tenant Admin** for write/export/live checks.

---

## 1. Member read-only cues

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Sign in as **Member** → Dashboard | View-only banner; no “Run audit / New migration / Connect AWS” (view links only if connected) |
| 1.2 | Settings → **AWS** | Banner; no Verify / Reconnect / Connect buttons |
| 1.3 | Audits / Comparisons / Migrations | View-only banner; no start/create CTAs |
| 1.4 | Open a migration plan | View-only banner; no Approve / execution panels |
| 1.5 | Settings hub → AWS card | Copy says “View…”, not “manage” |

---

## 2. CSV export (Admin or Member)

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | Audit report → Findings → **Download CSV** | File downloads (`audit-*-findings.csv`) with finding rows |
| 2.2 | Comparison report → Mapped resources → **Download CSV** | `comparison-*-items.csv` |
| 2.3 | Migration plan → Resources → **Download CSV** | `migration-*-resources.csv` |

---

## 3. Live Jobs + migrations lists

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | As Admin, start an audit; open **Jobs** | Table updates without full refresh; “Updating live…” while QUEUED/RUNNING |
| 3.2 | Open **Migrations** with a DRAFT or APPROVED plan | “Updating live…”; status changes appear on poll |
| 3.3 | Change Jobs filters (type/status) | Poll uses current query string; pagination still works |

---

## 4. Empty / error states

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Member on empty Audits / Comparisons / Migrations / Jobs | Member-aware empty copy (no “Connect AWS” / “Run a comparison” admin prompts) |
| 4.2 | Migration → Transfer with no prior run | Idle empty: “No transfer run yet” |
| 4.3 | Failed transfer (or failed start) | ErrorState block with remediation-oriented copy |

---

## Quick fail signals

- Member can still click Verify on AWS → `canWrite` not passed
- CSV 404 → export route missing under App Router
- Jobs never update → `/api/jobs` missing or poller not mounted (check Suspense / searchParams)
- Transfer failed still only a tiny Alert → ErrorState not wired

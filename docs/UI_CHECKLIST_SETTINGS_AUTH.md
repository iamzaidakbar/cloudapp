# UI checklist — Settings & auth gaps

Use this walkthrough after deploy/restart (`npm run dev` or port-forward). Sign out between persona checks when needed.

## Prerequisites

- Seeded **Platform Operator** (e.g. `operator@cloudshiftg.local`)
- A **Tenant Admin** (register a new org, or use an existing admin)
- Ability to create a **Tenant Member** via Settings → Team (step 4)

---

## 1. Login redirects by role

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Open `/login`, sign in as **Platform Operator** (password already changed) | Lands on **`/platform`**, not `/dashboard` |
| 1.2 | Sign out; sign in as **Tenant Admin** | Lands on **`/dashboard`** |
| 1.3 | While signed in, visit `/login` as Operator | Redirects to **`/platform`** |
| 1.4 | While signed in, visit `/login` as Tenant Admin | Redirects to **`/dashboard`** |

---

## 2. Force password change (`mustChangePassword`)

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | As Tenant Admin: **Settings → Team → Add member** (Member role) | Success; **temporary password** shown once with Copy |
| 2.2 | Copy temp password; sign out; sign in as the new member | Redirects to **`/settings/password`** (not dashboard) |
| 2.3 | While gated, open `/dashboard` or `/audits` | Redirects back to **`/settings/password`** |
| 2.4 | Submit new password (min 8) with matching confirm | Redirects to **`/dashboard`**; password page no longer forced |
| 2.5 | Sign in again with the **new** password | Goes to dashboard; no password gate |

Optional: create a teammate, confirm Audit Log shows **Team Member Added** / **Password Changed** after steps 2.1 and 2.4.

---

## 3. Settings hub

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | As Tenant Admin open **Settings** (`/settings`) | Cards: **Profile**, **Password**, **Organization**, **Team**, **AWS connection**; role badge **Tenant Admin** |
| 3.2 | As Tenant Member open Settings | Same cards; **Team** disabled (“Tenant Admin only”) |
| 3.3 | Header avatar menu | Shows **role** label; **Settings** link (tenant roles) |

---

## 4. Profile

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Settings → **Profile** | Email read-only; name editable |
| 4.2 | Change name → Save | Success message; header / menu shows updated name after refresh |

---

## 5. Password (voluntary)

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Settings → **Password** (account not gated) | Form with current / new / confirm; back link to Settings |
| 5.2 | Wrong current password | Error; stay on page |
| 5.3 | Correct change | Redirect to role home (`/dashboard` or `/platform`) |

---

## 6. Organization

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | As Tenant Admin: Settings → **Organization** | Can rename; Save updates name |
| 6.2 | As Tenant Member: same page | Name visible; save disabled / read-only notice |

---

## 7. Team UI

| Step | Action | Expected |
|------|--------|----------|
| 7.1 | As Tenant Admin: Settings → **Team** | Table: email, name, role, password flag, last login |
| 7.2 | Add member → Create | Temp password alert with Copy; new row in table (`Must change`) |
| 7.3 | As Tenant Member: open `/settings/team` | Forbidden / no permission message (not the admin table) |
| 7.4 | As Member: Settings hub | Team card not clickable |

---

## 8. AWS (regression)

| Step | Action | Expected |
|------|--------|----------|
| 8.1 | Settings → **AWS connection** | Existing AWS panel still loads |

---

## Quick fail signals

- Login always goes to `/dashboard` for Operator → login payload / proxy role missing
- New member reaches dashboard without password page → gate / `mustChangePassword` not enforced
- Team add succeeds but no temp password UI → front-end not reading `temporaryPassword`
- Member can POST `/api/team` → API guard broken (should 403)

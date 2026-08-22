"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Copy,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addTeamMemberSchema,
  type AddTeamMemberInput,
} from "@/lib/validation/team";
import { roleLabel } from "@/lib/auth/home-path";
import {
  teamMemberDeleteBlockReason,
  teamMemberRoleChangeBlockReason,
  type TenantAssignableRole,
} from "@/lib/team-shared";
import { DeleteTeamMemberDialog } from "@/components/settings/delete-team-member-dialog";
import { ChangeTeamMemberRoleDialog } from "@/components/settings/change-team-member-role-dialog";

export type TeamMemberRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  mustChangePassword: boolean;
  lastLoginAt: string | Date | null;
  createdAt: string | Date;
};

type TeamPanelProps = {
  currentAdminId: string;
  initialMembers: TeamMemberRow[];
};

function formatWhen(value: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export function TeamPanel({ currentAdminId, initialMembers }: TeamPanelProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [serverError, setServerError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMemberRow | null>(
    null,
  );
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const [roleTarget, setRoleTarget] = useState<{
    member: TeamMemberRow;
    nextRole: TenantAssignableRole;
  } | null>(null);
  const [roleModalError, setRoleModalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddTeamMemberInput>({
    resolver: zodResolver(addTeamMemberSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "TENANT_MEMBER",
    },
  });

  const sortedMembers = useMemo(
    () =>
      [...members].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [members],
  );

  const tenantAdminCount = useMemo(
    () => members.filter((m) => m.role === "TENANT_ADMIN").length,
    [members],
  );

  async function onSubmit(values: AddTeamMemberInput) {
    setServerError(null);
    setActionError(null);
    setTemporaryPassword(null);
    setCreatedEmail(null);
    setCopied(false);

    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: values.email,
        name: values.name || undefined,
        role: values.role,
      }),
    });

    const body = await response.json();
    if (!response.ok || !body.success) {
      setServerError(body.error ?? "Something went wrong. Please try again.");
      return;
    }

    const member = body.data.member as TeamMemberRow;
    const temp = body.data.temporaryPassword as string;
    setMembers((prev) => [
      ...prev,
      {
        ...member,
        mustChangePassword: true,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
      },
    ]);
    setTemporaryPassword(temp);
    setCreatedEmail(member.email);
    setShowForm(false);
    reset({ email: "", name: "", role: "TENANT_MEMBER" });
    router.refresh();
  }

  async function copyPassword() {
    if (!temporaryPassword) return;
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function openRoleChange(member: TeamMemberRow, nextRole: TenantAssignableRole) {
    const block = teamMemberRoleChangeBlockReason({
      actorId: currentAdminId,
      targetId: member.id,
      targetEmail: member.email,
      currentRole: member.role,
      nextRole,
      tenantAdminCount,
    });
    if (block) {
      setActionError(block);
      return;
    }
    setActionError(null);
    setRoleModalError(null);
    setRoleTarget({ member, nextRole });
  }

  async function confirmRoleChange() {
    if (!roleTarget) return;

    setRoleModalError(null);
    setBusyId(roleTarget.member.id);
    try {
      const response = await fetch(`/api/team/${roleTarget.member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleTarget.nextRole }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setRoleModalError(body.error ?? "Could not update role.");
        return;
      }

      const updated = body.data.member as TeamMemberRow;
      setMembers((prev) =>
        prev.map((row) =>
          row.id === updated.id
            ? {
                ...row,
                role: updated.role,
                name: updated.name,
              }
            : row,
        ),
      );
      setRoleTarget(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function openRemove(member: TeamMemberRow) {
    const block = teamMemberDeleteBlockReason({
      actorId: currentAdminId,
      targetId: member.id,
      targetEmail: member.email,
    });
    if (block) {
      setActionError(block);
      return;
    }

    setActionError(null);
    setDeleteModalError(null);
    setMemberToDelete(member);
  }

  async function confirmRemoveMember() {
    if (!memberToDelete) return;

    setDeleteModalError(null);
    setBusyId(memberToDelete.id);
    try {
      const response = await fetch(`/api/team/${memberToDelete.id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setDeleteModalError(body.error ?? "Could not remove team member.");
        return;
      }
      const removedId = memberToDelete.id;
      setMembers((prev) => prev.filter((row) => row.id !== removedId));
      setMemberToDelete(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {temporaryPassword ? (
        <Alert>
          <AlertDescription>
            <p className="font-medium text-foreground">
              Temporary password for {createdEmail}
            </p>
            <p className="mt-1 text-muted-foreground">
              Copy it now — it will not be shown again. Share it out-of-band;
              they must change it on first sign-in.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="border border-border bg-muted px-2 py-1 font-mono text-sm text-foreground">
                {temporaryPassword}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={copyPassword}>
                {copied ? (
                  <>
                    <Check className="size-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
          <div>
            <p className="text-sm font-medium text-foreground">Members</p>
            <p className="text-sm text-muted-foreground">
              {sortedMembers.length} account
              {sortedMembers.length === 1 ? "" : "s"} in this organization
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setShowForm((open) => !open);
              setServerError(null);
            }}
          >
            <Plus className="size-3.5" />
            {showForm ? "Cancel" : "Add member"}
          </Button>
        </div>

        {showForm ? (
          <form
            className="flex flex-col gap-4 border-b border-border px-4 py-4 md:px-5"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {serverError ? (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="teamEmail">Email</Label>
                <Input
                  id="teamEmail"
                  type="email"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="teamName">Name (optional)</Label>
                <Input
                  id="teamName"
                  type="text"
                  autoComplete="off"
                  {...register("name")}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2 sm:max-w-xs">
                <Label>Role</Label>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (value) field.onChange(value);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TENANT_MEMBER">Member</SelectItem>
                        <SelectItem value="TENANT_ADMIN">Tenant Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <Button type="submit" className="w-fit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="w-[1%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMembers.map((member) => {
              const deleteBlock = teamMemberDeleteBlockReason({
                actorId: currentAdminId,
                targetId: member.id,
                targetEmail: member.email,
              });
              const promoteBlock = teamMemberRoleChangeBlockReason({
                actorId: currentAdminId,
                targetId: member.id,
                targetEmail: member.email,
                currentRole: member.role,
                nextRole: "TENANT_ADMIN",
                tenantAdminCount,
              });
              const demoteBlock = teamMemberRoleChangeBlockReason({
                actorId: currentAdminId,
                targetId: member.id,
                targetEmail: member.email,
                currentRole: member.role,
                nextRole: "TENANT_MEMBER",
                tenantAdminCount,
              });
              const canPromote = !promoteBlock;
              const canDemote = !demoteBlock;
              const canDelete = !deleteBlock;
              const isBusy = busyId === member.id;
              const isSelf = member.id === currentAdminId;
              const hasAnyAction = canPromote || canDemote || canDelete;

              return (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.email}</TableCell>
                  <TableCell>{member.name?.trim() || "—"}</TableCell>
                  <TableCell>{roleLabel(member.role)}</TableCell>
                  <TableCell>
                    {member.mustChangePassword ? (
                      <span className="text-xs text-muted-foreground">
                        Must change
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Set</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatWhen(member.lastLoginAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {!hasAnyAction ? (
                      <span
                        className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                        title={
                          deleteBlock ??
                          promoteBlock ??
                          demoteBlock ??
                          undefined
                        }
                      >
                        {isSelf ? "You" : "Protected"}
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {canPromote ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            disabled={isBusy}
                            onClick={() => openRoleChange(member, "TENANT_ADMIN")}
                          >
                            <ArrowUpFromLine className="size-3.5" />
                            Promote
                          </Button>
                        ) : null}
                        {canDemote ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            disabled={isBusy}
                            onClick={() =>
                              openRoleChange(member, "TENANT_MEMBER")
                            }
                          >
                            <ArrowDownToLine className="size-3.5" />
                            Demote
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={isBusy}
                            onClick={() => openRemove(member)}
                          >
                            {isBusy && memberToDelete?.id === member.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <DeleteTeamMemberDialog
        member={memberToDelete}
        open={Boolean(memberToDelete)}
        isDeleting={Boolean(busyId && memberToDelete)}
        error={deleteModalError}
        onOpenChange={(open) => {
          if (!open && !busyId) {
            setMemberToDelete(null);
            setDeleteModalError(null);
          }
        }}
        onConfirm={confirmRemoveMember}
      />

      <ChangeTeamMemberRoleDialog
        member={roleTarget?.member ?? null}
        nextRole={roleTarget?.nextRole ?? null}
        open={Boolean(roleTarget)}
        isSaving={Boolean(busyId && roleTarget)}
        error={roleModalError}
        onOpenChange={(open) => {
          if (!open && !busyId) {
            setRoleTarget(null);
            setRoleModalError(null);
          }
        }}
        onConfirm={confirmRoleChange}
      />
    </div>
  );
}

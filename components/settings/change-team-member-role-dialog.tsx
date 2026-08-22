"use client";

import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { roleLabel } from "@/lib/auth/home-path";
import type { TenantAssignableRole } from "@/lib/team-shared";

type RoleChangeMember = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

type ChangeTeamMemberRoleDialogProps = {
  member: RoleChangeMember | null;
  nextRole: TenantAssignableRole | null;
  open: boolean;
  isSaving: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ChangeTeamMemberRoleDialog({
  member,
  nextRole,
  open,
  isSaving,
  error,
  onOpenChange,
  onConfirm,
}: ChangeTeamMemberRoleDialogProps) {
  const isPromote = nextRole === "TENANT_ADMIN";
  const title = isPromote ? "Promote to Tenant Admin" : "Demote to Member";
  const Icon = isPromote ? ArrowUpFromLine : ArrowDownToLine;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSaving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={!isSaving} className="overflow-hidden">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-muted">
              <Icon className="size-5 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">
                {isPromote
                  ? "They will get full write access for this organization, including team and AWS settings."
                  : "They will keep read access to audits and reports, but lose admin write permissions."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          {member && nextRole ? (
            <div className="border border-border bg-card px-3 py-2.5">
              <p className="truncate text-sm font-medium text-foreground">
                {member.email}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {member.name?.trim() || "No display name"}
              </p>
              <p className="mt-2 text-sm text-foreground">
                <span className="text-muted-foreground">
                  {roleLabel(member.role)}
                </span>
                <span className="mx-2 text-muted-foreground">→</span>
                <span className="font-medium">{roleLabel(nextRole)}</span>
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={isSaving} onClick={onConfirm}>
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : isPromote ? (
              <>
                <ArrowUpFromLine className="size-4" />
                Promote
              </>
            ) : (
              <>
                <ArrowDownToLine className="size-4" />
                Demote
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

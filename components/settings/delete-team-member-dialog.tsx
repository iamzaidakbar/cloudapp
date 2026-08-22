"use client";

import { useEffect, useId, useState } from "react";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type DeletableMember = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

type DeleteTeamMemberDialogProps = {
  member: DeletableMember | null;
  open: boolean;
  isDeleting: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteTeamMemberDialog({
  member,
  open,
  isDeleting,
  error,
  onOpenChange,
  onConfirm,
}: DeleteTeamMemberDialogProps) {
  const inputId = useId();
  const [typedEmail, setTypedEmail] = useState("");

  useEffect(() => {
    if (open) {
      setTypedEmail("");
    }
  }, [open, member?.id]);

  const emailMatches =
    Boolean(member) &&
    typedEmail.trim().toLowerCase() === member!.email.trim().toLowerCase();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isDeleting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={!isDeleting} className="overflow-hidden">
        <DialogHeader className="border-b-destructive/20 bg-destructive/5">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center border border-destructive/40 bg-destructive/10">
              <TriangleAlert className="size-5 text-destructive" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>Remove team member</DialogTitle>
              <DialogDescription className="mt-1">
                This permanently deletes their account. They will not be able to
                sign in again.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          {member ? (
            <div className="border border-border bg-card px-3 py-2.5">
              <p className="truncate text-sm font-medium text-foreground">
                {member.email}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {member.name?.trim() || "No display name"} ·{" "}
                {roleLabel(member.role)}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={inputId}>
              Type{" "}
              <span className="font-mono text-foreground">
                {member?.email ?? "email"}
              </span>{" "}
              to confirm
            </Label>
            <Input
              id={inputId}
              type="email"
              autoComplete="off"
              autoFocus
              spellCheck={false}
              placeholder={member?.email}
              value={typedEmail}
              disabled={isDeleting || !member}
              aria-invalid={typedEmail.length > 0 && !emailMatches}
              onChange={(event) => setTypedEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && emailMatches && !isDeleting) {
                  event.preventDefault();
                  onConfirm();
                }
              }}
            />
            {typedEmail.length > 0 && !emailMatches ? (
              <p className="text-xs text-destructive">
                Email does not match. Type it exactly to enable delete.
              </p>
            ) : null}
          </div>

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
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!emailMatches || isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Removing…
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Delete user
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

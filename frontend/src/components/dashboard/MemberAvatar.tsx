"use client";

import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/components/ui/utils";

export function MemberAvatar({ member, className, fallbackClassName }: {
  member?: { name: string; profilePicture?: string | null };
  className?: string;
  fallbackClassName?: string;
}) {
  const initials = member?.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <Avatar className={cn("size-8", className)} aria-hidden="true">
      {member?.profilePicture ? <AvatarImage src={member.profilePicture} alt="" className="object-cover" /> : null}
      <AvatarFallback className={cn(member ? "bg-[#213f68] text-[10px] font-bold text-white" : "bg-slate-100 text-slate-400", fallbackClassName)}>
        {initials || <UserRound className="size-4" />}
      </AvatarFallback>
    </Avatar>
  );
}

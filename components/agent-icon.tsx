import {
  ClipboardList,
  FileDiff,
  FolderSearch,
  Radar,
  Table2,
} from "lucide-react";
import type { AgentIconName } from "@/lib/agents/types";

const ICONS = {
  "clipboard-list": ClipboardList,
  "folder-search": FolderSearch,
  table: Table2,
  "file-diff": FileDiff,
  radar: Radar,
} as const;

export function AgentIcon({
  icon,
  className,
}: {
  icon: AgentIconName;
  className?: string;
}) {
  const Icon = ICONS[icon];
  return <Icon className={className} />;
}

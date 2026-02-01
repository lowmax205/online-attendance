"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChangeCategory {
  category: string;
  items: string[];
}

interface UpdateEntry {
  version: string;
  date: string;
  changes: ChangeCategory[];
}

interface ChangelogDisplayProps {
  updates: UpdateEntry[];
  maxVersions?: number;
}

export function ChangelogDisplay({
  updates,
  maxVersions = 10,
}: ChangelogDisplayProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
    new Set([updates[0]?.version]),
  );

  const displayUpdates = updates.slice(0, maxVersions);

  const toggleVersion = (version: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(version)) {
      newExpanded.delete(version);
    } else {
      newExpanded.add(version);
    }
    setExpandedVersions(newExpanded);
  };

  return (
    <div className="space-y-2">
      {displayUpdates.map((update) => (
        <Collapsible
          key={update.version}
          open={expandedVersions.has(update.version)}
          onOpenChange={() => toggleVersion(update.version)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between h-auto py-3 px-4 hover:bg-muted"
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold text-base">
                  Version {update.version}
                </span>
                <span className="text-xs text-muted-foreground">
                  {update.date}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200",
                  expandedVersions.has(update.version) && "rotate-180",
                )}
              />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="px-4 py-4 bg-muted/40 border-l-2 border-primary/20 space-y-4">
            {update.changes.map((category, catIdx) => (
              <div key={catIdx} className="space-y-2">
                <h4 className="text-sm font-semibold text-primary">
                  {category.category}
                </h4>
                <ul className="space-y-1.5 ml-2">
                  {category.items.map((item, itemIdx) => (
                    <li
                      key={itemIdx}
                      className="text-sm text-foreground/90 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-muted-foreground"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

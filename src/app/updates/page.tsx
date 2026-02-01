import { ChangelogDisplay } from "@/components/changelog-display";
import { parseChangelog } from "@/lib/changelog-parser";
import { readFileSync } from "fs";
import { join } from "path";

export const metadata = {
  title: "Updates & Changelog",
  description:
    "View the latest updates and version history of the Event Attendance System",
};

export default function UpdatesPage() {
  // Read changelog at build time
  const changelogPath = join(process.cwd(), "CHANGELOG.md");
  const changelogContent = readFileSync(changelogPath, "utf-8");
  const updates = parseChangelog(changelogContent);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Latest Updates</h1>
        <p className="text-lg text-muted-foreground">
          View the latest version updates and improvements to the Event
          Attendance System. Click on any version to see the detailed changes.
        </p>
      </div>

      {/* Changelog */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold mb-6">Version History</h2>
        <ChangelogDisplay updates={updates} maxVersions={10} />
      </div>
    </div>
  );
}

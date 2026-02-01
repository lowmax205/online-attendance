import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Serves the event-print HTML template without exposing src/ via public assets
export async function GET() {
  const templatePath = path.join(
    process.cwd(),
    "src",
    "lib",
    "export",
    "templates",
    "event-print.html",
  );

  try {
    const html = await fs.readFile(templatePath, "utf-8");
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Failed to load event-print template", error);
    return new NextResponse("Template not found", { status: 404 });
  }
}

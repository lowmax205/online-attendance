/**
 * PDF Export Generation (via HTML)
 * Generates PDF-ready HTML documents from attendance records
 * Can be converted to PDF on the client side or server-side
 */

import { readFileSync } from "fs";
import path from "path";

import { format } from "date-fns";

export interface AttendanceRecord {
  User_Attendance_userIdToUser: {
    firstName: string;
    lastName: string;
    UserProfile: {
      studentId: string;
      course: string;
      department: string;
      campus: string;
    } | null;
  };
  checkInSubmittedAt: Date | null;
  checkOutSubmittedAt: Date | null;
  checkInSignature: string | null;
  checkOutSignature: string | null;
}

/**
 * Format date for PDF export
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "MMM dd, yyyy h:mm a");
  } catch {
    return "-";
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const templatePath = path.join(
  process.cwd(),
  "src",
  "lib",
  "export",
  "templates",
  "attendance-records.html",
);

let templateCache: string | null = null;

function loadTemplate(): string {
  if (templateCache) return templateCache;
  try {
    templateCache = readFileSync(templatePath, "utf-8");
    return templateCache;
  } catch {
    // Fallback to minimal HTML if template is missing
    return "<html><body><p>Attendance export template not found.</p></body></html>";
  }
}

/**
 * Convert image file to base64 data URL
 */
function imageToDataURL(imagePath: string): string {
  try {
    const imageBuffer = readFileSync(imagePath);
    const base64 = imageBuffer.toString("base64");
    const ext = imagePath.split(".").pop()?.toLowerCase() || "png";
    const mimeType = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
    return `data:${mimeType};base64,${base64}`;
  } catch {
    // Return empty data URL if file not found
    return "data:image/svg+xml;base64,";
  }
}

/**
 * Generate HTML content for PDF export
 * Can be rendered to PDF using puppeteer, wkhtmltopdf, or sent to client for printing
 *
 * @param records Attendance records to export
 * @param eventName Name of the event
 * @param eventDate Start date of the event
 * @param isCheckIn Whether this is check-in or check-out data
 * @returns HTML string ready for PDF conversion
 */
export function generateAttendancePDFHTML(
  records: AttendanceRecord[],
  courseName: string,
  isCheckIn: boolean,
): string {
  const timeLabel = isCheckIn ? "Check-In" : "Check-Out";
  const signatureLabel = isCheckIn ? "Check-In" : "Check-Out";

  // Load logos as base64 data URLs
  const systemLogoPath = path.join(
    process.cwd(),
    "public",
    "images",
    "logo.svg",
  );
  const universityLogoPath = path.join(
    process.cwd(),
    "public",
    "images",
    "USC-Logo.png",
  );
  const systemLogo = imageToDataURL(systemLogoPath);
  const universityLogo = imageToDataURL(universityLogoPath);

  // Extract unique campuses from records
  const campuses = Array.from(
    new Set(
      records
        .map((r) => r.User_Attendance_userIdToUser.UserProfile?.campus)
        .filter(Boolean),
    ),
  ).sort();
  const campusInfo = campuses.length > 0 ? campuses.join(", ") : "All Campuses";

  const tableRows = records
    .map((record) => {
      const timeValue = isCheckIn
        ? record.checkInSubmittedAt
        : record.checkOutSubmittedAt;
      const signatureUrl = isCheckIn
        ? record.checkInSignature
        : record.checkOutSignature;
      const formattedTime = formatDate(timeValue);

      const studentId =
        record.User_Attendance_userIdToUser.UserProfile?.studentId || "-";
      const name = `${record.User_Attendance_userIdToUser.firstName} ${record.User_Attendance_userIdToUser.lastName}`;
      const course =
        record.User_Attendance_userIdToUser.UserProfile?.course || "-";
      const department =
        record.User_Attendance_userIdToUser.UserProfile?.department || "-";

      return `
        <tr>
          <td>${escapeHtml(studentId)}</td>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(course)}</td>
          <td>${escapeHtml(department)}</td>
          <td>${escapeHtml(formattedTime)}</td>
          ${signatureUrl ? `<td><img src="${signatureUrl}" alt="Signature" style="max-height: 40px; max-width: 100px;"></td>` : "<td>-</td>"}
        </tr>
      `;
    })
    .join("");

  const template = loadTemplate();

  const replacements: Record<string, string> = {
    TITLE: `${escapeHtml(courseName || "Attendance") || "Attendance"} - ${timeLabel} Records`,
    COURSE_NAME: escapeHtml(courseName || "All Courses/Programs"),
    REPORT_TYPE: `${timeLabel} Records`,
    TOTAL_RECORDS: String(records.length),
    EXPORT_DATE: format(new Date(), "MMMM dd, yyyy 'at' h:mm a"),
    TIME_LABEL: timeLabel,
    SIGNATURE_LABEL: signatureLabel,
    CAMPUS_INFO: escapeHtml(campusInfo),
    SYSTEM_LOGO: systemLogo,
    UNIVERSITY_LOGO: universityLogo,
    TABLE_ROWS: tableRows.trim() || "",
  };

  const html = Object.entries(replacements).reduce((acc, [key, value]) => {
    return acc.replaceAll(`{{${key}}}`, value);
  }, template);

  return html;
}

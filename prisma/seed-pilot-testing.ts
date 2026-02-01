import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import path from "path";

/**
 * Get the appropriate database URL based on the environment
 */
function getDatabaseUrl(): string {
  const nodeEnv = process.env.NODE_ENV;

  // If DATABASE_URL is set, use it (for local development and build)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  throw new Error("DATABASE_URL is required");
}
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

type ParsedStudent = {
  studentId: string;
  lastName: string;
  firstName: string; // keep as provided (may include middle initial)
};

async function parseStudentsFromFile(
  fileRelativePath: string,
): Promise<ParsedStudent[]> {
  const filePath = path.resolve(process.cwd(), fileRelativePath);
  const raw = await readFile(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l, idx, arr) => !(l === "" && arr[idx - 1] === ""));

  const students: ParsedStudent[] = [];
  const idRegex = /^\d{4}-\d{5}$/;

  for (let i = 0; i < lines.length; i++) {
    const idLine = lines[i];
    if (!idRegex.test(idLine)) continue;
    // next non-empty line should be the name
    let j = i + 1;
    while (j < lines.length && lines[j] === "") j++;
    if (j >= lines.length) break;
    const nameLine = lines[j];
    const commaIdx = nameLine.indexOf(",");
    if (commaIdx === -1) continue; // skip malformed
    const lastName = nameLine.slice(0, commaIdx).trim();
    const firstName = nameLine.slice(commaIdx + 1).trim();

    students.push({ studentId: idLine, lastName, firstName });
    i = j; // advance pointer
  }

  return students;
}

async function main() {
  console.log("🌱 Starting PILOT TESTING seed: BSCS Year 4 Section A");

  // Clear existing data
  console.log("🧹 Cleaning existing data...");
  await prisma.attendance.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.exportRecord.deleteMany({});
  await prisma.userProfile.deleteMany({});
  await prisma.securityLog.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});
  // Hash password for students
  const studentPassword = await hash("Student123!", 10);
  // Hash password for admin
  const adminPassword = await hash("Admin@2025!", 10);

  // Create Administrator account
  console.log("👑 Creating Administrator account (admin@snsu.ph)...");
  const adminUser = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: "admin@snsu.ph",
      passwordHash: adminPassword,
      firstName: "System",
      lastName: "Administrator",
      role: "Administrator",
      emailVerified: true,
      accountStatus: "ACTIVE",
      UserProfile: {
        create: {
          id: randomUUID(),
          updatedAt: new Date(),
          studentId: "2025-00001",
          department: "CCIS",
          course: "BSCS",
          yearLevel: 4,
          section: "A",
          campus: "MainCampus",
          contactNumber: "09051234567",
          documentUrls: [],
        },
      },
    },
  });

  // Parse students
  console.log("📄 Reading students from prisma/student_name.txt...");
  const students = await parseStudentsFromFile(
    path.join("prisma", "student_name.txt"),
  );
  console.log(`🎓 Found ${students.length} students`);

  // Create students (BSCS, Year 4, Section A)
  let created = 0;
  const createdStudents: { id: string; email: string }[] = [];
  const emailCounts = new Map<string, number>();

  function toEmailForStudent(
    firstNameRaw: string,
    lastNameRaw: string,
  ): string {
    const initial = (firstNameRaw.match(/[A-Za-z]/)?.[0] || "").toLowerCase();
    const last = lastNameRaw
      .normalize("NFKD")
      .replace(/[^A-Za-z]/g, "")
      .toLowerCase();
    let base = `${initial}${last}`;
    if (!base) base = `student${Math.random().toString(36).slice(2, 8)}`;
    const count = (emailCounts.get(base) || 0) + 1;
    emailCounts.set(base, count);
    return count === 1 ? `${base}@snsu.edu.ph` : `${base}${count}@snsu.edu.ph`;
  }

  function randomPHNumber(): string {
    const prefixes = [
      "0905",
      "0906",
      "0915",
      "0916",
      "0917",
      "0920",
      "0921",
      "0922",
      "0923",
      "0927",
      "0928",
      "0929",
      "0935",
      "0936",
      "0937",
      "0945",
      "0946",
      "0947",
      "0951",
      "0956",
      "0961",
      "0966",
      "0967",
      "0977",
      "0978",
      "0979",
      "0981",
      "0991",
      "0992",
      "0994",
      "0995",
      "0997",
    ];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const rest = String(Math.floor(Math.random() * 1_0000_0000)).padStart(
      7,
      "0",
    );
    return `${p}${rest}`; // 11 digits total
  }

  for (const s of students) {
    const email = toEmailForStudent(s.firstName, s.lastName);
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        passwordHash: studentPassword,
        firstName: s.firstName, // keep original formatting
        lastName: s.lastName, // keep original formatting
        role: "Student",
        emailVerified: true,
        accountStatus: "ACTIVE",
        UserProfile: {
          create: {
            id: randomUUID(),
            updatedAt: new Date(),
            studentId: s.studentId, // keep as provided
            course: "BSCS",
            yearLevel: 4,
            section: "A",
            department: "CCIS",
            campus: "MainCampus",
            contactNumber: randomPHNumber(),
            documentUrls: [],
          },
        },
      },
    });
    created++;
    createdStudents.push({ id: user.id, email: user.email });
  }

  // Create a single event for BSCS-4A
  console.log("\n📅 Creating BSCS-4A Pilot Event...");
  const venueLat = 9.787888575264288;
  const venueLng = 125.4943942164429;
  const now = new Date();
  // Generate a random date 2-3 weeks in the past
  const daysInPast = 14 + Math.floor(Math.random() * 8); // 14-21 days
  const startDateTime = new Date(now);
  startDateTime.setDate(startDateTime.getDate() - daysInPast);
  startDateTime.setHours(9, 0, 0, 0);
  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(startDateTime.getHours() + 2);

  const event = await prisma.event.create({
    data: {
      id: randomUUID(),
      eventCode: `PILOT-BSCS4A-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      name: "Pilot Testing for BSCS-4A",
      description:
        "Pilot testing session for BSCS-4A students to validate the Event Attendance System with QR, GPS, and signature.",
      startDateTime,
      endDateTime,
      venueName: "EB302",
      venueAddress: "Surigao City",
      venueLatitude: venueLat,
      venueLongitude: venueLng,
      qrCodePayload: `attendance:pilot-bscs-4a:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
      qrCodeUrl: "https://placehold.co/400x400.png?text=QR+BSCS-4A",
      status: "Completed",
      createdById: adminUser.id,
      updatedAt: new Date(),
    },
  });

  // Create attendance for each student with scattered GPS and image placeholders
  console.log("📝 Creating attendance for each student...");
  const meterDeg = 0.00009; // ≈ 10m per unit
  let attendanceCount = 0;
  for (const student of createdStudents) {
    // Check-in within ±12.5 minutes around start
    const ci = new Date(startDateTime);
    const ciOffsetMs = (Math.random() - 0.5) * 25 * 60 * 1000;
    ci.setTime(ci.getTime() + ciOffsetMs);

    const latOffsetIn = (Math.random() - 0.5) * meterDeg * 2;
    const lngOffsetIn = (Math.random() - 0.5) * meterDeg * 2;
    const distanceIn =
      Math.random() < 0.92 ? Math.random() * 60 : 60 + Math.random() * 50;

    // Check-out 1.5-2h after check-in
    const co = new Date(ci);
    const coOffsetMs = (90 + Math.random() * 30) * 60 * 1000;
    co.setTime(co.getTime() + coOffsetMs);

    const latOffsetOut = (Math.random() - 0.5) * meterDeg * 2;
    const lngOffsetOut = (Math.random() - 0.5) * meterDeg * 2;
    const distanceOut =
      Math.random() < 0.92 ? Math.random() * 60 : 60 + Math.random() * 50;

    await prisma.attendance.create({
      data: {
        id: randomUUID(),
        eventId: event.id,
        userId: student.id,
        checkInSubmittedAt: ci,
        checkInLatitude: venueLat + latOffsetIn,
        checkInLongitude: venueLng + lngOffsetIn,
        checkInDistance: distanceIn,
        checkInFrontPhoto:
          "https://placehold.co/400x400.jpg?text=CheckIn-Front",
        checkInBackPhoto: "https://placehold.co/400x400.jpg?text=CheckIn-Back",
        checkInSignature: "https://placehold.co/400x200.png?text=Signature-In",
        checkOutSubmittedAt: co,
        checkOutLatitude: venueLat + latOffsetOut,
        checkOutLongitude: venueLng + lngOffsetOut,
        checkOutDistance: distanceOut,
        checkOutFrontPhoto:
          "https://placehold.co/400x400.jpg?text=CheckOut-Front",
        checkOutBackPhoto:
          "https://placehold.co/400x400.jpg?text=CheckOut-Back",
        checkOutSignature:
          "https://placehold.co/400x200.png?text=Signature-Out",
      },
    });
    attendanceCount++;
  }

  console.log("\n📊 PILOT TESTING SEED SUMMARY");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`👤 Users created (Students only): ${created}`);
  console.log("   • Course: Computer Science");
  console.log("   • Year Level: 4");
  console.log("   • Section: A");
  console.log(`\n📅 Event created: ${event.name}`);
  console.log(`   • Start: ${startDateTime.toISOString()}`);
  console.log(`   • End:   ${endDateTime.toISOString()}`);
  console.log(`   • Venue: ${venueLat.toFixed(6)}, ${venueLng.toFixed(6)}`);
  console.log(`📝 Attendance records: ${attendanceCount}`);
  console.log("\n🎉 Seed completed successfully!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

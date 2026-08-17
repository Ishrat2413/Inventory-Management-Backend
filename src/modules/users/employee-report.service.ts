import PDFDocument from 'pdfkit';
import prisma from '../../utils/prisma/prisma-client';
import { getEmployeePerformance } from './employee-performance.service';

const BRAND_COLOR = '#6366f1'; // indigo
const GRAY        = '#64748b';
const LIGHT_GRAY  = '#f1f5f9';
const DARK        = '#1e293b';

const formatCurrency = (val: number) =>
  `BDT ${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const formatDate = (d?: Date | string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Helper: draw a labelled row ─────────────────────────────────────────────
const row = (
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  value: string,
  y: number,
  pageWidth: number,
) => {
  doc.fontSize(9).fillColor(GRAY).text(label, 50, y, { width: 180 });
  doc.fontSize(9).fillColor(DARK).text(value, 230, y, { width: pageWidth - 280 });
};

// ── Helper: section header ───────────────────────────────────────────────────
const sectionHeader = (
  doc: InstanceType<typeof PDFDocument>,
  title: string,
  pageWidth: number,
) => {
  doc.moveDown(0.5);
  const y = doc.y;
  doc.rect(50, y, pageWidth - 100, 22).fill(BRAND_COLOR);
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text(title, 58, y + 6);
  doc.moveDown(0.3).font('Helvetica');
};

// ── Helper: draw a grid of rows ─────────────────────────────────────────────
const drawRows = (
  doc: InstanceType<typeof PDFDocument>,
  rows: [string, string][],
  pageWidth: number,
) => {
  let y = doc.y;
  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) doc.rect(50, y, pageWidth - 100, 20).fill(LIGHT_GRAY);
    row(doc, label, value, y + 5, pageWidth);
    y += 20;
  });
  doc.y = y + 8;
};

// ── Previous month helper ────────────────────────────────────────────────────
export const previousMonth = (now = new Date()) => {
  const m = now.getUTCMonth(); // 0-indexed
  const y = now.getUTCFullYear();
  if (m === 0) return { year: y - 1, month: 12 };
  return { year: y, month: m }; // m is already last month (1-indexed)
};

export const generateEmployeeReportPdf = async (
  userId: string,
  year: number,
  month: number,
): Promise<Buffer> => {
  // ── Fetch all data ─────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employeeProfile: true,
      employeeDocuments: {
        where: { isVerified: true },
        orderBy: { uploadedAt: 'desc' },
        take: 10,
      },
    },
  });
  if (!user) throw new Error('User not found');

  // Fetch all employee records (dynamic content types — e.g. bank info)
  const employeeRecords = await prisma.employeeRecord.findMany({
    where: { userId },
    include: {
      contentType: {
        include: { fields: { orderBy: { order: 'asc' } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const performance = await getEmployeePerformance(userId, year, month);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;

    // ── Header Banner ─────────────────────────────────────────────────────
    doc.rect(0, 0, pageWidth, 80).fill(BRAND_COLOR);
    doc
      .fillColor('#ffffff')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('Employee Report', 50, 24);
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        `${MONTH_NAMES[month]} ${year}  ·  Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`,
        50,
        54,
      );

    doc.moveDown(2);

    // ── Employee Information ──────────────────────────────────────────────
    sectionHeader(doc, 'Employee Information', pageWidth);
    doc.moveDown(0.4);

    const profile = user.employeeProfile;
    drawRows(doc, [
      ['Full Name',   user.name ?? '—'],
      ['Employee ID', user.id.slice(0, 8).toUpperCase()],
      ['Email',       user.email],
      ['Phone',       user.phone ?? '—'],
      ['Address',     user.address ?? '—'],
      ['Department',  profile?.department ?? '—'],
      ['Join Date',   formatDate(profile?.joinDate)],
    ], pageWidth);

    // ── Employment & Pay Information ─────────────────────────────────────
    sectionHeader(doc, 'Employment & Pay Information', pageWidth);
    doc.moveDown(0.4);

    drawRows(doc, [
      ['Pay Mode',       profile?.payCalculationMode ?? '—'],
      ['Hourly Rate',    profile ? formatCurrency(Number(profile.hourlyRate)) + '/hr' : '—'],
      ['Daily Rate',     profile?.dailyRate ? formatCurrency(Number(profile.dailyRate)) + '/day' : '—'],
      ['OT Multiplier',  profile ? `${profile.overtimeMultiplier}×` : '—'],
    ], pageWidth);

    // ── Dynamic Records (Bank Info, Emergency Contact, etc.) ─────────────
    for (const record of employeeRecords) {
      const data = record.data as Record<string, unknown>;
      const hasData = Object.values(data).some((v) => v != null && v !== '');
      if (!hasData) continue;

      sectionHeader(doc, record.contentType.name, pageWidth);
      doc.moveDown(0.4);

      const recordRows: [string, string][] = record.contentType.fields
        .map((field: { id: string; label: string; fieldType: string }) => {
          const val = data[field.id];
          if (val == null || val === '') return null;
          const display = field.fieldType === 'checkbox' ? (val ? 'Yes' : 'No') : String(val);
          return [field.label, display] as [string, string];
        })
        .filter((r: [string, string] | null): r is [string, string] => r !== null);

      if (recordRows.length) drawRows(doc, recordRows, pageWidth);
    }

    // ── Performance Summary ───────────────────────────────────────────────
    sectionHeader(doc, `Monthly Performance — ${MONTH_NAMES[month]} ${year}`, pageWidth);
    doc.moveDown(0.4);

    const t = performance.tasks;
    const a = performance.attendance;
    const e = performance.earnings;

    drawRows(doc, [
      ['Tasks Assigned',       String(t.assigned)],
      ['Tasks Completed',      String(t.completed)],
      ['Tasks In Progress',    String(t.inProgress)],
      ['Tasks Pending',        String(t.pending)],
      ['Tasks Cancelled',      String(t.cancelled)],
      ['Completion Rate',      `${t.completionRate}%`],
      ['Days Worked',          String(a.daysWorked)],
      ['Total Hours',          `${a.totalHours} hrs`],
      ['Regular Hours',        `${a.regularHours} hrs`],
      ['Overtime Hours',       `${a.overtimeHours} hrs`],
    ], pageWidth);

    // ── Earnings Summary ─────────────────────────────────────────────────
    sectionHeader(doc, 'Earnings Summary', pageWidth);
    doc.moveDown(0.4);

    drawRows(doc, [
      ['Hourly Rate',            formatCurrency(e.hourlyRate) + '/hr'],
      ['Daily Rate',             formatCurrency(e.dailyRate) + '/day'],
      ['Est. Daily Income',      formatCurrency(e.estimatedDailyIncome)],
      ['Regular Pay',            formatCurrency(e.regularPay)],
      ['Overtime Pay',           formatCurrency(e.overtimePay)],
    ], pageWidth);

    // Total box
    const totalY = doc.y;
    doc
      .rect(50, totalY, pageWidth - 100, 30)
      .fill(BRAND_COLOR)
      .fillColor('#ffffff')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Total Estimated Pay', 58, totalY + 9, { continued: true, width: 200 })
      .text(formatCurrency(e.totalEstimatedPay), { align: 'right', width: pageWidth - 160 });
    doc.moveDown(1.5).font('Helvetica');

    // ── Verified Documents ───────────────────────────────────────────────
    if (user.employeeDocuments.length > 0) {
      sectionHeader(doc, 'Verified Documents', pageWidth);
      doc.moveDown(0.4);

      const docRows: [string, string][] = user.employeeDocuments.map((d) => [
        d.documentType,
        `${d.name}  (uploaded ${formatDate(d.uploadedAt)})`,
      ]);
      drawRows(doc, docRows, pageWidth);
    }

    // ── Completed Task Dates ─────────────────────────────────────────────
    if (t.completedTaskDates.length > 0) {
      sectionHeader(doc, 'Task Completion Timeline', pageWidth);
      doc.moveDown(0.4);

      // Group by date
      const grouped: Record<string, number> = {};
      for (const d of t.completedTaskDates) {
        grouped[d] = (grouped[d] ?? 0) + 1;
      }
      const timelineRows: [string, string][] = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => [formatDate(date), `${count} task${count > 1 ? 's' : ''} completed`]);

      drawRows(doc, timelineRows, pageWidth);
    }

    // ── Footer ───────────────────────────────────────────────────────────
    doc
      .fillColor(GRAY)
      .fontSize(8)
      .text(
        `This report is system-generated and confidential. © ${new Date().getFullYear()} Dabang Inventory System`,
        50,
        doc.page.height - 40,
        { align: 'center', width: pageWidth - 100 },
      );

    doc.end();
  });
};

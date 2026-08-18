import PDFDocument from 'pdfkit';
import prisma from '../../utils/prisma/prisma-client';
import { getEmployeePerformance } from './employee-performance.service';

const BRAND_COLOR = '#6366f1'; // indigo
const BRAND_DARK  = '#4338ca';
const GRAY        = '#64748b';
const LIGHT_GRAY  = '#f1f5f9';
const DARK        = '#1e293b';
const RULE_COLOR  = '#e2e8f0';

const PAGE_MARGIN   = 50;
const BOTTOM_MARGIN = 66; // reserved for the footer rule + text
const CONTINUATION_HEADER_HEIGHT = 46;

type PillKind = 'ok' | 'warn' | 'neutral';
const PILL_COLORS: Record<PillKind, [string, string]> = {
  ok:      ['#15803d', '#dcfce7'],
  warn:    ['#b45309', '#fef3c7'],
  neutral: ['#475569', '#e2e8f0'],
};

type RowEntry =
  | { label: string; value: string }
  | { label: string; pill: { text: string; kind: PillKind } };

const formatCurrency = (val: number, currency = 'BDT') =>
  `${currency} ${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const formatDate = (d?: Date | string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Previous calendar month, handling the January → December-of-prior-year wrap. */
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
        orderBy: { uploadedAt: 'desc' },
        take: 50,
      },
    },
  });
  if (!user) throw new Error('User not found');

  // All dynamic content-type records (e.g. Bank Info, Emergency Contact) —
  // this endpoint is already ownership/role-gated upstream (self or ADMIN
  // only, enforced in users.controller.ts), so it's safe to include every
  // record the employee has on file.
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
  const currency = performance.earnings.currency || 'BDT';

  return new Promise((resolve, reject) => {
    // Bottom margin is kept small on purpose: the footer is drawn near the
    // physical bottom edge (see the footer loop below), and pdfkit refuses
    // to place text below `page.height - margins.bottom` — it silently
    // starts a new page instead. Content pagination is governed entirely by
    // our own BOTTOM_MARGIN/ensureSpace logic, not by this value.
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 20 },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const employeeName = user.name ?? user.email;
    const periodLabel = `${MONTH_NAMES[month]} ${year}`;
    let currentSectionTitle = '';

    // ── Slim continuation header, drawn automatically on every page after
    // the first (the first page already has its own full banner below, and
    // pdfkit's constructor creates page 1 before this listener is attached,
    // so this only ever fires for page 2 onward). ──────────────────────────
    doc.on('pageAdded', () => {
      doc.rect(0, 0, pageWidth, CONTINUATION_HEADER_HEIGHT).fill(BRAND_COLOR);
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`Employee Report  ·  ${employeeName}  ·  ${periodLabel}`, PAGE_MARGIN, 16, {
          width: pageWidth - PAGE_MARGIN * 2,
          lineBreak: false,
        });
      doc.x = PAGE_MARGIN;
      doc.y = CONTINUATION_HEADER_HEIGHT + 18;
      doc.font('Helvetica').fillColor(DARK);
    });

    // ── Layout helpers ──────────────────────────────────────────────────────
    const ensureSpace = (needed: number) => {
      const limit = doc.page.height - BOTTOM_MARGIN;
      if (doc.y + needed > limit) {
        doc.addPage(); // synchronously triggers the 'pageAdded' handler above
        if (currentSectionTitle) {
          doc
            .fontSize(8)
            .fillColor(GRAY)
            .font('Helvetica-Oblique')
            .text(`${currentSectionTitle} (continued)`, PAGE_MARGIN, doc.y, {
              width: pageWidth - PAGE_MARGIN * 2,
              lineBreak: false,
            });
          doc.x = PAGE_MARGIN;
          doc.moveDown(0.6).font('Helvetica').fillColor(DARK);
        }
      }
    };

    const sectionHeader = (title: string) => {
      ensureSpace(50);
      currentSectionTitle = title;
      doc.moveDown(0.5);
      const y = doc.y;
      doc.rect(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN * 2, 22).fill(BRAND_COLOR);
      doc
        .fillColor('#ffffff')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(title, PAGE_MARGIN + 8, y + 6, { width: pageWidth - PAGE_MARGIN * 2 - 16, lineBreak: false });
      doc.x = PAGE_MARGIN;
      doc.y = y + 22;
      doc.moveDown(0.3).font('Helvetica').fillColor(DARK);
    };

    const drawPill = (text: string, rightX: number, y: number, kind: PillKind) => {
      doc.font('Helvetica-Bold').fontSize(8);
      const w = doc.widthOfString(text) + 14;
      const x = rightX - w;
      const [fg, bg] = PILL_COLORS[kind];
      doc.roundedRect(x, y, w, 15, 7.5).fill(bg);
      doc.fillColor(fg).text(text, x, y + 3.5, { width: w, align: 'center', lineBreak: false });
      doc.font('Helvetica').fillColor(DARK);
      return w;
    };

    const drawEntries = (entries: RowEntry[]) => {
      entries.forEach((entry, i) => {
        ensureSpace(22);
        const y = doc.y;
        if (i % 2 === 0) doc.rect(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN * 2, 20).fill(LIGHT_GRAY);
        doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(entry.label, PAGE_MARGIN + 8, y + 5, { width: 200 });
        if ('pill' in entry) {
          drawPill(entry.pill.text, pageWidth - PAGE_MARGIN - 8, y + 3, entry.pill.kind);
        } else {
          doc.fontSize(9).fillColor(DARK).text(entry.value, 230, y + 5, { width: pageWidth - 280 });
        }
        doc.y = y + 20;
      });
      doc.y += 8;
    };

    // ── Cover banner (page 1 only) ───────────────────────────────────────
    doc.rect(0, 0, pageWidth, 90).fill(BRAND_COLOR);
    doc.rect(0, 86, pageWidth, 4).fill(BRAND_DARK);
    const bannerWidth = pageWidth - PAGE_MARGIN * 2;
    doc
      .fillColor('#ffffff')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('Employee Report', PAGE_MARGIN, 22, { width: bannerWidth, lineBreak: false });
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(employeeName, PAGE_MARGIN, 50, { width: bannerWidth, lineBreak: false });
    doc
      .fontSize(9)
      .fillColor('#e0e7ff')
      .text(
        `${periodLabel}  ·  Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`,
        PAGE_MARGIN,
        68,
        { width: bannerWidth, lineBreak: false },
      );
    drawPill(user.isActive ? 'Active' : 'Inactive', pageWidth - PAGE_MARGIN, 24, user.isActive ? 'ok' : 'neutral');

    doc.x = PAGE_MARGIN;
    doc.y = 110;
    doc.fillColor(DARK).font('Helvetica');

    // ── Personal Information ─────────────────────────────────────────────
    sectionHeader('Personal Information');
    drawEntries([
      { label: 'Full Name',   value: user.name ?? '—' },
      { label: 'Employee ID', value: user.id.slice(0, 8).toUpperCase() },
      { label: 'Role',        value: user.role.charAt(0) + user.role.slice(1).toLowerCase() },
      { label: 'Employment Status', pill: { text: user.isActive ? 'Active' : 'Inactive', kind: user.isActive ? 'ok' : 'neutral' } },
    ]);

    // ── Contact Information ──────────────────────────────────────────────
    sectionHeader('Contact Information');
    drawEntries([
      { label: 'Email',   value: user.email },
      { label: 'Phone',   value: user.phone ?? '—' },
      { label: 'Address', value: user.address ?? '—' },
    ]);

    // ── Employment Information ───────────────────────────────────────────
    const profile = user.employeeProfile;
    sectionHeader('Employment Information');
    drawEntries([
      { label: 'Department',      value: profile?.department ?? '—' },
      { label: 'Join Date',       value: formatDate(profile?.joinDate) },
      { label: 'Pay Mode',        value: profile?.payCalculationMode.replace('_', ' + ') ?? '—' },
      { label: 'Hourly Rate',     value: profile ? `${formatCurrency(Number(profile.hourlyRate), currency)}/hr` : '—' },
      { label: 'Daily Rate',      value: profile?.dailyRate ? `${formatCurrency(Number(profile.dailyRate), currency)}/day` : '—' },
      { label: 'Overtime Multiplier', value: profile ? `${profile.overtimeMultiplier}×` : '—' },
    ]);

    // ── Dynamic / Custom Information (Bank Info, Emergency Contact, etc.) ─
    for (const record of employeeRecords) {
      const data = record.data as Record<string, unknown>;
      const hasData = Object.values(data).some((v) => v != null && v !== '');
      if (!hasData) continue;

      sectionHeader(record.contentType.name);

      const recordEntries: RowEntry[] = record.contentType.fields
        .map((field: { id: string; label: string; fieldType: string }) => {
          const val = data[field.id];
          if (val == null || val === '') return null;
          const value = field.fieldType === 'checkbox' ? (val ? 'Yes' : 'No') : String(val);
          return { label: field.label, value } as RowEntry;
        })
        .filter((r: RowEntry | null): r is RowEntry => r !== null);

      if (recordEntries.length) drawEntries(recordEntries);
    }

    // ── Documents on File ────────────────────────────────────────────────
    if (user.employeeDocuments.length > 0) {
      sectionHeader('Documents on File');
      drawEntries(
        user.employeeDocuments.map((d) => ({
          label: `${d.documentType} — ${d.name}${d.expiryDate ? ` (expires ${formatDate(d.expiryDate)})` : ''}`,
          pill: { text: d.isVerified ? 'Verified' : 'Pending', kind: (d.isVerified ? 'ok' : 'warn') as PillKind },
        })),
      );
    }

    // ── Monthly Performance ──────────────────────────────────────────────
    const t = performance.tasks;
    const a = performance.attendance;
    const e = performance.earnings;

    sectionHeader(`Monthly Performance — ${periodLabel}`);
    drawEntries([
      { label: 'Tasks Assigned',    value: String(t.assigned) },
      { label: 'Tasks Completed',   value: String(t.completed) },
      { label: 'Tasks In Progress', value: String(t.inProgress) },
      { label: 'Tasks Pending',     value: String(t.pending) },
      { label: 'Tasks Cancelled',   value: String(t.cancelled) },
      { label: 'Completion Rate',   value: `${t.completionRate}%` },
      { label: 'Days Worked',       value: String(a.daysWorked) },
      { label: 'Total Hours',       value: `${a.totalHours} hrs` },
      { label: 'Regular Hours',     value: `${a.regularHours} hrs` },
      { label: 'Overtime Hours',    value: `${a.overtimeHours} hrs` },
    ]);

    // ── Task Completion Timeline ──────────────────────────────────────────
    if (t.completedTaskDates.length > 0) {
      sectionHeader('Task Completion Timeline');
      const grouped: Record<string, number> = {};
      for (const d of t.completedTaskDates) grouped[d] = (grouped[d] ?? 0) + 1;
      const timelineEntries: RowEntry[] = Object.entries(grouped)
        .sort(([a2], [b2]) => a2.localeCompare(b2))
        .map(([date, count]) => ({ label: formatDate(date), value: `${count} task${count > 1 ? 's' : ''} completed` }));
      drawEntries(timelineEntries);
    }

    // ── Income Summary ────────────────────────────────────────────────────
    sectionHeader('Income Summary');
    drawEntries([
      { label: 'Hourly Rate',       value: `${formatCurrency(e.hourlyRate, currency)}/hr` },
      { label: 'Daily Rate',        value: `${formatCurrency(e.dailyRate, currency)}/day` },
      { label: 'Est. Daily Income', value: formatCurrency(e.estimatedDailyIncome, currency) },
      { label: 'Regular Pay',       value: formatCurrency(e.regularPay, currency) },
      { label: 'Overtime Pay',      value: formatCurrency(e.overtimePay, currency) },
    ]);

    ensureSpace(34);
    const totalY = doc.y;
    const totalBoxWidth = pageWidth - PAGE_MARGIN * 2;
    doc.rect(PAGE_MARGIN, totalY, totalBoxWidth, 30).fill(BRAND_COLOR);
    doc
      .fillColor('#ffffff')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Total Estimated Pay', PAGE_MARGIN + 8, totalY + 9, { width: 220, lineBreak: false });
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(formatCurrency(e.totalEstimatedPay, currency), PAGE_MARGIN + 8, totalY + 9, {
        width: totalBoxWidth - 16,
        align: 'right',
        lineBreak: false,
      });
    doc.x = PAGE_MARGIN;
    doc.y = totalY + 30 + 12;
    doc.font('Helvetica').fillColor(DARK);

    // ── Footer (page number + confidentiality notice) on every page ──────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const bottomY = doc.page.height - 40;
      doc
        .moveTo(PAGE_MARGIN, bottomY - 10)
        .lineTo(pageWidth - PAGE_MARGIN, bottomY - 10)
        .lineWidth(0.5)
        .strokeColor(RULE_COLOR)
        .stroke();
      doc
        .fillColor(GRAY)
        .fontSize(7.5)
        .font('Helvetica')
        .text('CONFIDENTIAL — For internal HR use only', PAGE_MARGIN, bottomY, { width: 220 })
        .text(`Inventory Management © ${new Date().getFullYear()}`, PAGE_MARGIN, bottomY, {
          width: pageWidth - PAGE_MARGIN * 2,
          align: 'center',
        })
        .text(`Page ${i - range.start + 1} of ${range.count}`, PAGE_MARGIN, bottomY, {
          width: pageWidth - PAGE_MARGIN * 2,
          align: 'right',
        });
    }

    doc.end();
  });
};

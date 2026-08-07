import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean in reverse dependency order so this script is safely re-runnable.
  await prisma.monthlyReport.deleteMany({});
  await prisma.systemConfig.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.productRequest.deleteMany({});
  await prisma.taskRequiredProduct.deleteMany({});
  await prisma.taskAssignment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.productBOM.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.employeeProfile.deleteMany({});
  await prisma.user.deleteMany({});

  const adminPassword = await bcrypt.hash('admin123', 10);
  const employeePassword = await bcrypt.hash('employee123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
      name: 'System Admin',
      address: '123 Admin HQ, Cloud City',
      phone: '+1-555-0199',
    },
  });

  const employee = await prisma.user.create({
    data: {
      email: 'employee@example.com',
      password: employeePassword,
      role: 'EMPLOYEE',
      name: 'John Doe',
      address: '456 Suburbs, Greenfield',
      phone: '+1-555-0144',
      employeeProfile: {
        create: {
          hourlyRate: 8500,
          dailyRate: 65000,
          payCalculationMode: 'HOURLY',
          overtimeMultiplier: 1.5,
          lateGraceMinutes: 10,
          earlyLeavePenalty: true,
          department: 'Assembly',
          joinDate: new Date('2025-01-15'),
        },
      },
    },
  });

  const employee2 = await prisma.user.create({
    data: {
      email: 'bold@chargerlabs.mn',
      password: employeePassword,
      role: 'EMPLOYEE',
      name: 'Bold Employee',
      phone: '+976-8800-1234',
      employeeProfile: {
        create: {
          hourlyRate: 9000,
          payCalculationMode: 'DAILY_PLUS_OVERTIME',
          dailyRate: 70000,
          overtimeMultiplier: 1.5,
          lateGraceMinutes: 10,
          department: 'Assembly',
          joinDate: new Date('2025-03-01'),
        },
      },
    },
  });

  // ── System configs ──
  await prisma.systemConfig.createMany({
    data: [
      { key: 'negative_stock_max_days', value: 7, description: 'Days a product may remain in negative stock', updatedById: admin.id },
      { key: 'default_pay_calculation_mode', value: 'HOURLY', updatedById: admin.id },
      { key: 'default_late_grace_minutes', value: 10, updatedById: admin.id },
      { key: 'default_overtime_multiplier', value: 1.5, updatedById: admin.id },
      { key: 'low_stock_alert_enabled', value: true, updatedById: admin.id },
      { key: 'auto_generate_monthly_report', value: true, updatedById: admin.id },
    ],
  });

  // ── Vendor ──
  const vendor = await prisma.vendor.create({
    data: {
      name: 'Nimbus Supply Co.',
      contact: 'Sarah Chen',
      phone: '+976-7700-5566',
      email: 'orders@nimbussupply.mn',
      address: 'Ulaanbaatar, Mongolia',
    },
  });

  // ── Component products (leaf/raw materials) ──
  const capacitor = await prisma.product.create({
    data: {
      sku: 'IN0005',
      name: '0.22uF/275V Capacitor',
      description: 'Film capacitor',
      unitPrice: 3.5,
      currentStock: 780,
      lowStockThreshold: 50,
      reorderTimeDays: 50,
      vendorId: vendor.id,
      customFields: { charger_amp: '15A/20A', category: 'Capacitor' },
    },
  });

  const pcbBoard = await prisma.product.create({
    data: {
      sku: 'IN0012',
      name: 'PCB Board Rev C',
      unitPrice: 12.0,
      currentStock: 4,
      lowStockThreshold: 20,
      reorderTimeDays: 30,
      vendorId: vendor.id,
      customFields: { category: 'PCB' },
    },
  });

  const enclosure = await prisma.product.create({
    data: {
      sku: 'IN0020',
      name: 'Plastic Enclosure 20A',
      unitPrice: 5.25,
      currentStock: 15,
      lowStockThreshold: 25,
      vendorId: vendor.id,
      customFields: { category: 'Enclosure' },
    },
  });

  // ── Finished (composite) product ──
  const finishedCharger = await prisma.product.create({
    data: {
      sku: 'FIN-20A',
      name: '20A Fast Charger — Finished Unit',
      unitPrice: 45.0,
      currentStock: 0,
      isComposite: true,
      customFields: { charger_amp: '20A', category: 'Finished Goods' },
    },
  });

  await prisma.productBOM.createMany({
    data: [
      { parentProductId: finishedCharger.id, childProductId: capacitor.id, quantityRequired: 2 },
      { parentProductId: finishedCharger.id, childProductId: pcbBoard.id, quantityRequired: 1 },
      { parentProductId: finishedCharger.id, childProductId: enclosure.id, quantityRequired: 1 },
    ],
  });

  // ── Task ──
  const task = await prisma.task.create({
    data: {
      title: 'Assemble 20 pcs of 20A Chargers',
      description: 'Full assembly + basic test',
      createdById: admin.id,
      assignments: { createMany: { data: [{ employeeId: employee.id }, { employeeId: employee2.id }] } },
      requiredProducts: { create: { productId: finishedCharger.id, quantity: 20 } },
    },
  });

  // ── Product request (extra parts needed for the task) ──
  await prisma.productRequest.create({
    data: {
      productId: capacitor.id,
      quantity: 10,
      type: 'TASK_RELATED',
      taskId: task.id,
      requestedById: employee.id,
      reason: 'Extra SMD capacitors needed for rework',
    },
  });

  // ── An initial purchase movement so reports have data ──
  await prisma.stockMovement.create({
    data: {
      productId: capacitor.id,
      type: 'PURCHASE',
      quantity: 780,
      unitCost: 3.5,
      totalCost: 780 * 3.5,
      performedById: admin.id,
      notes: 'Initial stock load',
    },
  });

  // ── Attendance (yesterday, completed) ──
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayUTC = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()));

  const checkInTime = new Date(yesterdayUTC);
  checkInTime.setUTCHours(9, 5, 0, 0);

  const checkOutTime = new Date(yesterdayUTC);
  checkOutTime.setUTCHours(18, 0, 0, 0);

  await prisma.attendance.create({
    data: {
      employeeId: employee.id,
      date: yesterdayUTC,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      source: 'FINGERPRINT',
      calculatedHours: 8.92,
      lateMinutes: 0,
    },
  });

  console.log('Seeding finished successfully.');
  console.log('Created users:', {
    admin: { id: admin.id, email: admin.email, role: admin.role },
    employee: { id: employee.id, email: employee.email, role: employee.role },
    employee2: { id: employee2.id, email: employee2.email, role: employee2.role },
  });
  console.log('Created products:', { capacitor: capacitor.sku, pcbBoard: pcbBoard.sku, enclosure: enclosure.sku, finishedCharger: finishedCharger.sku });
  console.log('Created task:', task.title);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

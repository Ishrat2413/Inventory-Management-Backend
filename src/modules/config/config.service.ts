import prisma from '../../utils/prisma/prisma-client';

/**
 * Default values applied when a config key hasn't been explicitly set yet
 * (mirrors the "Recommended SystemConfig Keys" section of the README).
 */
export const CONFIG_DEFAULTS: Record<string, unknown> = {
  negative_stock_max_days: 7,
  default_pay_calculation_mode: 'HOURLY',
  default_late_grace_minutes: 10,
  default_overtime_multiplier: 1.5,
  low_stock_alert_enabled: true,
  auto_generate_monthly_report: true,
};

/**
 * Reads a single config value, falling back to the documented default
 * (and finally `undefined`) if it has never been set. Used internally by
 * other modules (e.g. negative-stock tracking, pay calculation).
 */
export const getConfigValue = async (key: string): Promise<unknown> => {
  const config = await prisma.systemConfig.findUnique({ where: { key } });
  if (config) return config.value;
  return CONFIG_DEFAULTS[key];
};

const getAllConfigs = async () => {
  const configs = await prisma.systemConfig.findMany();
  const asMap: Record<string, unknown> = { ...CONFIG_DEFAULTS };
  for (const c of configs) asMap[c.key] = c.value;
  return asMap;
};

const getConfigByKey = async (key: string) => {
  const value = await getConfigValue(key);
  return { key, value };
};

/** Upserts one or more config keys in a single transaction. */
const updateConfigs = async (updates: Record<string, unknown>, updatedById?: string) => {
  const entries = Object.entries(updates);
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        create: { key, value: value as never, updatedById },
        update: { value: value as never, updatedById },
      }),
    ),
  );
  return getAllConfigs();
};

export const configServices = { getAllConfigs, getConfigByKey, updateConfigs };

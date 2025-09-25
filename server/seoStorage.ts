import { db } from './db';
import { eq } from 'drizzle-orm';
import { seoConfigs } from '../shared/schema';

export async function getSEOConfig(path: string) {
  const result = await db.select().from(seoConfigs).where(eq(seoConfigs.path, path));
  return result[0];
}

export async function updateSEOConfig(path: string, config: any) {
  const existing = await getSEOConfig(path);
  if (existing) {
    return await db
      .update(seoConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(seoConfigs.path, path));
  } else {
    return await db.insert(seoConfigs).values({ ...config, path });
  }
}

export async function getAllSEOConfigs() {
  return await db.select().from(seoConfigs);
}
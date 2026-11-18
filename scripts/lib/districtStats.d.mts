// Types for districtStats.mjs (used from TypeScript scripts).
import type { DistrictStats } from "../../src/lib/types";
export function loadDistrictStats(file?: string): Record<string, DistrictStats>;
export function districtLine(stats: Record<string, DistrictStats>, districtId: string): string;

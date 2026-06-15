"use server";

import { exportSearchAsCsv, exportSearchAsJson } from "@/app/actions/export";

export async function getExportCsv(searchId: string): Promise<string> {
  return exportSearchAsCsv(searchId);
}

export async function getExportJson(searchId: string): Promise<string> {
  return exportSearchAsJson(searchId);
}

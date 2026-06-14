import type { ScheduleBlock } from "@/lib/schedule-block-utils";
import type { ClinicDentist } from "@/lib/dentists";
import { findDentistName } from "@/lib/dentists";

export interface DentistLeaveItem {
  blockId: string;
  dentistId: string;
  dentistName: string;
  date: string;
  endDate?: string;
  reason?: string;
  isToday: boolean;
  isActive: boolean;
}

function blockIsActiveOnDate(block: ScheduleBlock, date: string): boolean {
  if (block.endDate) {
    return date >= block.date && date <= block.endDate;
  }
  return block.date === date;
}

function blockIsUpcoming(block: ScheduleBlock, today: string): boolean {
  const lastDay = block.endDate ?? block.date;
  return lastDay >= today;
}

export function formatLeaveRange(date: string, endDate?: string): string {
  if (!endDate || endDate === date) {
    return formatShortDate(date);
  }
  return `${formatShortDate(date)} – ${formatShortDate(endDate)}`;
}

function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function listUpcomingDentistLeaves(
  blocks: ScheduleBlock[],
  dentists: ClinicDentist[],
  today: string
): DentistLeaveItem[] {
  return blocks
    .filter((block) => block.providerId && blockIsUpcoming(block, today))
    .map((block) => ({
      blockId: block.id,
      dentistId: block.providerId!,
      dentistName: findDentistName(dentists, block.providerId) ?? block.providerId!,
      date: block.date,
      endDate: block.endDate,
      reason: block.reason,
      isToday: blockIsActiveOnDate(block, today),
      isActive: blockIsActiveOnDate(block, today),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function listTodayUnavailableDentists(leaves: DentistLeaveItem[]): DentistLeaveItem[] {
  return leaves.filter((leave) => leave.isToday);
}

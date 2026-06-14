export interface ScheduleBlock {
  id: string;
  providerId?: string;
  date: string;
  endDate?: string;
  reason?: string;
  createdBy: string;
  createdAt: string;
}

export function isDateBlocked(
  date: string,
  blocks: ScheduleBlock[],
  providerId?: string
): boolean {
  return blocks.some((block) => {
    if (block.providerId && providerId && block.providerId !== providerId) {
      return false;
    }
    if (block.endDate) {
      return date >= block.date && date <= block.endDate;
    }
    return block.date === date;
  });
}

/** Whole-clinic closures — blocks public booking for the day. */
export function isClinicWideDateBlocked(date: string, blocks: ScheduleBlock[]): boolean {
  return blocks.some((block) => {
    if (block.providerId) return false;
    if (block.endDate) {
      return date >= block.date && date <= block.endDate;
    }
    return block.date === date;
  });
}

export function getDentistLeaveNotes(
  date: string,
  blocks: ScheduleBlock[]
): ScheduleBlock[] {
  return blocks.filter((block) => {
    if (!block.providerId) return false;
    if (block.endDate) {
      return date >= block.date && date <= block.endDate;
    }
    return block.date === date;
  });
}

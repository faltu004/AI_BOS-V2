export const holidayTypes = ["Public", "Optional", "Restricted", "Company"] as const;

export type HolidayType = (typeof holidayTypes)[number];

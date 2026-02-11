
/**
 * Hong Kong Public Holidays for 2024-2030
 */
const HK_PUBLIC_HOLIDAYS = [
  // 2024
  '2024-01-01', '2024-02-10', '2024-02-12', '2024-02-13', '2024-03-29',
  '2024-03-30', '2024-04-01', '2024-04-04', '2024-05-01', '2024-05-15',
  '2024-06-10', '2024-07-01', '2024-09-18', '2024-10-01', '2024-10-11',
  '2024-12-24', '2024-12-25', '2024-12-26', '2024-12-31',
  // 2025
  '2025-01-01', '2025-01-29', '2025-01-30', '2025-01-31', '2025-04-04',
  '2025-04-18', '2025-04-19', '2025-04-21', '2025-05-01', '2025-05-05',
  '2025-05-31', '2025-07-01', '2025-10-01', '2025-10-07', '2025-10-29',
  '2025-12-25', '2025-12-26',
  // 2026
  '2026-01-01', '2026-02-17', '2026-02-18', '2026-02-19', '2026-04-03', 
  '2026-04-04', '2026-04-06', '2026-05-01', '2026-05-25', '2026-06-19', 
  '2026-07-01', '2026-09-26', '2026-10-01', '2026-10-20', '2026-12-25', 
  '2026-12-26',
  // 2027
  '2027-01-01', '2027-02-06', '2027-02-08', '2027-02-09', '2027-03-26', 
  '2027-03-27', '2027-03-29', '2027-04-05', '2027-05-01', '2027-05-13', 
  '2027-06-09', '2027-07-01', '2027-09-16', '2027-10-01', '2027-10-08', 
  '2027-12-25', '2027-12-27',
  // 2028
  '2028-01-01', '2028-01-26', '2028-01-27', '2028-01-28', '2028-04-04', 
  '2028-04-14', '2028-04-15', '2028-04-17', '2028-05-01', '2028-05-02', 
  '2028-05-29', '2028-07-01', '2028-10-02', '2028-10-04', '2028-10-26', 
  '2028-12-25', '2028-12-26',
  // 2029
  '2029-01-01', '2029-02-13', '2029-02-14', '2029-02-15', '2029-03-30', 
  '2029-03-31', '2029-04-02', '2029-04-04', '2029-05-01', '2029-05-21', 
  '2029-06-16', '2029-07-02', '2029-09-23', '2029-10-01', '2029-10-17', 
  '2029-12-25', '2029-12-26',
  // 2030
  '2030-01-01', '2030-02-03', '2030-02-04', '2030-02-05', '2030-04-05', 
  '2030-04-19', '2030-04-20', '2030-04-22', '2030-05-01', '2030-05-09', 
  '2030-06-05', '2030-07-01', '2030-09-13', '2030-10-01', '2030-10-05', 
  '2030-12-25', '2030-12-26'
];

export type DayType = 'weekday' | 'saturday' | 'sunday';

export const getDayType = (date: Date): DayType => {
  const day = date.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  const dateString = date.toISOString().split('T')[0];
  
  // Sunday or Public Holiday
  if (day === 0 || HK_PUBLIC_HOLIDAYS.includes(dateString)) {
    return 'sunday';
  }
  
  // Saturday
  if (day === 6) {
    return 'saturday';
  }
  
  // Weekday
  return 'weekday';
};

export const parseTimeToSeconds = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  let totalSeconds = hours * 3600 + minutes * 60;
  
  // Service Day Logic: 00:00 - 05:59 counts as the end of the previous day (24h+)
  if (hours < 6) {
    totalSeconds += 24 * 3600;
  }
  return totalSeconds;
};

export const getSecondsSinceStartOfDay = (date: Date): number => {
  const hours = date.getHours();
  let totalSeconds = hours * 3600 + date.getMinutes() * 60 + date.getSeconds();
  
  // Service Day Logic: If current real time is 00:00-05:59, we treat it as 24:00-29:59
  if (hours < 6) {
    totalSeconds += 24 * 3600;
  }
  return totalSeconds;
};

export const findNextDepartures = (departures: string[], currentTimeInSeconds: number, count: number = 5): string[] => {
  const futureDepartures = departures.filter(time => parseTimeToSeconds(time) > currentTimeInSeconds);
  return futureDepartures.slice(0, count);
};

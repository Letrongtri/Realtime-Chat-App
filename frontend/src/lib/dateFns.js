import {
  differenceInDays,
  differenceInYears,
  formatDistanceToNow,
  format,
} from "date-fns";
import { enUS } from "date-fns/locale";

export const formatDistanceShort = (date) => {
  const distance = formatDistanceToNow(date, { locale: enUS });

  return distance
    .replace("minutes", "mins")
    .replace("minute", "min")
    .replace("hours", "hrs")
    .replace("hour", "hr")
    .replace("seconds", "s")
    .replace("second", "s");
};

export const formatMessageTime = (date) => {
  const now = new Date();
  const targetDate = new Date(date);

  const daysDiff = differenceInDays(now, targetDate);
  const yearsDiff = differenceInYears(now, targetDate);

  if (daysDiff < 7) {
    return formatDistanceShort(targetDate);
  }

  if (yearsDiff > 1) {
    return format(targetDate, "dd/MM/yyyy", { locale: enUS });
  }

  return format(targetDate, "dd/MM", { locale: enUS });
};

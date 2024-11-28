import { timezones } from "./timezones";

const pad = (str: string, length: number, char: string) => {
  return str.padStart(length, char);
};

export const HourItems = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: pad(i.toString(), 2, "0"),
}));

export const MinuteItems = Array.from({ length: 60 }, (_, i) => ({
  value: i,
  label: pad(i.toString(), 2, "0"),
}));

export const TimezoneItems = timezones.map((tz) => ({
  value: tz,
  label: tz,
}));

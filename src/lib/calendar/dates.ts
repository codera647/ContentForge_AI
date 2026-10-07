function pad(value: number) { return String(value).padStart(2, "0"); }

export function localDateInput(value: Date | string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localTimeInput(value: Date | string) {
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function scheduleIso(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error("Choose a valid date and time.");
  const value = new Date(`${date}T${time}:00`);
  if (Number.isNaN(value.getTime()) || localDateInput(value) !== date || localTimeInput(value) !== time) {
    throw new Error("This date or time is unavailable in your timezone. Choose another time.");
  }
  return value.toISOString();
}

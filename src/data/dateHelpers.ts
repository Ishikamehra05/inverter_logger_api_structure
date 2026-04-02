export const dateUtils = {
  today: () => new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Kolkata",}),                 // YYYY-MM-DD
  month: () => new Date().toISOString().slice(0, 7),                   // YYYY-MM
  year: () => new Date().getFullYear().toString(),                     // YYYY
  startOfDay: () => new Date().setHours(0, 0, 0, 0),
  endOfDay: () => new Date().setHours(23, 59, 59, 999),
  startOfMonth: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  endOfMonth: () => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  todayTimestamp: () => new Date().toISOString(),       
  formatDate : () => new Date().toISOString().slice(0, 19).replace("T", " ")            
};

// export const formatDate = (date: Date | string) => {
//   return new Date(date)
//     .toISOString()
//     .slice(0, 19)
//     .replace("T", " ");
// };
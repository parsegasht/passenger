// Simple Jalali date utilities
// For production, consider using a library like moment-jalaali or react-persian-datepicker

export const getTodayJalali = () => {
  const today = new Date();
  const jalali = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
  return {
    year: jalali[0],
    month: jalali[1],
    day: jalali[2],
  };
};

export const gregorianToJalali = (gy, gm, gd) => {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  let gy2 = gy > 1600 ? gy - 1600 : gy - 621;
  let days = (365 * gy2) + (parseInt((gy2 + 3) / 4)) - (parseInt((gy2 + 99) / 100)) + 
             (parseInt((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * parseInt(days / 12053);
  days %= 12053;
  jy += 4 * parseInt(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += parseInt((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm = days < 186 ? 1 + parseInt(days / 31) : 7 + parseInt((days - 186) / 30);
  let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
};

export const formatJalaliDate = (year, month, day) => {
  const monthNames = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  return `${day} ${monthNames[month - 1]} ${year}`;
};

// Convert Jalali date to Gregorian date
export const jalaliToGregorian = (jy, jm, jd) => {
  // Validate input
  if (!jy || !jm || !jd || jm < 1 || jm > 12 || jd < 1 || jd > 31) {
    console.error("Invalid Jalali date input:", { jy, jm, jd });
    return [null, null, null];
  }

  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy = jy <= 979 ? 621 : 1600;
  let jy2 = jy <= 979 ? 0 : jy - 979;
  
  // Calculate days from epoch
  let days = (365 * jy2) + (parseInt(jy2 / 33) * 8) + (parseInt(((jy2 % 33) + 3) / 4)) + 78 + jd;
  
  // Add days for months
  if (jm < 7) {
    days += (jm - 1) * 31;
  } else {
    days += 186 + ((jm - 7) * 30);
  }
  
  // Convert to Gregorian
  gy += 400 * parseInt(days / 146097);
  days %= 146097;
  
  if (days > 36524) {
    gy += 100 * parseInt(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  
  gy += 4 * parseInt(days / 1461);
  days %= 1461;
  
  if (days > 365) {
    gy += parseInt((days - 1) / 365);
    days = (days - 1) % 365;
  }
  
  let gm = 1;
  for (let i = 0; i < 12; i++) {
    let v = g_d_m[i];
    if (gm < 3) v--;
    if ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) v++;
    if (days >= v) {
      days -= v;
      gm++;
    } else break;
  }
  
  let gd = days + 1;
  
  // Validate output
  if (!gy || !gm || !gd || gm < 1 || gm > 12 || gd < 1 || gd > 31) {
    console.error("Invalid Gregorian date conversion:", { gy, gm, gd, input: { jy, jm, jd } });
    return [null, null, null];
  }
  
  return [gy, gm, gd];
};


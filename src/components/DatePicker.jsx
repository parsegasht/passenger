import React, { useState } from 'react';
import { getTodayJalali, formatJalaliDate } from '../utils/jalaliDate';

const DatePicker = ({ label, value, onChange, error, required = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const today = getTodayJalali();
  
  const [selectedYear, setSelectedYear] = useState(value?.year || today.year);
  const [selectedMonth, setSelectedMonth] = useState(value?.month || today.month);
  const [selectedDay, setSelectedDay] = useState(value?.day || today.day);

  const monthNames = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  const daysInMonth = (year, month) => {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    // Check for leap year in Esfand
    return ((year + 2346) % 128) < 30 ? 30 : 29;
  };

  // Check if a date is before today
  const isDateBeforeToday = (year, month, day) => {
    if (year < today.year) return true;
    if (year > today.year) return false;
    if (month < today.month) return true;
    if (month > today.month) return false;
    if (day < today.day) return true;
    return false;
  };

  const handleDateSelect = (day) => {
    // Prevent selecting dates before today
    if (isDateBeforeToday(selectedYear, selectedMonth, day)) {
      return;
    }
    setSelectedDay(day);
    const newDate = { year: selectedYear, month: selectedMonth, day };
    onChange({ target: { value: newDate } });
    setIsOpen(false);
  };

  const currentValue = value ? formatJalaliDate(value.year, value.month, value.day) : '';

  return (
    <div className="mb-4 relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-right ${
            error ? 'border-red-500' : 'border-gray-300'
          } bg-white`}
        >
          {currentValue || 'انتخاب تاریخ'}
        </button>
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none"
              >
                {Array.from({ length: 5 }, (_, i) => today.year + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none"
              >
                {monthNames.map((name, index) => (
                  <option key={index + 1} value={index + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
              {Array.from({ length: daysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1).map(day => {
                const isDisabled = isDateBeforeToday(selectedYear, selectedMonth, day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    disabled={isDisabled}
                    className={`py-2 rounded transition-colors ${
                      isDisabled 
                        ? 'text-gray-300 cursor-not-allowed bg-gray-50' 
                        : selectedDay === day 
                          ? 'bg-sky-600 text-white hover:bg-sky-700' 
                          : 'hover:bg-sky-100'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default DatePicker;


import React from 'react';

const TimePicker = ({ label, value, onChange, error, required = false }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const handleTimeChange = (type, val) => {
    const [hour = '00', minute = '00'] = value ? value.split(':') : ['00', '00'];
    const newTime = type === 'hour' ? `${val}:${minute}` : `${hour}:${val}`;
    onChange({ target: { value: newTime } });
  };

  const currentValue = value || '00:00';
  const [currentHour, currentMinute] = currentValue.split(':');

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        <select
          value={currentHour}
          onChange={(e) => handleTimeChange('hour', e.target.value)}
          className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          {hours.map(hour => (
            <option key={hour} value={hour}>{hour}</option>
          ))}
        </select>
        <span className="self-center text-xl font-bold">:</span>
        <select
          value={currentMinute}
          onChange={(e) => handleTimeChange('minute', e.target.value)}
          className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          {minutes.map(minute => (
            <option key={minute} value={minute}>{minute}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default TimePicker;


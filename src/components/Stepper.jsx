import React from "react";

const Stepper = ({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  required = false,
}) => {
  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-10 h-10 rounded-lg bg-sky-600 text-white font-bold hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          +
        </button>
        <input
          type="number"
          value={value}
          readOnly
          className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold min-w-0"
        />
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-10 h-10 rounded-lg bg-sky-600 text-white font-bold hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          −
        </button>
      </div>
    </div>
  );
};

export default Stepper;

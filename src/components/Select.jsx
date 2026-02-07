import React, { useState, useRef, useEffect } from 'react';

const Select = ({ label, options, value, onChange, error, placeholder, required = false, searchable = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = searchable
    ? options.filter(option =>
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedOption = options.find(opt => opt.id === value);

  const handleSelect = (option) => {
    onChange({ target: { value: option.id } });
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="mb-4 relative" ref={dropdownRef}>
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
          {selectedOption ? selectedOption.name : placeholder || 'انتخاب کنید'}
        </button>
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {searchable && (
              <div className="p-2 border-b border-gray-200">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="جستجو..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="py-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full text-right px-4 py-2 hover:bg-sky-50 transition-colors ${
                      value === option.id ? 'bg-sky-100' : ''
                    }`}
                  >
                    {option.name}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500 text-center">نتیجه‌ای یافت نشد</div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default Select;


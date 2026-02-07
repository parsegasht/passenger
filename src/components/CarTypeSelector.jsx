import React from 'react';

const CarTypeSelector = ({ label, options, value, onChange, error, required = false }) => {
  // Get car image based on type with fallback
  const getCarImage = (car) => {
    if (car.image) return car.image;
    
    // Fallback images based on vehicle type
    const imageMap = {
      1: 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png', // Sedan
      2: 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png', // Premium Sedan
      3: 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png', // VIP Sedan
      4: 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png', // SUV
      5: 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png', // Van
      6: 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png', // Van VIP
      7: 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png', // Minibus
      8: 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png', // Minibus VIP
      9: 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png', // Mid Bus
      10: 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png', // Mid Bus VIP
      11: 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png', // Bus
      12: 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png', // Bus VIP
    };
    return imageMap[car.id] || 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png';
  };

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {options.map((car) => (
          <button
            key={car.id}
            type="button"
            onClick={() => onChange({ target: { value: car.id } })}
            className={`p-4 border-2 rounded-lg transition-all text-center hover:shadow-md ${
              value === car.id
                ? 'border-sky-600 bg-sky-50 shadow-md'
                : 'border-gray-300 hover:border-sky-300 bg-white'
            }`}
          >
            <div className="mb-3 flex justify-center">
              <img 
                src={getCarImage(car)} 
                alt={car.label || car.name}
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  e.target.src = 'https://cdn-icons-png.flaticon.com/512/3073/3073625.png';
                }}
              />
            </div>
            <div className="font-semibold text-gray-800 text-sm mb-1">
              {car.label || car.name}
            </div>
            <div className="text-xs text-gray-500">ظرفیت: {car.capacity} نفر</div>
          </button>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default CarTypeSelector;


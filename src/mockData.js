// Import car type images
import carType1 from './pics/carType1.png';
import carType2 from './pics/carType2.png';
import carType3 from './pics/carType3.png';
import carType4 from './pics/carType4.png';
import carType5 from './pics/carType5.png';
import carType6 from './pics/carType6.png';
import carType7 from './pics/carType7.png';
import carType8 from './pics/carType8.png';
import carType9 from './pics/carType9.png';
import carType10 from './pics/carType10.png';
import carType11 from './pics/carType11.png';
import carType12 from './pics/carType12.png';

// Mock data for cities and car types
export const cities = [
  { id: 1, name: 'تهران' },
  { id: 2, name: 'مشهد' },
  { id: 3, name: 'اصفهان' },
  { id: 4, name: 'شیراز' },
  { id: 5, name: 'تبریز' },
  { id: 6, name: 'کرج' },
  { id: 7, name: 'قم' },
  { id: 8, name: 'اهواز' },
  { id: 9, name: 'کرمان' },
  { id: 10, name: 'رشت' },
  { id: 11, name: 'ارومیه' },
  { id: 12, name: 'یزد' },
  { id: 13, name: 'همدان' },
  { id: 14, name: 'کرمانشاه' },
  { id: 15, name: 'زاهدان' },
];

export const carCategory = [
  { label: "سواری داخلی", value: 1 },
  { label: "سواری ویژه  ( آریو - النترا)", value: 2 },
  { label: "سواری VIP ( کمری - Fluence )", value: 3 },
  { label: "سواری SUV", value: 4 },
  { label: "ون اکونومی", value: 5 },
  { label: "ون VIP", value: 6 },
  { label: "مینی بوس اکونومی", value: 7 },
  { label: "مینی بوس VIP", value: 8 },
  { label: "میدل باس اکونومی", value: 9 },
  { label: "میدل باس VIP", value: 10 },
  { label: "اتوبوس اکونومی", value: 11 },
  { label: "اتوبوس VIP", value: 12 },
];

export const carTypes = [
  {
    id: 1,
    name: 'سواری داخلی',
    label: 'سواری داخلی',
    capacity: 4,
    basePrice: 500000,
    image: carType1,
  },
  {
    id: 2,
    name: 'سواری ویژه',
    label: 'سواری ویژه  ( آریو - النترا)',
    capacity: 4,
    basePrice: 700000,
    image: carType2,
  },
  {
    id: 3,
    name: 'سواری VIP',
    label: 'سواری VIP ( کمری - Fluence )',
    capacity: 4,
    basePrice: 1200000,
    image: carType3,
  },
  {
    id: 4,
    name: 'سواری SUV',
    label: 'سواری SUV',
    capacity: 5,
    basePrice: 900000,
    image: carType4,
  },
  {
    id: 5,
    name: 'ون اکونومی',
    label: 'ون اکونومی',
    capacity: 7,
    basePrice: 1000000,
    image: carType5,
  },
  {
    id: 6,
    name: 'ون VIP',
    label: 'ون VIP',
    capacity: 7,
    basePrice: 1500000,
    image: carType6,
  },
  {
    id: 7,
    name: 'مینی بوس اکونومی',
    label: 'مینی بوس اکونومی',
    capacity: 15,
    basePrice: 2000000,
    image: carType7,
  },
  {
    id: 8,
    name: 'مینی بوس VIP',
    label: 'مینی بوس VIP',
    capacity: 15,
    basePrice: 2500000,
    image: carType8,
  },
  {
    id: 9,
    name: 'میدل باس اکونومی',
    label: 'میدل باس اکونومی',
    capacity: 25,
    basePrice: 3000000,
    image: carType9,
  },
  {
    id: 10,
    name: 'میدل باس VIP',
    label: 'میدل باس VIP',
    capacity: 25,
    basePrice: 3500000,
    image: carType10,
  },
  {
    id: 11,
    name: 'اتوبوس اکونومی',
    label: 'اتوبوس اکونومی',
    capacity: 40,
    basePrice: 4000000,
    image: carType11,
  },
  {
    id: 12,
    name: 'اتوبوس VIP',
    label: 'اتوبوس VIP',
    capacity: 40,
    basePrice: 5000000,
    image: carType12,
  },
];

// API function to calculate prices for all car types
import { jalaliToGregorian } from './utils/jalaliDate';

export const calculatePrice = async (formData) => {
  try {
    // Convert Jalali date to Gregorian
    const [gy, gm, gd] = jalaliToGregorian(
      formData.date.year,
      formData.date.month,
      formData.date.day
    );

    // Format date and time for API
    const formattedDate = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
    const tripStartDate = `${formattedDate} ${formData.time}:00`;

    // Prepare API payload
    const payload = {
      origin: [
        String(formData.origin.lat),
        String(formData.origin.lng)
      ],
      destinations: formData.destinations.map(dest => [
        String(dest.lat),
        String(dest.lng)
      ]),
      tripType: formData.tripType || 1,
      luggage_count: formData.luggage_count || 0,
      hasPet: formData.hasPet || 0,
      tripDays: "0",
      passenger_count: formData.passengers,
      trip_driver_food: formData.driverFood ? 1 : 0,
      trip_hasComeback: formData.returnTrip ? 1 : 0,
      trip_car_status: formData.carStopEnabled && formData.carStopHours > 0 ? "car_disposal_turnon" : "car_disposal_turnoff",
      car_disposal_hours: formData.carStopEnabled ? formData.carStopHours * 60 : 0, // Convert hours to minutes
      trip_start_date: tripStartDate
    };

    // Call API - Use proxy in development to avoid CORS issues
    const apiUrl = import.meta.env.DEV 
      ? '/api/v1/new-price' 
      : 'https://api.taxirooz.com/v1/new-price';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const apiData = await response.json();
    
    console.log('API Response from new-price:', JSON.stringify(apiData, null, 2));

    // Transform API response to our format
    // API returns: { price: [{ carType, costBreakdown, route_info, ... }, ...] }
    if (apiData.price && Array.isArray(apiData.price)) {
      const results = apiData.price.map((item) => {
        const carType = carTypes.find(car => car.id === item.carType);
        console.log(`Processing car type ${item.carType}:`, {
          hasCostBreakdown: !!item.costBreakdown,
          costBreakdown: item.costBreakdown
        });
        return {
          id: item.carType,
          carTypeId: item.carType,
          vehicleName: carType?.label || carType?.name || 'نامشخص',
          price: item.costBreakdown?.total_cost || 0,
          prepayment: item.costBreakdown?.prepayment || 0,
          capacity: carType?.capacity || 4,
          image: carType?.image,
          // Store full API response for detailed display
          apiData: {
            carType: item.carType,
            distance: item.distance,
            duration: item.duration,
            isSpecialDay: item.isSpecialDay,
            isInTarh: item.isInTarh,
            tarhPrice: item.tarhPrice,
            isInAirPollution: item.isInAirPollution,
            airPollutionPrice: item.airPollutionPrice,
            costBreakdown: item.costBreakdown,
            route_info: item.route_info,
          },
        };
      });

      // If API doesn't return all car types, fill missing ones with default prices
      const returnedCarTypeIds = results.map(r => r.carTypeId);
      const missingCarTypes = carTypes.filter(car => !returnedCarTypeIds.includes(car.id));
      
      missingCarTypes.forEach(car => {
        results.push({
          id: car.id,
          carTypeId: car.id,
          vehicleName: car.label || car.name,
          price: car.basePrice,
          prepayment: Math.floor(car.basePrice * 0.2),
          capacity: car.capacity,
          image: car.image,
          apiData: null,
        });
      });

      return results;
    } else if (apiData.data && Array.isArray(apiData.data)) {
      // Fallback: old format support
      const results = apiData.data.map((item) => {
        const carType = carTypes.find(car => car.id === item.car_type_id || car.id === item.car_category_id);
        return {
          id: item.car_type_id || item.car_category_id || item.id,
          carTypeId: item.car_type_id || item.car_category_id || item.id,
          vehicleName: carType?.label || carType?.name || item.vehicle_name || 'نامشخص',
          price: item.price || item.total_price || 0,
          prepayment: item.prepayment || Math.floor((item.price || item.total_price || 0) * 0.2),
          capacity: carType?.capacity || item.capacity || 4,
          image: carType?.image,
          apiData: null,
        };
      });
      return results;
    } else {
      // Fallback: if API response format is different, return all car types with base prices
      console.warn('Unexpected API response format:', apiData);
      return carTypes.map((car) => ({
        id: car.id,
        carTypeId: car.id,
        vehicleName: car.label || car.name,
        price: car.basePrice,
        prepayment: Math.floor(car.basePrice * 0.2),
        capacity: car.capacity,
        image: car.image,
        apiData: null,
      }));
    }
  } catch (error) {
    console.error('Error calculating price:', error);
    // Fallback to mock data on error
    return carTypes.map((car) => {
      let price = car.basePrice * (formData.returnTrip ? 1.8 : 1);
      if (formData.driverFood) price += 200000;
      if (formData.carStopHours > 0) price += formData.carStopHours * 100000;
      return {
        id: car.id,
        carTypeId: car.id,
        vehicleName: car.label || car.name,
        price: price,
        prepayment: Math.floor(price * 0.2),
        capacity: car.capacity,
        image: car.image,
        apiData: null,
      };
    });
  }
};

// Mock API function to book a trip
export const bookTrip = (bookingData) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate API call - randomly succeed or fail for demo
      const shouldSucceed = Math.random() > 0.2; // 80% success rate

      if (shouldSucceed) {
        resolve({
          success: true,
          bookingId: `BK-${Date.now()}`,
          message: "سفر با موفقیت ثبت شد",
          data: bookingData,
        });
      } else {
        reject({
          success: false,
          message: "خطا در ثبت رزرو. لطفا دوباره تلاش کنید.",
          error: "Service temporarily unavailable",
        });
      }
    }, 2000);
  });
};


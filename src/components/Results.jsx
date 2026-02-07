import React, { useState, useEffect } from "react";
import { formatJalaliDate } from "../utils/jalaliDate";
import useReverseGeocodeStore from "../store/reverseGeocodeStore";

const Results = ({
  results,
  formData,
  onClose,
  onBook,
  bookingLoading,
  onBack,
}) => {                                                                                       
  const [selectedCar, setSelectedCar] = useState(null);
  const [originAddress, setOriginAddress] = useState("");
  const [destinationAddresses, setDestinationAddresses] = useState([]);                                                                                                                   

  // Get store functions
  const { getCachedAddress, setCachedAddress } = useReverseGeocodeStore();

  // Set first car as default selection when results are available
  useEffect(() => {
    if (results && results.length > 0 && !selectedCar) {
      setSelectedCar(results[0]);
    }
  }, [results, selectedCar]);

  // Reverse geocoding function
  const reverseGeocode = async (lat, lng) => {
    // Check cache first
    const cachedAddress = getCachedAddress(lat, lng);
    if (cachedAddress) {
      return cachedAddress;
    }

    let address = null;

    try {
      // Get Reverse Geocoding API key from environment
      const reverseApiKey =
        import.meta.env.VITE_NESHAN_REVERSE_API_KEY ||
        import.meta.env.VITE_NESHAN_API_KEY;
      
      if (reverseApiKey) {
        const neshanResponse = await fetch(
          `https://api.neshan.org/v4/reverse?lat=${lat}&lng=${lng}`,
          {
            headers: {
              "Api-Key": reverseApiKey,
            },
          }
        );

        if (neshanResponse.ok) {
          const data = await neshanResponse.json();
          if (data.formatted_address) {
            address = data.formatted_address;
          } else if (data.address) {
            address = data.address;
          }
        }
      }

      // Fallback: Use Nominatim (OpenStreetMap) if no address from Neshan
      if (!address) {
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fa`,
          {
            headers: {
              "User-Agent": "IntercityTaxiApp",
            },
          }
        );

        if (nominatimResponse.ok) {
          const data = await nominatimResponse.json();
          if (data.display_name) {
            // Extract shorter address (first 2-3 parts)
            const parts = data.display_name.split(",");
            address = parts.slice(0, 3).join(",").trim();
          }
        }
      }
    } catch (error) {
      console.warn("Reverse geocoding failed:", error);
    }

    // Cache the result if we got one
    if (address) {
      setCachedAddress(lat, lng, address);
    }

    return address;
  };

  // Fetch address for origin
  useEffect(() => {
    if (formData?.origin?.lat && formData?.origin?.lng) {
      reverseGeocode(formData.origin.lat, formData.origin.lng).then(
        (address) => {
          setOriginAddress(
            address ||
              `${formData.origin.lat.toFixed(4)}, ${formData.origin.lng.toFixed(
                4
              )}`
          );
        }
      );
    } else {
      setOriginAddress("");
    }
  }, [formData?.origin]);

  // Fetch addresses for destinations
  useEffect(() => {
    if (formData?.destinations && formData.destinations.length > 0) {
      const fetchAddresses = async () => {
        const addresses = await Promise.all(
          formData.destinations.map((dest) => {
            if (dest.lat && dest.lng) {
              return reverseGeocode(dest.lat, dest.lng);
            }
            return null;
          })
        );
        setDestinationAddresses(
          addresses.map(
            (addr, index) =>
              addr ||
              `${formData.destinations[index]?.lat?.toFixed(
                4
              )}, ${formData.destinations[index]?.lng?.toFixed(4)}`
          )
        );
      };
      fetchAddresses();
    } else {
      setDestinationAddresses([]);
    }
  }, [formData?.destinations]);

  const formatPrice = (price) => {
    // Convert from Rials to Tomans (divide by 10)
    const priceInTomans = Math.round(price / 10);
    return new Intl.NumberFormat("fa-IR").format(priceInTomans);
  };

  const handleCarSelect = (car) => {
    setSelectedCar(car);
  };

  const handleBook = () => {
    if (selectedCar && onBook) {
      onBook(selectedCar.carTypeId || selectedCar.id);
    }
  };

  // Generate Google Maps link
  const getMapLink = (lat, lng) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  return (
    <div className="bg-white rounded-xl">
      {/* Car Selection Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {results.slice(0, 4).map((result) => (
          <button
            key={result.id}
            type="button"
            onClick={() => handleCarSelect(result)}
            className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center ${
              selectedCar?.id === result.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
            }`}
          >
            {result.image ? (
              <img
                src={result.image}
                alt={result.vehicleName}
                className="w-full h-16 object-contain mb-2"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <div className="text-2xl mb-2 flex justify-center">🚗</div>
            )}
            <p className="text-xs text-gray-600 text-center truncate w-full">
              {result.vehicleName}
            </p>
          </button>
        ))}
      </div>

      {/* Selected Car Info and Book Button - Show only when a car is selected */}
      {selectedCar && (
        <div className="space-y-4">
          {/* Selected Car Name and Price */}
          <div className="text-center space-y-2 pb-4 border-b border-gray-200">
            <p className="text-lg font-semibold text-gray-800">
              {selectedCar.vehicleName}
            </p>
            <div className="space-y-1">
              <p className="text-xl font-bold text-sky-600">
                {formatPrice(selectedCar.price)} تومان
              </p>
              {selectedCar.prepayment && (
                <p className="text-sm text-gray-600">
                  پیش‌پرداخت: {formatPrice(selectedCar.prepayment)} تومان
                </p>
              )}
            </div>
          </div>

          {/* Price Details - Show if API data is available */}
          {selectedCar.apiData && selectedCar.apiData.costBreakdown && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                جزئیات قیمت
              </h4>

              {/* Route Info */}
              {selectedCar.apiData.route_info && (
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">فاصله</p>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedCar.apiData.route_info.total_distance_km?.toFixed(
                        1
                      ) ||
                        selectedCar.apiData.distance ||
                        0}{" "}
                      کیلومتر
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">مدت زمان</p>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedCar.apiData.duration ||
                        (selectedCar.apiData.route_info.total_duration_min
                          ? `${Math.floor(
                              selectedCar.apiData.route_info.total_duration_min
                            )} دقیقه`
                          : "نامشخص")}
                    </p>
                  </div>
                </div>
              )}

              {/* Cost Breakdown */}
              <div className="space-y-2">
                {selectedCar.apiData.costBreakdown.route_steps_cost > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">هزینه مسیر</span>
                    <span className="font-medium text-gray-800">
                      {formatPrice(
                        selectedCar.apiData.costBreakdown.route_steps_cost
                      )}{" "}
                      تومان
                    </span>
                  </div>
                )}

                {selectedCar.apiData.costBreakdown.toll_cost > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">عوارض</span>
                    <span className="font-medium text-gray-800">
                      {formatPrice(selectedCar.apiData.costBreakdown.toll_cost)}{" "}
                      تومان
                    </span>
                  </div>
                )}

                {selectedCar.apiData.costBreakdown.tarh_cost > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">طرح ترافیک</span>
                    <span className="font-medium text-gray-800">
                      {formatPrice(selectedCar.apiData.costBreakdown.tarh_cost)}{" "}
                      تومان
                    </span>
                  </div>
                )}

                {selectedCar.apiData.costBreakdown.air_pollution_cost > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">آلودگی هوا</span>
                    <span className="font-medium text-gray-800">
                      {formatPrice(
                        selectedCar.apiData.costBreakdown.air_pollution_cost
                      )}{" "}
                      تومان
                    </span>
                  </div>
                )}

                {selectedCar.apiData.costBreakdown.driver_food_cost_total >
                  0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">غذای راننده</span>
                    <span className="font-medium text-gray-800">
                      {formatPrice(
                        selectedCar.apiData.costBreakdown.driver_food_cost_total
                      )}{" "}
                      تومان
                    </span>
                  </div>
                )}

                {selectedCar.apiData.costBreakdown.car_disposal_cost > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">توقف خودرو</span>
                    <span className="font-medium text-gray-800">
                      {formatPrice(
                        selectedCar.apiData.costBreakdown.car_disposal_cost
                      )}{" "}
                      تومان
                    </span>
                  </div>
                )}

                {selectedCar.apiData.costBreakdown.comeback_cost > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">سفر برگشت</span>
                    <span className="font-medium text-gray-800">
                      {formatPrice(
                        selectedCar.apiData.costBreakdown.comeback_cost
                      )}{" "}
                      تومان
                    </span>
                  </div>
                )}

                {selectedCar.apiData.costBreakdown.extra_passenger_cost > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">مسافران اضافی</span>
                    <span className="font-medium text-gray-800">
                      {formatPrice(
                        selectedCar.apiData.costBreakdown.extra_passenger_cost
                      )}{" "}
                      تومان
                    </span>
                  </div>
                )}

                {/* Total Cost */}
                <div className="pt-2 mt-2 border-t border-gray-300 flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-800">
                    جمع کل
                  </span>
                  <span className="text-lg font-bold text-sky-600">
                    {formatPrice(selectedCar.apiData.costBreakdown.total_cost)}{" "}
                    تومان
                  </span>
                </div>

                {/* Prepayment */}
                {selectedCar.apiData.costBreakdown.prepayment > 0 && (
                  <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      پیش‌پرداخت
                    </span>
                    <span className="text-base font-bold text-orange-600">
                      {formatPrice(
                        selectedCar.apiData.costBreakdown.prepayment
                      )}{" "}
                      تومان
                    </span>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              {(selectedCar.apiData.isInTarh ||
                selectedCar.apiData.isSpecialDay) && (
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {selectedCar.apiData.isInTarh && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        طرح ترافیک
                      </span>
                    )}
                    {selectedCar.apiData.isSpecialDay && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        روز خاص
                      </span>
                    )}
                    {selectedCar.apiData.costBreakdown
                      .traffic_multiplier_applied && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ضریب ترافیک:{" "}
                        {
                          selectedCar.apiData.costBreakdown
                            .traffic_multiplier_value
                        }
                        x
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Book Button */}
          <button
            onClick={handleBook}
            disabled={bookingLoading}
            className="w-full py-3 bg-sky-500 text-white text-lg font-semibold rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bookingLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                در حال رزرو...
              </span>
            ) : (
              "رزرو"
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Results;

import React, { useState, useCallback, useMemo } from "react";
import Input from "./components/Input";
import Stepper from "./components/Stepper";
import DatePicker from "./components/DatePicker";
import TimePicker from "./components/TimePicker";
import MapSelector from "./components/MapSelector";
import Results from "./components/Results";
import OTPLoginDrawer from "./components/OTPLoginDrawer";
import { carTypes, carCategory, calculatePrice, bookTrip } from "./mockData";
import {
  getTodayJalali,
  jalaliToGregorian,
  formatJalaliDate,
} from "./utils/jalaliDate";
import { Drawer, IconButton } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import useReverseGeocodeStore from "./store/reverseGeocodeStore";

function App() {
  const [formData, setFormData] = useState({
    origin: null, // { lat, lng }
    destinations: [], // [{ lat, lng }, ...]
    passengers: 1,
    luggage: 0,
    date: getTodayJalali(),
    time: "08:00",
    returnTrip: false,
    driverFood: false,
    carStopHours: 0,
    carStopEnabled: false,
    wheelchair: false,
    pet: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedCarForBooking, setSelectedCarForBooking] = useState(null);
  const [bookingFormData, setBookingFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [bookingFormErrors, setBookingFormErrors] = useState({});
  const [bookingSubmitLoading, setBookingSubmitLoading] = useState(false);
  const [bookingSubmitResult, setBookingSubmitResult] = useState(null);
  const [tripSummaryOpen, setTripSummaryOpen] = useState(false);
  const [otpLoginDrawerOpen, setOtpLoginDrawerOpen] = useState(false);

  // Get store functions for reverse geocoding
  const { getCachedAddress, setCachedAddress } = useReverseGeocodeStore();

  // Reverse geocoding function to get address and city
  const reverseGeocodeWithCity = async (lat, lng) => {
    // Check cache first
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const cacheEntry = useReverseGeocodeStore.getState().cache[key];
    if (cacheEntry && cacheEntry.address) {
      // Check if cache is still valid (24 hours)
      const now = Date.now();
      const cacheAge = now - cacheEntry.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge < maxAge) {
        return {
          address: cacheEntry.address || null,
          city: cacheEntry.city || null,
        };
      }
    }

    let address = null;
    let city = null;

    try {
      // Try Neshan Reverse Geocoding API first
      const reverseApiKey =
        import.meta.env.VITE_NESHAN_REVERSE_API_KEY ||
        import.meta.env.VITE_NESHAN_API_KEY;

      if (reverseApiKey) {
        const response = await fetch(
          `https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}`,
          {
            headers: {
              "Api-Key": reverseApiKey,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.formatted_address) {
            address = data.formatted_address;
          } else if (data.address) {
            address = data.address;
          } else if (data.formatted) {
            address = data.formatted;
          }

          // Extract city from Neshan response
          if (data.city) {
            city = data.city;
          } else if (data.address_components) {
            // Try to find city in address_components
            const cityComponent = data.address_components.find(
              (comp) => comp.types && comp.types.includes("locality")
            );
            if (cityComponent) {
              city = cityComponent.name;
            }
          }
        }
      }

      // Fallback to Nominatim if Neshan failed or no result
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
            const parts = data.display_name.split(",");
            if (parts.length >= 2) {
              address = `${parts[0]}, ${parts[1]}`.trim();
            } else {
              address = data.display_name;
            }
          }

          // Extract city from Nominatim response
          if (data.address) {
            city =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              null;
          }
        }
      }
    } catch (error) {
      console.warn("Reverse geocoding failed:", error);
    }

    // Cache the result
    if (address) {
      setCachedAddress(lat, lng, address, city);
    }

    return { address: address || null, city: city || null };
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (name) => (e) => {
    handleChange({ target: { name, value: e.target.value } });
  };

  const handleStepperChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOriginChange = useCallback((coordinates) => {
    setFormData((prev) => ({ ...prev, origin: coordinates }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.origin;
      return newErrors;
    });
  }, []);

  const handleDestinationAdd = useCallback((coordinates) => {
    setFormData((prev) => ({
      ...prev,
      destinations: [...prev.destinations, coordinates],
    }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.destinations;
      return newErrors;
    });
  }, []);

  const handleDestinationRemove = (index) => {
    setFormData((prev) => ({
      ...prev,
      destinations: prev.destinations.filter((_, i) => i !== index),
    }));
  };

  const handleDestinationUpdate = useCallback((index, coordinates) => {
    setFormData((prev) => {
      const updatedDestinations = [...prev.destinations];
      updatedDestinations[index] = coordinates;
      return {
        ...prev,
        destinations: updatedDestinations,
      };
    });
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.origin || !formData.origin.lat || !formData.origin.lng) {
      newErrors.origin = "لطفا مبدا را روی نقشه انتخاب کنید";
    }
    if (!formData.destinations || formData.destinations.length === 0) {
      newErrors.destinations = "لطفا حداقل یک مقصد را روی نقشه انتخاب کنید";
    }
    if (!formData.date) {
      newErrors.date = "لطفا تاریخ را انتخاب کنید";
    }
    if (!formData.time) {
      newErrors.time = "لطفا زمان را انتخاب کنید";
    }
    if (formData.passengers < 1) {
      newErrors.passengers = "تعداد مسافران باید حداقل 1 نفر باشد";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setResults(null);
    setErrors({});

    try {
      const priceResults = await calculatePrice({
        ...formData,
        carStopHours: formData.carStopEnabled ? formData.carStopHours : 0,
      });

      if (priceResults && priceResults.length > 0) {
        setResults(priceResults);
      } else {
        setErrors({ submit: "خطا در دریافت قیمت‌ها. لطفا دوباره تلاش کنید." });
      }
    } catch (error) {
      console.error("Error calculating price:", error);
      setErrors({
        submit:
          error.message || "خطا در ارتباط با سرور. لطفا دوباره تلاش کنید.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine button text and enabled state
  const actionButtonText = useMemo(() => {
    if (!formData.origin || !formData.origin.lat || !formData.origin.lng) {
      return "مبدا را مشخص کنید";
    }
    if (!formData.destinations || formData.destinations.length === 0) {
      return "مقصد را مشخص کنید";
    }
    return "جزئیات سفر";
  }, [formData.origin, formData.destinations]);

  const actionButtonEnabled = useMemo(() => {
    return (
      formData.origin &&
      formData.origin.lat &&
      formData.origin.lng &&
      formData.destinations &&
      formData.destinations.length > 0
    );
  }, [formData.origin, formData.destinations]);

  const handleActionButtonClick = () => {
    if (actionButtonEnabled) {
      setDrawerOpen(true);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const handleBookTrip = async (carTypeId) => {
    const selectedCar = results?.find(
      (car) => car.id === carTypeId || car.carTypeId === carTypeId
    );
    console.log("handleBookTrip - carTypeId:", carTypeId);
    console.log("handleBookTrip - found car:", selectedCar);
    console.log("handleBookTrip - car apiData:", selectedCar?.apiData);
    console.log(
      "handleBookTrip - car costBreakdown:",
      selectedCar?.apiData?.costBreakdown
    );
    setSelectedCarForBooking(selectedCar);
    setShowBookingForm(true);
    setBookingFormData({ firstName: "", lastName: "", phone: "" });
    setBookingFormErrors({});
    setBookingSubmitResult(null);
  };

  const handleBookingFormChange = (e) => {
    const { name, value } = e.target;
    setBookingFormData((prev) => ({ ...prev, [name]: value }));
    if (bookingFormErrors[name]) {
      setBookingFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateBookingForm = () => {
    const newErrors = {};
    if (!bookingFormData.firstName.trim()) {
      newErrors.firstName = "نام الزامی است";
    }
    if (!bookingFormData.lastName.trim()) {
      newErrors.lastName = "نام خانوادگی الزامی است";
    }
    if (!bookingFormData.phone.trim()) {
      newErrors.phone = "شماره موبایل الزامی است";
    } else if (!/^09\d{9}$/.test(bookingFormData.phone)) {
      newErrors.phone = "شماره موبایل معتبر نیست";
    }
    setBookingFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!validateBookingForm()) return;

    setBookingSubmitLoading(true);
    setBookingSubmitResult(null);

    try {
      // Validate date data
      if (
        !formData.date ||
        !formData.date.year ||
        !formData.date.month ||
        !formData.date.day
      ) {
        setBookingSubmitResult({
          success: false,
          message: "لطفا تاریخ سفر را انتخاب کنید",
        });
        setBookingSubmitLoading(false);
        return;
      }

      // Prepare booking data - Convert Jalali to Gregorian
      const jy = parseInt(formData.date.year);
      const jm = parseInt(formData.date.month);
      const jd = parseInt(formData.date.day);

      console.log("Converting Jalali date:", { jy, jm, jd });

      const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);

      console.log("Converted to Gregorian:", { gy, gm, gd });

      // Validate converted date
      if (!gy || !gm || !gd || gm < 1 || gm > 12 || gd < 1 || gd > 31) {
        console.error("Invalid date conversion:", {
          gy,
          gm,
          gd,
          jalali: formData.date,
        });
        setBookingSubmitResult({
          success: false,
          message: "خطا در تبدیل تاریخ. لطفا تاریخ را دوباره انتخاب کنید",
        });
        setBookingSubmitLoading(false);
        return;
      }

      // Create a Date object to validate the date
      const dateObj = new Date(gy, gm - 1, gd);
      if (
        dateObj.getFullYear() !== gy ||
        dateObj.getMonth() !== gm - 1 ||
        dateObj.getDate() !== gd
      ) {
        console.error("Invalid date:", { gy, gm, gd, dateObj });
        setBookingSubmitResult({
          success: false,
          message: "تاریخ نامعتبر است. لطفا تاریخ را دوباره انتخاب کنید",
        });
        setBookingSubmitLoading(false);
        return;
      }

      const formattedDate = `${gy}-${String(gm).padStart(2, "0")}-${String(
        gd
      ).padStart(2, "0")}`;
      const tripStartDate = `${formattedDate} ${formData.time}:00`;

      // Get address and city for origin and destinations
      const originGeocode = await reverseGeocodeWithCity(
        formData.origin.lat,
        formData.origin.lng
      );

      const destinationsGeocode = await Promise.all(
        formData.destinations.map((dest) =>
          reverseGeocodeWithCity(dest.lat, dest.lng)
        )
      );

      // Build trip_points array
      const tripPoints = [
        {
          lat: String(formData.origin.lat),
          lon: String(formData.origin.lng),
          address: originGeocode.address || "",
          city: originGeocode.city || "",
        },
        ...formData.destinations.map((dest, index) => ({
          lat: String(dest.lat),
          lon: String(dest.lng),
          address: destinationsGeocode[index]?.address || "",
          city: destinationsGeocode[index]?.city || "",
        })),
      ];

      const bookingPayload = {
        origin: [String(formData.origin.lat), String(formData.origin.lng)],
        destinations: formData.destinations.map((dest) => [
          String(dest.lat),
          String(dest.lng),
        ]),
        tripDays: "0",
        passenger_count: formData.passengers,
        trip_driver_food: formData.driverFood ? 1 : 0,
        trip_hasComeback: formData.returnTrip ? 1 : 0,
        trip_car_status:
          formData.carStopEnabled && formData.carStopHours > 0
            ? "car_disposal_turnon"
            : "car_disposal_turnoff",
        car_disposal_hours: formData.carStopEnabled
          ? formData.carStopHours * 60
          : 0,
        trip_start_date: tripStartDate,
        car_type_id:
          selectedCarForBooking?.carTypeId || selectedCarForBooking?.id,
        first_name: bookingFormData.firstName,
        last_name: bookingFormData.lastName,
        phone: bookingFormData.phone,
        trip_points: tripPoints,
        trip_origin_city: originGeocode.city || "",
        trip_destination_city: destinationsGeocode[0]?.city || "",
      };

      // Add costBreakdown fields directly to payload (spread costBreakdown object)
      // Try to get from selectedCarForBooking first, then from results
      let costBreakdown = null;

      if (selectedCarForBooking?.apiData?.costBreakdown) {
        costBreakdown = selectedCarForBooking.apiData.costBreakdown;
        console.log(
          "Found costBreakdown in selectedCarForBooking:",
          costBreakdown
        );
      } else {
        // Fallback: try to find it from results
        const carTypeId =
          selectedCarForBooking?.carTypeId || selectedCarForBooking?.id;
        const carFromResults = results?.find(
          (car) => car.id === carTypeId || car.carTypeId === carTypeId
        );
        if (carFromResults?.apiData?.costBreakdown) {
          costBreakdown = carFromResults.apiData.costBreakdown;
          console.log("Found costBreakdown in results:", costBreakdown);
        } else {
          console.warn(
            "costBreakdown not found anywhere. selectedCarForBooking:",
            selectedCarForBooking,
            "results:",
            results
          );
        }
      }

      // Spread costBreakdown fields directly into payload instead of nested object
      if (costBreakdown) {
        // Add all costBreakdown fields directly to payload root level
        Object.keys(costBreakdown).forEach((key) => {
          bookingPayload[key] = costBreakdown[key];
        });
        console.log(
          "Added costBreakdown fields to payload:",
          Object.keys(costBreakdown)
        );

        // Extract specific fields from costBreakdown with new names
        // trip_tarhPrice from tarh_cost
        if (costBreakdown.tarh_cost !== undefined) {
          bookingPayload.trip_tarhPrice = costBreakdown.tarh_cost;
        }

        // trip_total_price from total_cost
        if (costBreakdown.total_cost !== undefined) {
          bookingPayload.trip_total_price = costBreakdown.total_cost;
        }

        // trip_went_price from total_cost (same as total_cost)
        if (costBreakdown.total_cost !== undefined) {
          bookingPayload.trip_went_price = costBreakdown.total_cost;
        }

        // trip_comeback_total_price from comeback_cost
        if (costBreakdown.comeback_cost !== undefined) {
          bookingPayload.trip_comeback_total_price =
            costBreakdown.comeback_cost;
        }

        // trip_prePayment from prepayment
        if (costBreakdown.prepayment !== undefined) {
          bookingPayload.trip_prePayment = costBreakdown.prepayment;
        }

        console.log("Added specific trip price fields:", {
          trip_tarhPrice: bookingPayload.trip_tarhPrice,
          trip_went_total_price: bookingPayload.trip_went_price,
          trip_comeback_total_price: bookingPayload.trip_comeback_total_price,
          trip_total_price: bookingPayload.trip_total_price,
          trip_prePayment: bookingPayload.trip_prePayment,
        });
      } else {
        console.error(
          "ERROR: costBreakdown is null or undefined. Cannot add to payload."
        );
      }

      console.log(
        "Final booking payload:",
        JSON.stringify(bookingPayload, null, 2)
      );

      // Use proxy in development to avoid CORS issues
      const bookingUrl = import.meta.env.DEV
        ? "v1/backoffice/trip/drafts/store"
        : "https://api.taxirooz.com/v1/backoffice/trip/drafts/store";

      const response = await fetch(bookingUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(bookingPayload),
      });

      if (response.status === 200 || response.status === 201) {
        const responseData = await response
          .json()
          .catch(() => ({ message: "سفر شما ثبت شد" }));
        setBookingSubmitResult({
          success: true,
          message: responseData.message || "سفر شما ثبت شد",
        });
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ message: "خطا در ثبت سفر" }));
        setBookingSubmitResult({
          success: false,
          message: errorData.message || "خطا در ثبت سفر",
        });
      }
    } catch (error) {
      setBookingSubmitResult({
        success: false,
        message: error.message || "خطا در ارتباط با سرور",
      });
    } finally {
      setBookingSubmitLoading(false);
    }
  };

  const handleResetAll = () => {
    setFormData({
      origin: null,
      destinations: [],
      passengers: 1,
      luggage: 0,
      date: getTodayJalali(),
      time: "08:00",
      returnTrip: false,
      driverFood: false,
      carStopHours: 0,
      carStopEnabled: false,
      wheelchair: false,
      pet: false,
    });
    setErrors({});
    setResults(null);
    setDrawerOpen(false);
    setShowBookingForm(false);
    setSelectedCarForBooking(null);
    setBookingFormData({ firstName: "", lastName: "", phone: "" });
    setBookingFormErrors({});
    setBookingSubmitResult(null);
  };

  const handleCloseBookingModal = () => {
    setShowBookingModal(false);
    setBookingResult(null);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Loading Overlay - Lock screen during price calculation */}
      {loading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99999] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[200px]">
            {/* Minimal Spinner */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-sky-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-sky-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-gray-700 font-medium text-lg">
              در حال محاسبه قیمت...
            </p>
            <p className="text-gray-500 text-sm">لطفا صبر کنید</p>
          </div>
        </div>
      )}

      {/* Map Selection - Always visible */}
      <div className="relative w-full h-full">
        <MapSelector
          origin={formData.origin}
          destinations={formData.destinations}
          onOriginChange={handleOriginChange}
          onDestinationAdd={handleDestinationAdd}
          onDestinationRemove={handleDestinationRemove}
          onDestinationUpdate={handleDestinationUpdate}
          error={errors.origin || errors.destinations}
          onActionButtonClick={handleActionButtonClick}
          onActionButtonEnabled={actionButtonEnabled}
          actionButtonText={actionButtonText}
          onLoginButtonClick={() => setOtpLoginDrawerOpen(true)}
        />
      </div>

      {/* Drawer for Form Details */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: "90vh",
            direction: "rtl",
          },
        }}
      >
        <div className="w-full p-4 md:p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {showBookingForm
                ? "ثبت اطلاعات"
                : results
                ? "انتخاب خودرو"
                : "جزئیات سفر"}
            </h2>
            <div className="flex items-center gap-2">
              {/* Back Button - Show in results and booking form stages */}
              {(results || showBookingForm) && (
                <button
                  type="button"
                  onClick={() => {
                    if (showBookingForm) {
                      // Back to results
                      setShowBookingForm(false);
                      setBookingSubmitResult(null);
                    } else if (results) {
                      // Back to form
                      setResults(null);
                    }
                  }}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="بازگشت"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              )}
              <IconButton onClick={handleDrawerClose} aria-label="بستن">
                <CloseIcon />
              </IconButton>
            </div>
          </div>

          {/* Booking Form - Show when booking form is active */}
          {showBookingForm && (
            <>
              {/* Trip Summary Accordion */}
              <div className="mb-6 border border-sky-100 rounded-lg overflow-hidden">
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => setTripSummaryOpen(!tripSummaryOpen)}
                  className="w-full bg-gradient-to-r from-sky-50 to-blue-50 p-4 flex items-center justify-between hover:from-sky-100 hover:to-blue-100 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-700">
                    جزئیات سفر
                  </span>
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-5 h-5 text-sky-600 transition-transform duration-200 ${
                        tripSummaryOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    <svg
                      className="w-5 h-5 text-sky-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                </button>

                {/* Accordion Content */}
                {tripSummaryOpen && (
                  <div className="bg-gradient-to-r from-sky-50 to-blue-50 p-4 border-t border-sky-200">
                    <div className="space-y-3">
                      {/* Date and Time */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">تاریخ</p>
                          <p className="text-sm font-medium text-gray-800">
                            {formData.date
                              ? formatJalaliDate(
                                  formData.date.year,
                                  formData.date.month,
                                  formData.date.day
                                )
                              : "نامشخص"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">ساعت</p>
                          <p className="text-sm font-medium text-gray-800">
                            {formData.time || "نامشخص"}
                          </p>
                        </div>
                      </div>

                      {/* Passengers and Luggage */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-sky-200">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">مسافران</p>
                          <p className="text-sm font-medium text-gray-800">
                            {formData.passengers || 1} نفر
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">چمدان</p>
                          <p className="text-sm font-medium text-gray-800">
                            {formData.luggage || 0} عدد
                          </p>
                        </div>
                      </div>

                      {/* Additional Options */}
                      {(formData.returnTrip ||
                        formData.driverFood ||
                        (formData.carStopEnabled &&
                          formData.carStopHours > 0)) && (
                        <div className="pt-2 border-t border-sky-200">
                          <p className="text-xs text-gray-500 mb-2">
                            گزینه‌های اضافی
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {formData.returnTrip && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                سفر برگشت
                              </span>
                            )}
                            {formData.driverFood && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                غذای راننده
                              </span>
                            )}
                            {formData.carStopEnabled &&
                              formData.carStopHours > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                                  توقف {formData.carStopHours} ساعت
                                </span>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmitBooking} className="space-y-4">
                {bookingSubmitResult?.success ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-10 h-10 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-xl font-semibold text-green-600">
                        {bookingSubmitResult.message}
                      </p>
                      <p className="text-sm text-gray-600">
                        بزودی همکاران ما با شما تماس می‌گیرند
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="mt-4 px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-semibold"
                    >
                      بازگشت به مرحله اول
                    </button>
                  </div>
                ) : bookingSubmitResult?.success === false ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-10 h-10 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <p className="text-xl font-semibold text-red-600 text-center">
                      {bookingSubmitResult.message}
                    </p>
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="mt-4 px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-semibold"
                    >
                      بازگشت به مرحله اول
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      label="نام"
                      name="firstName"
                      value={bookingFormData.firstName}
                      onChange={handleBookingFormChange}
                      error={bookingFormErrors.firstName}
                      required
                    />
                    <Input
                      label="نام خانوادگی"
                      name="lastName"
                      value={bookingFormData.lastName}
                      onChange={handleBookingFormChange}
                      error={bookingFormErrors.lastName}
                      required
                    />
                    <Input
                      label="شماره موبایل"
                      name="phone"
                      value={bookingFormData.phone}
                      onChange={handleBookingFormChange}
                      error={bookingFormErrors.phone}
                      type="tel"
                      placeholder="09123456789"
                      required
                    />
                    <button
                      type="submit"
                      disabled={bookingSubmitLoading}
                      className="w-full py-3 bg-sky-500 text-white text-lg font-semibold rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bookingSubmitLoading ? (
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
                          در حال ثبت...
                        </span>
                      ) : (
                        "ثبت"
                      )}
                    </button>
                  </>
                )}
              </form>
            </>
          )}

          {/* Form - Only show if no results and no booking form */}
          {!results && !showBookingForm && (
            <form onSubmit={handleSubmit}>
              {/* Passengers and Luggage */}
              <div className="grid grid-cols-2 gap-4 mb-4 mt-6">
                <Stepper
                  label="تعداد مسافران"
                  value={formData.passengers}
                  onChange={(value) => handleStepperChange("passengers", value)}
                  min={1}
                  max={99}
                  required
                />
                <Stepper
                  label="تعداد چمدان"
                  value={formData.luggage}
                  onChange={(value) => handleStepperChange("luggage", value)}
                  min={0}
                  max={99}
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <DatePicker
                  label="تاریخ سفر"
                  value={formData.date}
                  onChange={(e) =>
                    handleChange({
                      target: { name: "date", value: e.target.value },
                    })
                  }
                  error={errors.date}
                  required
                />
                <TimePicker
                  label="زمان حرکت"
                  value={formData.time}
                  onChange={(e) =>
                    handleChange({
                      target: { name: "time", value: e.target.value },
                    })
                  }
                  error={errors.time}
                  required
                />
              </div>

              {/* Return Trip */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="returnTrip"
                    checked={formData.returnTrip}
                    onChange={handleChange}
                    className="w-5 h-5 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                  />
                  <span className="text-gray-700">سفر رفت و برگشت</span>
                </label>
              </div>

              {/* Driver Food */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="driverFood"
                    checked={formData.driverFood}
                    onChange={handleChange}
                    className="w-5 h-5 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                  />
                  <span className="text-gray-700">خوراک و اقامت راننده</span>
                </label>
              </div>

              {/* Car Stop Hours */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    name="carStopEnabled"
                    checked={formData.carStopEnabled}
                    onChange={handleChange}
                    className="w-5 h-5 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                  />
                  <span className="text-gray-700">توقف خودرو</span>
                </label>
                {formData.carStopEnabled && (
                  <Stepper
                    label="ساعات توقف"
                    value={formData.carStopHours}
                    onChange={(value) =>
                      handleStepperChange("carStopHours", value)
                    }
                    min={0}
                    max={24}
                  />
                )}
              </div>

              {/* Wheelchair and Pet */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="wheelchair"
                    checked={formData.wheelchair}
                    onChange={handleChange}
                    className="w-5 h-5 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                  />
                  <span className="text-gray-700">صندلی چرخدار</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="pet"
                    checked={formData.pet}
                    onChange={handleChange}
                    className="w-5 h-5 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                  />
                  <span className="text-gray-700">حیوان خانگی</span>
                </label>
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{errors.submit}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-sky-600 to-sky-800 text-white text-lg font-semibold rounded-lg hover:from-sky-700 hover:to-sky-900 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
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
                    در حال محاسبه...
                  </span>
                ) : (
                  "محاسبه قیمت"
                )}
              </button>
            </form>
          )}

          {/* Results Section */}
          {results && !showBookingForm && (
            <div className="mt-6">
              <Results
                results={results}
                formData={formData}
                onClose={() => {
                  setResults(null);
                }}
                onBook={(carTypeId) => handleBookTrip(carTypeId)}
                bookingLoading={false}
                onBack={() => {
                  setResults(null);
                  // Keep drawer open to show the form (جزئیات سفر)
                }}
              />
            </div>
          )}
        </div>
      </Drawer>

      {/* Booking Result Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {bookingResult?.success ? "رزرو موفق" : "خطا در رزرو"}
                </h2>
                <button
                  onClick={handleCloseBookingModal}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>

              {bookingResult?.success ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-8 h-8 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-green-800 font-semibold text-lg">
                        {bookingResult.message || "سفر با موفقیت ثبت شد"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-gray-800 mb-3">
                      اطلاعات سفر:
                    </h3>

                    {bookingResult.data && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-gray-600">کد رزرو:</span>
                            <p className="font-semibold text-gray-800">
                              {bookingResult.bookingId}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">نوع خودرو:</span>
                            <p className="font-semibold text-gray-800">
                              {bookingResult.data.carType || "نامشخص"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">تاریخ سفر:</span>
                            <p className="font-semibold text-gray-800">
                              {bookingResult.data.date || "نامشخص"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">زمان حرکت:</span>
                            <p className="font-semibold text-gray-800">
                              {bookingResult.data.time || "نامشخص"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              تعداد مسافران:
                            </span>
                            <p className="font-semibold text-gray-800">
                              {bookingResult.data.passengers || "نامشخص"} نفر
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">تعداد چمدان:</span>
                            <p className="font-semibold text-gray-800">
                              {bookingResult.data.luggage || 0} عدد
                            </p>
                          </div>
                        </div>

                        {bookingResult.data.returnTrip && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <span className="text-gray-600">نوع سفر:</span>
                            <p className="font-semibold text-gray-800">
                              رفت و برگشت
                            </p>
                          </div>
                        )}

                        {(bookingResult.data.driverFood ||
                          bookingResult.data.wheelchair ||
                          bookingResult.data.pet ||
                          bookingResult.data.carStopHours > 0) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <span className="text-gray-600">خدمات اضافی:</span>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              {bookingResult.data.driverFood && (
                                <li className="text-gray-700">
                                  خوراک و اقامت راننده
                                </li>
                              )}
                              {bookingResult.data.wheelchair && (
                                <li className="text-gray-700">صندلی چرخدار</li>
                              )}
                              {bookingResult.data.pet && (
                                <li className="text-gray-700">حیوان خانگی</li>
                              )}
                              {bookingResult.data.carStopHours > 0 && (
                                <li className="text-gray-700">
                                  توقف خودرو: {bookingResult.data.carStopHours}{" "}
                                  ساعت
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleCloseBookingModal}
                    className="w-full py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-semibold"
                  >
                    بستن
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-8 h-8 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-red-800 font-semibold text-lg">
                        {bookingResult?.message || "خطا در ثبت رزرو"}
                      </p>
                    </div>
                  </div>

                  {bookingResult?.error && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-600 text-sm mb-2">جزئیات خطا:</p>
                      <p className="text-gray-800 font-mono text-sm">
                        {bookingResult.error}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleCloseBookingModal}
                      className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                    >
                      بستن
                    </button>
                    <button
                      onClick={() => {
                        if (results && bookingResult?.data?.carTypeId) {
                          handleBookTrip(bookingResult.data.carTypeId);
                        }
                      }}
                      className="flex-1 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-semibold"
                    >
                      تلاش مجدد
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OTP Login Drawer */}
      <OTPLoginDrawer
        open={otpLoginDrawerOpen}
        onClose={() => setOtpLoginDrawerOpen(false)}
      />
    </div>
  );
}

export default App;

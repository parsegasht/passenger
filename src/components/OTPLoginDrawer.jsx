import React, { useState } from "react";
import { Drawer, IconButton } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import useOtpLoginStore from "../store/otpLoginStore";

const OTPLoginDrawer = ({ open, onClose }) => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone"); // "phone" or "otp"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const { setLoginData } = useOtpLoginStore();

  // Handle phone number input
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // Only numbers
    if (value.length <= 11) {
      setPhone(value);
      setError("");
    }
  };

  // Send OTP request
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");

    // Validate phone number
    if (!phone || phone.length !== 11 || !phone.startsWith("09")) {
      setError("لطفا شماره موبایل معتبر وارد کنید (مثال: 09123456789)");
      return;
    }

    setLoading(true);

    try {
      // Call OTP send API
      const apiUrl = import.meta.env.DEV
        ? "/api/v1/auth/send-otp"
        : "https://api.taxirooz.com/v1/auth/send-otp";

      const response = await fetch(apiUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (response.ok && (data.status === true || data.success === true)) {
        // OTP sent successfully
        setStep("otp");
        setCountdown(120); // 2 minutes countdown
        startCountdown();
      } else {
        setError(data.message || "خطا در ارسال کد. لطفا دوباره تلاش کنید.");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError("خطا در ارتباط با سرور. لطفا دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  // Start countdown timer
  const startCountdown = () => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");

    // Validate OTP
    if (!otp || otp.length !== 6) {
      setError("لطفا کد 6 رقمی را وارد کنید");
      return;
    }

    setLoading(true);

    try {
      // Call OTP verify API
      const apiUrl = import.meta.env.DEV
        ? "/api/v1/auth/verify-otp"
        : "https://api.taxirooz.com/v1/auth/verify-otp";

      const response = await fetch(apiUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();

      if (response.ok && (data.status === true || data.success === true)) {
        // Login successful - store response in Zustand store
        setLoginData(data);
        
        // Close drawer after successful login
        setTimeout(() => {
          onClose();
          // Reset form
          setPhone("");
          setOtp("");
          setStep("phone");
          setError("");
        }, 1000);
      } else {
        setError(data.message || "کد وارد شده معتبر نیست. لطفا دوباره تلاش کنید.");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setError("خطا در ارتباط با سرور. لطفا دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setError("");
    setLoading(true);

    try {
      const apiUrl = import.meta.env.DEV
        ? "/api/v1/auth/send-otp"
        : "https://api.taxirooz.com/v1/auth/send-otp";

      const response = await fetch(apiUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (response.ok && (data.status === true || data.success === true)) {
        setCountdown(120);
        startCountdown();
        setError("");
      } else {
        setError(data.message || "خطا در ارسال مجدد کد.");
      }
    } catch (error) {
      console.error("Error resending OTP:", error);
      setError("خطا در ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  };

  // Format countdown time
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle close
  const handleClose = () => {
    setPhone("");
    setOtp("");
    setStep("phone");
    setError("");
    setCountdown(0);
    onClose();
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={handleClose}
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
            {step === "phone" ? "ورود با شماره موبایل" : "تایید کد یکبار مصرف"}
          </h2>
          <IconButton onClick={handleClose} aria-label="بستن">
            <CloseIcon />
          </IconButton>
        </div>

        {/* Phone Step */}
        {step === "phone" && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                شماره موبایل
              </label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="09123456789"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-lg"
                maxLength={11}
                dir="ltr"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !phone || phone.length !== 11}
              className="w-full py-3 bg-gradient-to-r from-sky-600 to-sky-800 text-white text-lg font-semibold rounded-lg hover:from-sky-700 hover:to-sky-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  در حال ارسال...
                </span>
              ) : (
                "ارسال کد"
              )}
            </button>
          </form>
        )}

        {/* OTP Step */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                کد یکبار مصرف
              </label>
              <p className="text-sm text-gray-500 mb-3">
                کد ارسال شده به شماره {phone} را وارد کنید
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ""); // Only numbers
                  if (value.length <= 6) {
                    setOtp(value);
                    setError("");
                  }
                }}
                placeholder="123456"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-2xl text-center tracking-widest font-mono"
                maxLength={6}
                dir="ltr"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !otp || otp.length !== 6}
              className="w-full py-3 bg-gradient-to-r from-sky-600 to-sky-800 text-white text-lg font-semibold rounded-lg hover:from-sky-700 hover:to-sky-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  در حال تایید...
                </span>
              ) : (
                "تایید و ورود"
              )}
            </button>

            {/* Resend OTP */}
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-gray-500">
                  ارسال مجدد کد در {formatCountdown(countdown)}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-sm text-sky-600 hover:text-sky-700 font-medium disabled:opacity-50"
                >
                  ارسال مجدد کد
                </button>
              )}
            </div>

            {/* Back to phone */}
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError("");
                setCountdown(0);
              }}
              className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              تغییر شماره موبایل
            </button>
          </form>
        )}
      </div>
    </Drawer>
  );
};

export default OTPLoginDrawer;

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Store for OTP login state management
 * Stores login response and authentication state
 */
const useOtpLoginStore = create(
  persist(
    (set, get) => ({
      // Login response data
      loginData: null,
      
      // Whether user is logged in
      isLoggedIn: false,
      
      // User token if available
      token: null,
      
      // User information
      user: null,

      /**
       * Set login response data
       * @param {Object} data - Login response data from API
       */
      setLoginData: (data) => {
        set({
          loginData: data,
          isLoggedIn: !!data,
          token: data?.token || data?.access_token || data?.data?.token || null,
          user: data?.user || data?.data?.user || null,
        });
      },

      /**
       * Clear login data (logout)
       */
      clearLoginData: () => {
        set({
          loginData: null,
          isLoggedIn: false,
          token: null,
          user: null,
        });
      },

      /**
       * Get current login state
       */
      getLoginState: () => {
        return {
          isLoggedIn: get().isLoggedIn,
          token: get().token,
          user: get().user,
          loginData: get().loginData,
        };
      },
    }),
    {
      name: "otp-login-store", // localStorage key
      // Only persist login data, not functions
      partialize: (state) => ({
        loginData: state.loginData,
        isLoggedIn: state.isLoggedIn,
        token: state.token,
        user: state.user,
      }),
    }
  )
);

export default useOtpLoginStore;

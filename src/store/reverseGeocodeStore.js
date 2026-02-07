import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Store for caching reverse geocoding results
 * Key format: "lat,lng" -> { address: string, city?: string, timestamp: number }
 */
const useReverseGeocodeStore = create(
  persist(
    (set, get) => ({
      // Cache of reverse geocoding results
      cache: {},

      /**
       * Get cached address for coordinates
       * @param {number} lat - Latitude
       * @param {number} lng - Longitude
       * @returns {string|null} Cached address or null if not found
       */
      getCachedAddress: (lat, lng) => {
        const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        const cached = get().cache[key];
        
        if (cached) {
          // Check if cache is still valid (24 hours)
          const now = Date.now();
          const cacheAge = now - cached.timestamp;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (cacheAge < maxAge) {
            return cached.address;
          } else {
            // Remove expired cache
            set((state) => {
              const newCache = { ...state.cache };
              delete newCache[key];
              return { cache: newCache };
            });
          }
        }
        
        return null;
      },

      /**
       * Cache address for coordinates
       * @param {number} lat - Latitude
       * @param {number} lng - Longitude
       * @param {string} address - Address string
       * @param {string} city - Optional city name
       */
      setCachedAddress: (lat, lng, address, city = null) => {
        const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        set((state) => ({
          cache: {
            ...state.cache,
            [key]: {
              address,
              city,
              timestamp: Date.now(),
            },
          },
        }));
      },

      /**
       * Clear all cached addresses
       */
      clearCache: () => {
        set({ cache: {} });
      },

      /**
       * Clear expired cache entries
       */
      clearExpiredCache: () => {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        set((state) => {
          const newCache = {};
          Object.entries(state.cache).forEach(([key, value]) => {
            const cacheAge = now - value.timestamp;
            if (cacheAge < maxAge) {
              newCache[key] = value;
            }
          });
          return { cache: newCache };
        });
      },
    }),
    {
      name: "reverse-geocode-cache", // localStorage key
      // Only persist cache, not functions
      partialize: (state) => ({ cache: state.cache }),
    }
  )
);

export default useReverseGeocodeStore;

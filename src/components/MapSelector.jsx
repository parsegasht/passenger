import React, { useEffect, useRef, useState } from "react";
import originIcon from "../pics/origin.png";
import destinationIcon from "../pics/destination.png";
import whiteLogo from "../pics/cropped-white-logo.avif";
import useReverseGeocodeStore from "../store/reverseGeocodeStore";

const MapSelector = ({
  label,
  origin,
  destinations = [],
  onOriginChange,
  onDestinationAdd,
  onDestinationRemove,
  onDestinationUpdate,
  error,
  apiKey,
  overlay = false, // If true, map is in overlay mode (dimmed, no interactions)
  onActionButtonClick, // Callback for action button click
  onActionButtonEnabled = false, // Whether action button is enabled
  actionButtonText = "ادامه", // Text for action button
  onLoginButtonClick, // Callback for login button click
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destinationMarkersRef = useRef([]);
  const routePolylineRef = useRef(null);
  const routeDistanceMarkerRef = useRef(null);
  const [mapError, setMapError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [originAddress, setOriginAddress] = useState("");
  const [destinationAddresses, setDestinationAddresses] = useState([]);
  const searchTimeoutRef = useRef(null);
  const neshanSearchDisabledRef = useRef(false); // Flag to skip Neshan Search API if it fails
  const neshanReverseDisabledRef = useRef(false); // Flag to skip Neshan Reverse API if it fails

  const normalizeSearchItem = (item) => {
    if (!item || typeof item !== "object") return item;

    const latFromItem =
      item.lat ??
      item.latitude ??
      item.location?.lat ??
      item.location?.latitude ??
      item.location?.y ??
      item.location?.[1];

    const lngFromItem =
      item.lng ??
      item.lon ??
      item.longitude ??
      item.location?.lng ??
      item.location?.lon ??
      item.location?.longitude ??
      item.location?.x ??
      item.location?.[0];

    const lat =
      typeof latFromItem === "string" ? parseFloat(latFromItem) : latFromItem;
    const lng =
      typeof lngFromItem === "string" ? parseFloat(lngFromItem) : lngFromItem;

    const normalizedLocation =
      lat != null && lng != null
        ? {
            ...(item.location && typeof item.location === "object"
              ? item.location
              : {}),
            lat,
            lng,
          }
        : item.location;

    return {
      ...item,
      lat: lat ?? item.lat,
      lng: lng ?? item.lng,
      location: normalizedLocation,
    };
  };

  const extractCityFromResult = (result) => {
    if (!result || typeof result !== "object") return "";

    if (result.city) return String(result.city).trim();

    if (Array.isArray(result.address_components)) {
      const cityComponent = result.address_components.find((comp) =>
        comp?.types?.includes("locality"),
      );
      if (cityComponent?.name) {
        return String(cityComponent.name).trim();
      }
    }

    if (result.region) return String(result.region).trim();

    const text =
      result.address ||
      result.title ||
      result.name ||
      result.display_name ||
      "";
    if (!text) return "";

    const parts = text
      .split(/[،,]/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }

    return parts[0] || "";
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Get API key from environment if not provided as prop
    const mapApiKey = apiKey || import.meta.env.VITE_NESHAN_API_KEY;

    if (!mapApiKey) {
      setMapError(
        "لطفا API Key نقشه نشان را در فایل .env تنظیم کنید (VITE_NESHAN_API_KEY).",
      );
      return;
    }

    let retryCount = 0;
    const maxRetries = 50;

    const initMap = () => {
      if (typeof window === "undefined" || !window.L) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initMap, 100);
        } else {
          setMapError("خطا در بارگذاری نقشه. لطفا صفحه را رفرش کنید.");
        }
        return;
      }

      try {
        const L = window.L;
        // Get API key from environment if not provided as prop
        const mapApiKey = apiKey || import.meta.env.VITE_NESHAN_API_KEY;

        const map = new L.Map(mapRef.current, {
          key: mapApiKey,
          maptype: "neshan",
          poi: true,
          traffic: true,
          center: [35.699756, 51.338076],
          zoom: 10,
          zoomControl: false,
        });

        // Create custom icons using local images
        // Images are 155x207, we'll scale them appropriately
        const iconWidth = 50;
        const iconHeight = 67; // Maintain aspect ratio (155/207)
        const redIcon = L.icon({
          iconUrl: originIcon,
          iconSize: [iconWidth, iconHeight],
          iconAnchor: [iconWidth / 2, iconHeight], // Center horizontally, bottom aligned
          popupAnchor: [0, -iconHeight],
        });

        const blueIcon = L.icon({
          iconUrl: destinationIcon,
          iconSize: [iconWidth, iconHeight],
          iconAnchor: [iconWidth / 2, iconHeight], // Center horizontally, bottom aligned
          popupAnchor: [0, -iconHeight],
        });

        // Store map instance for click handler
        mapInstanceRef.current = map;
      } catch (err) {
        console.error("Error initializing map:", err);
        setMapError("خطا در راه‌اندازی نقشه.");
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [apiKey, import.meta.env.VITE_NESHAN_API_KEY]);

  // Handle map clicks - first click = origin, subsequent clicks = destinations
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    const map = mapInstanceRef.current;

    const handleMapClick = (e) => {
      const { lat, lng } = e.latlng;
      const coordinates = { lat, lng };

      // If no origin exists, set as origin; otherwise add as destination
      if (!origin || !origin.lat || !origin.lng) {
        onOriginChange(coordinates);
      } else {
        onDestinationAdd(coordinates);
      }
    };

    map.off("click"); // Remove previous handlers
    map.on("click", handleMapClick);

    return () => {
      if (map) {
        map.off("click", handleMapClick);
      }
    };
  }, [origin, onOriginChange, onDestinationAdd]);

  // Update markers and draw route
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    const L = window.L;
    // Images are 155x207, we'll scale them appropriately
    const iconWidth = 50;
    const iconHeight = 67; // Maintain aspect ratio (155/207)
    const redIcon = L.icon({
      iconUrl: originIcon,
      iconSize: [iconWidth, iconHeight],
      iconAnchor: [iconWidth / 2, iconHeight], // Center horizontally, bottom aligned
      popupAnchor: [0, -iconHeight],
    });

    const blueIcon = L.icon({
      iconUrl: destinationIcon,
      iconSize: [iconWidth, iconHeight],
      iconAnchor: [iconWidth / 2, iconHeight], // Center horizontally, bottom aligned
      popupAnchor: [0, -iconHeight],
    });

    // Update origin marker
    if (origin && origin.lat && origin.lng) {
      if (originMarkerRef.current) {
        mapInstanceRef.current.removeLayer(originMarkerRef.current);
      }
      const marker = L.marker([origin.lat, origin.lng], {
        icon: redIcon,
        draggable: true,
      }).addTo(mapInstanceRef.current);

      // Handle drag end for origin marker
      marker.on("dragend", (e) => {
        const newPosition = e.target.getLatLng();
        const newCoordinates = { lat: newPosition.lat, lng: newPosition.lng };
        onOriginChange(newCoordinates);
      });

      originMarkerRef.current = marker;
      marker.bindPopup("مبدا");
    } else if (originMarkerRef.current) {
      mapInstanceRef.current.removeLayer(originMarkerRef.current);
      originMarkerRef.current = null;
    }

    // Update destination markers
    destinationMarkersRef.current.forEach((marker) => {
      if (marker) {
        mapInstanceRef.current.removeLayer(marker);
      }
    });
    destinationMarkersRef.current = [];

    destinations.forEach((dest, index) => {
      if (dest && dest.lat && dest.lng) {
        const marker = L.marker([dest.lat, dest.lng], {
          icon: blueIcon,
          draggable: true,
        }).addTo(mapInstanceRef.current);

        // Handle drag end for destination marker
        marker.on("dragend", (e) => {
          const newPosition = e.target.getLatLng();
          const newCoordinates = { lat: newPosition.lat, lng: newPosition.lng };
          // Update the specific destination at this index
          if (onDestinationUpdate) {
            onDestinationUpdate(index, newCoordinates);
          } else {
            // Fallback: Remove old destination and add new one
            onDestinationRemove(index);
            onDestinationAdd(newCoordinates);
          }
        });

        marker.bindPopup(`مقصد ${index + 1}`);
        destinationMarkersRef.current[index] = marker;
      }
    });

    // Calculate and draw route using Neshan Directions API
    const calculateAndDrawRoute = async () => {
      if (!origin || !origin.lat || !origin.lng || destinations.length === 0) {
        // Remove route and distance marker if no valid points
        if (routePolylineRef.current) {
          mapInstanceRef.current.removeLayer(routePolylineRef.current);
          routePolylineRef.current = null;
        }
        if (routeDistanceMarkerRef.current) {
          mapInstanceRef.current.removeLayer(routeDistanceMarkerRef.current);
          routeDistanceMarkerRef.current = null;
        }
        return;
      }

      // Remove existing route and distance marker
      if (routePolylineRef.current) {
        mapInstanceRef.current.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      if (routeDistanceMarkerRef.current) {
        mapInstanceRef.current.removeLayer(routeDistanceMarkerRef.current);
        routeDistanceMarkerRef.current = null;
      }

      const L = window.L;
      const allRoutePoints = [];
      let totalDistance = 0; // Total distance in meters

      // Helper function to calculate distance between two lat/lng points (Haversine formula)
      const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371000; // Earth radius in meters
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in meters
      };

      // Helper function to create distance label on map
      const createDistanceLabel = (
        midPoint,
        distance,
        color = "#3b82f6",
        textColor = "#1e40af",
      ) => {
        const distanceKm = (distance / 1000).toFixed(1);
        const distanceText =
          distance >= 1000
            ? `${distanceKm} کیلومتر`
            : `${Math.round(distance)} متر`;

        const distanceIcon = L.divIcon({
          className: "route-distance-label",
          html: `<div style="background: white; padding: 6px 10px; border-radius: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid ${color}; font-weight: bold; font-size: 13px; color: ${textColor}; white-space: nowrap; direction: rtl;">${distanceText}</div>`,
          iconSize: [null, null],
          iconAnchor: [0, 0],
        });

        const distanceMarker = L.marker(midPoint, {
          icon: distanceIcon,
          interactive: false,
          keyboard: false,
        }).addTo(mapInstanceRef.current);

        return distanceMarker;
      };

      // Helper function to decode polyline
      const decodePolyline = (encoded) => {
        const poly = [];
        let index = 0;
        const len = encoded.length;
        let lat = 0;
        let lng = 0;

        while (index < len) {
          let b,
            shift = 0,
            result = 0;
          do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
          } while (b >= 0x20);
          const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
          lat += dlat;

          shift = 0;
          result = 0;
          do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
          } while (b >= 0x20);
          const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
          lng += dlng;

          poly.push([lat * 1e-5, lng * 1e-5]);
        }
        return poly;
      };

      try {
        // Calculate route for each segment: origin -> dest1 -> dest2 -> ...
        const points = [
          { lat: origin.lat, lng: origin.lng },
          ...destinations.map((dest) => ({ lat: dest.lat, lng: dest.lng })),
        ];

        for (let i = 0; i < points.length - 1; i++) {
          const start = points[i];
          const end = points[i + 1];
          let segmentDistance = 0;

          // Call Neshan Directions API
          try {
            // Try different API endpoints
            const endpoints = [
              `https://api.neshan.org/v4/direction?origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&type=car`,
              `https://api.neshan.org/v1/direction?origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&type=car`,
              `https://api.neshan.org/v2/direction?origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&type=car`,
            ];

            let routeData = null;
            let lastError = null;

            // Get Direction API key from environment
            const directionApiKey =
              import.meta.env.VITE_NESHAN_DIRECTION_API_KEY ||
              import.meta.env.VITE_NESHAN_API_KEY;

            if (!directionApiKey) {
              console.error(
                "VITE_NESHAN_DIRECTION_API_KEY or VITE_NESHAN_API_KEY is not set in .env file",
              );
              throw new Error("Neshan Direction API key is not configured");
            }

            for (const endpoint of endpoints) {
              try {
                const response = await fetch(endpoint, {
                  headers: {
                    "Api-Key": directionApiKey,
                    "Content-Type": "application/json",
                  },
                });

                if (response.ok) {
                  routeData = await response.json();
                  break;
                } else {
                  const errorText = await response.text();
                  lastError = `HTTP ${response.status}: ${errorText}`;
                }
              } catch (fetchError) {
                lastError = fetchError.message;
                continue;
              }
            }

            if (routeData) {
              console.log(`Route data received for segment ${i}:`, routeData);

              // Extract distance from route data
              // Try different formats for distance
              if (routeData.routes?.[0]?.legs) {
                routeData.routes[0].legs.forEach((leg) => {
                  if (leg.distance?.value) {
                    segmentDistance += leg.distance.value; // in meters
                  } else if (leg.distance) {
                    segmentDistance += leg.distance; // in meters
                  }
                });
              } else if (routeData.routes?.[0]?.distance?.value) {
                segmentDistance = routeData.routes[0].distance.value; // in meters
              } else if (routeData.routes?.[0]?.distance) {
                segmentDistance = routeData.routes[0].distance; // in meters
              } else if (routeData.distance?.value) {
                segmentDistance = routeData.distance.value; // in meters
              } else if (routeData.distance) {
                segmentDistance = routeData.distance; // in meters
              }

              // Try to extract route coordinates from different response formats
              let segmentPoints = [];

              // Format 1: routes[0].overview_polyline.points
              if (routeData.routes?.[0]?.overview_polyline?.points) {
                const decoded = decodePolyline(
                  routeData.routes[0].overview_polyline.points,
                );
                segmentPoints = decoded;
              }
              // Format 2: routes[0].geometry (encoded polyline)
              else if (
                routeData.routes?.[0]?.geometry &&
                typeof routeData.routes[0].geometry === "string"
              ) {
                const decoded = decodePolyline(routeData.routes[0].geometry);
                segmentPoints = decoded;
              }
              // Format 3: routes[0].legs with steps
              else if (routeData.routes?.[0]?.legs) {
                routeData.routes[0].legs.forEach((leg) => {
                  if (leg.steps) {
                    leg.steps.forEach((step) => {
                      if (step.start_location) {
                        segmentPoints.push([
                          step.start_location.lat,
                          step.start_location.lng,
                        ]);
                      }
                      if (
                        step.end_location &&
                        (!step.start_location ||
                          step.start_location.lat !== step.end_location.lat ||
                          step.start_location.lng !== step.end_location.lng)
                      ) {
                        segmentPoints.push([
                          step.end_location.lat,
                          step.end_location.lng,
                        ]);
                      }
                    });
                  } else if (leg.start_location && leg.end_location) {
                    segmentPoints.push([
                      leg.start_location.lat,
                      leg.start_location.lng,
                    ]);
                    segmentPoints.push([
                      leg.end_location.lat,
                      leg.end_location.lng,
                    ]);
                  }
                });
              }
              // Format 4: Direct coordinates array
              else if (
                routeData.routes?.[0]?.coordinates &&
                Array.isArray(routeData.routes[0].coordinates)
              ) {
                segmentPoints = routeData.routes[0].coordinates;
              }
              // Format 5: Direct geometry array
              else if (
                routeData.routes?.[0]?.geometry &&
                Array.isArray(routeData.routes[0].geometry)
              ) {
                segmentPoints = routeData.routes[0].geometry;
              }
              // Format 6: Try root level
              else if (routeData.overview_polyline?.points) {
                const decoded = decodePolyline(
                  routeData.overview_polyline.points,
                );
                segmentPoints = decoded;
              } else if (
                routeData.geometry &&
                typeof routeData.geometry === "string"
              ) {
                const decoded = decodePolyline(routeData.geometry);
                segmentPoints = decoded;
              }

              if (segmentPoints.length > 0) {
                // Remove duplicate consecutive points
                const cleanedPoints = [];
                segmentPoints.forEach((point, idx) => {
                  if (
                    idx === 0 ||
                    point[0] !== segmentPoints[idx - 1][0] ||
                    point[1] !== segmentPoints[idx - 1][1]
                  ) {
                    cleanedPoints.push(point);
                  }
                });
                console.log(
                  `Added ${cleanedPoints.length} route points for segment ${i}, distance: ${segmentDistance}m`,
                );
                allRoutePoints.push(...cleanedPoints);
                totalDistance += segmentDistance;
              } else {
                console.warn(
                  `No route points found in API response for segment ${i}. Full response:`,
                  JSON.stringify(routeData, null, 2),
                );
              }
            } else {
              console.warn(
                `Failed to fetch route for segment ${i}:`,
                lastError,
              );
            }
          } catch (segmentError) {
            console.warn(`Error fetching route segment ${i}:`, segmentError);
            // Continue with next segment
          }
        }

        // If Neshan API didn't return route, try OSRM as fallback
        if (allRoutePoints.length === 0) {
          console.log("Neshan API failed, trying OSRM fallback...");
          totalDistance = 0; // Reset distance

          for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];
            let segmentDistance = 0;

            try {
              // Use OSRM routing service (free and open source)
              const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
              const response = await fetch(osrmUrl);

              if (response.ok) {
                const data = await response.json();
                if (data.routes && data.routes[0] && data.routes[0].geometry) {
                  const coordinates = data.routes[0].geometry.coordinates;
                  // OSRM returns [lng, lat] format, convert to [lat, lng]
                  const converted = coordinates.map((coord) => [
                    coord[1],
                    coord[0],
                  ]);
                  allRoutePoints.push(...converted);

                  // Extract distance from OSRM (in meters)
                  if (data.routes[0].distance) {
                    segmentDistance = data.routes[0].distance;
                    totalDistance += segmentDistance;
                  }
                }
              }
            } catch (osrmError) {
              console.warn(`OSRM fallback failed for segment ${i}:`, osrmError);
            }
          }
        }

        // Draw route if we have points
        if (allRoutePoints.length > 0) {
          console.log(
            `Drawing route with ${allRoutePoints.length} points, total distance: ${totalDistance}m`,
          );
          const polyline = L.polyline(allRoutePoints, {
            color: "#3b82f6",
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1,
          }).addTo(mapInstanceRef.current);
          routePolylineRef.current = polyline;

          // Add distance label on the route
          if (totalDistance > 0 && allRoutePoints.length > 0) {
            // Calculate middle point of the route
            const midIndex = Math.floor(allRoutePoints.length / 2);
            const midPoint = allRoutePoints[midIndex];

            routeDistanceMarkerRef.current = createDistanceLabel(
              midPoint,
              totalDistance,
            );
          }
        } else {
          // Last fallback: draw direct line if all APIs fail
          console.warn("All routing APIs failed, drawing direct line");
          const directPoints = points.map((p) => [p.lat, p.lng]);

          // Calculate approximate distance for direct line
          for (let i = 0; i < points.length - 1; i++) {
            const dist = calculateDistance(
              points[i].lat,
              points[i].lng,
              points[i + 1].lat,
              points[i + 1].lng,
            );
            totalDistance += dist;
          }

          const polyline = L.polyline(directPoints, {
            color: "#ff6b6b",
            weight: 3,
            opacity: 0.5,
            smoothFactor: 1,
            dashArray: "10, 5", // Dashed line to indicate fallback
          }).addTo(mapInstanceRef.current);
          routePolylineRef.current = polyline;

          // Add distance label for direct line fallback
          if (totalDistance > 0 && directPoints.length > 0) {
            const midIndex = Math.floor(directPoints.length / 2);
            const midPoint = directPoints[midIndex];

            routeDistanceMarkerRef.current = createDistanceLabel(
              midPoint,
              totalDistance,
              "#ff6b6b",
              "#dc2626",
            );
          }
        }

        // Fit map to show all points
        const allMarkers = [
          ...destinationMarkersRef.current,
          originMarkerRef.current,
        ].filter(Boolean);
        if (allMarkers.length > 0) {
          const group = new L.FeatureGroup(allMarkers);
          mapInstanceRef.current.fitBounds(group.getBounds().pad(0.2));
        }
      } catch (err) {
        console.error("Error calculating route:", err);

        // Fallback to direct polyline on error
        const directPoints = [];
        if (origin && origin.lat && origin.lng) {
          directPoints.push([origin.lat, origin.lng]);
        }
        destinations.forEach((dest) => {
          if (dest && dest.lat && dest.lng) {
            directPoints.push([dest.lat, dest.lng]);
          }
        });

        if (directPoints.length >= 2) {
          // Calculate approximate distance
          const points = [];
          if (origin && origin.lat && origin.lng) {
            points.push({ lat: origin.lat, lng: origin.lng });
          }
          destinations.forEach((dest) => {
            if (dest && dest.lat && dest.lng) {
              points.push({ lat: dest.lat, lng: dest.lng });
            }
          });

          for (let i = 0; i < points.length - 1; i++) {
            const dist = calculateDistance(
              points[i].lat,
              points[i].lng,
              points[i + 1].lat,
              points[i + 1].lng,
            );
            totalDistance += dist;
          }

          const polyline = L.polyline(directPoints, {
            color: "#3b82f6",
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1,
            dashArray: "5, 5",
          }).addTo(mapInstanceRef.current);
          routePolylineRef.current = polyline;

          // Add distance label for error fallback
          if (totalDistance > 0 && directPoints.length > 0) {
            const midIndex = Math.floor(directPoints.length / 2);
            const midPoint = directPoints[midIndex];

            routeDistanceMarkerRef.current = createDistanceLabel(
              midPoint,
              totalDistance,
            );
          }
        }
      }
    };

    calculateAndDrawRoute();
  }, [origin, destinations]);

  // Get store functions
  const { getCachedAddress, setCachedAddress } = useReverseGeocodeStore();

  // Reverse geocoding to get addresses from coordinates
  const reverseGeocode = async (lat, lng) => {
    // Check cache first
    const cachedAddress = getCachedAddress(lat, lng);
    if (cachedAddress) {
      return cachedAddress;
    }

    let address = null;

    // Skip Neshan Reverse API if it was disabled due to API key error
    if (!neshanReverseDisabledRef.current) {
      try {
        // Get Reverse Geocoding API key from environment
        const reverseApiKey =
          import.meta.env.VITE_NESHAN_REVERSE_API_KEY ||
          import.meta.env.VITE_NESHAN_API_KEY ||
          apiKey;

        if (!reverseApiKey) {
          console.warn(
            "VITE_NESHAN_REVERSE_API_KEY or VITE_NESHAN_API_KEY is not set in .env file",
          );
        } else {
          // Try Neshan Reverse Geocoding API first
          const response = await fetch(
            `https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}`,
            {
              headers: {
                "Api-Key": reverseApiKey,
              },
            },
          );

          const data = await response.json();

          // Check if response has error status (especially code 483)
          if (data.status === "ERROR" || data.code) {
            if (data.code === 483) {
              // API Key not suitable for Reverse API - disable it permanently for this session
              console.warn(
                "Neshan Reverse API key not suitable (code 483), disabling Neshan Reverse for this session",
              );
              neshanReverseDisabledRef.current = true;
            }
          } else if (response.ok) {
            // Success - use Neshan result
            if (data.formatted_address) {
              address = data.formatted_address;
            } else if (data.address) {
              address = data.address;
            } else if (data.formatted) {
              address = data.formatted;
            }
          }
        }
      } catch (neshanError) {
        console.warn("Neshan Reverse API failed:", neshanError);
      }
    }

    // Fallback to Nominatim if Neshan is disabled or failed or no result
    if (!address) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fa`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.display_name) {
            // Extract shorter address (first 2-3 parts)
            const parts = data.display_name.split(",");
            if (parts.length >= 2) {
              address = `${parts[0]}, ${parts[1]}`.trim();
            } else {
              address = data.display_name;
            }
          }
        }
      } catch (error) {
        console.warn("Nominatim reverse geocoding failed:", error);
      }
    }

    // Cache the result if we got one
    if (address) {
      setCachedAddress(lat, lng, address);
    }

    return address;
  };

  // Helper function to check Neshan Quota API
  const checkNeshanQuota = async () => {
    try {
      const quotaApiKey = import.meta.env.VITE_NESHAN_QUOTA_API_KEY;

      if (!quotaApiKey) {
        console.warn(
          "VITE_NESHAN_QUOTA_API_KEY or VITE_NESHAN_API_KEY is not set in .env file",
        );
        return null;
      }

      const response = await fetch("https://api.neshan.org/v1/quota", {
        headers: {
          "Api-Key": quotaApiKey,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.warn("Neshan Quota API failed:", error);
    }
    return null;
  };

  // Fetch address for origin
  useEffect(() => {
    if (origin && origin.lat && origin.lng) {
      reverseGeocode(origin.lat, origin.lng).then((address) => {
        setOriginAddress(
          address || `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`,
        );
      });
    } else {
      setOriginAddress("");
    }
  }, [origin, apiKey]);

  // Fetch addresses for destinations
  useEffect(() => {
    if (destinations.length > 0) {
      const fetchAddresses = async () => {
        const addresses = await Promise.all(
          destinations.map((dest) => {
            if (dest.lat && dest.lng) {
              return reverseGeocode(dest.lat, dest.lng);
            }
            return null;
          }),
        );
        setDestinationAddresses(
          addresses.map(
            (addr, index) =>
              addr ||
              `${destinations[index]?.lat?.toFixed(4)}, ${destinations[
                index
              ]?.lng?.toFixed(4)}`,
          ),
        );
      };
      fetchAddresses();
    } else {
      setDestinationAddresses([]);
    }
  }, [destinations, apiKey]);

  /**
   * Filter search results to only include postal addresses (not POIs)
   * @param {Array} items - Array of search result items from Neshan API
   * @returns {Array} Filtered array containing only address-type items
   */
  const filterAddressResults = (items) => {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.filter((item) => {
      // Check if item has type field and it's "address"
      if (item.type === "address") {
        return true;
      }

      // If type field doesn't exist or is different, check other indicators
      // Exclude POIs by checking category or title patterns
      const title = (
        item.title ||
        item.name ||
        item.address ||
        ""
      ).toLowerCase();
      const category = (item.category || "").toLowerCase();

      // Exclude common POI patterns
      const poiPatterns = [
        "رستوران",
        "restaurant",
        "کافه",
        "cafe",
        "فروشگاه",
        "shop",
        "مغازه",
        "بانک",
        "bank",
        "داروخانه",
        "pharmacy",
        "هتل",
        "hotel",
        "پمپ بنزین",
        "gas station",
        "سینما",
        "cinema",
        "پارک",
        "park",
        "موزه",
        "museum",
        "بیمارستان",
        "hospital",
        "کلینیک",
        "clinic",
      ];

      // If title contains POI patterns, exclude it
      const isPOI = poiPatterns.some((pattern) => title.includes(pattern));
      if (isPOI) {
        return false;
      }

      // If category indicates POI, exclude it
      if (
        category &&
        (category.includes("poi") || category.includes("business"))
      ) {
        return false;
      }

      // Include items that look like addresses (have street, alley, or number patterns)
      const addressPatterns = [
        "خیابان",
        "street",
        "کوچه",
        "alley",
        "پلاک",
        "plaque",
        "بلوار",
        "boulevard",
      ];
      const looksLikeAddress = addressPatterns.some((pattern) =>
        title.includes(pattern),
      );

      // If type is explicitly "poi", exclude it
      if (item.type === "poi") {
        return false;
      }

      // If it looks like an address or doesn't have type field, include it
      // This is more permissive to ensure we get results
      // Also include items that don't match POI patterns (more permissive)
      return looksLikeAddress || !item.type || (!isPOI && !category);
    });
  };

  /**
   * Handle search with debounce - Only searches for postal addresses in Iran
   * @param {string} query - Search query string
   */
  const handleSearch = (query) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Reset results if query is too short
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    // Set loading state
    setIsSearching(true);

    // Debounce: Wait 300ms before making API call
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        let allItems = [];

        // Skip Neshan Search API if it was disabled due to API key error
        if (!neshanSearchDisabledRef.current) {
          // Get Search API key from environment
          const searchApiKey =
            import.meta.env.VITE_NESHAN_SEARCH_API_KEY ||
            import.meta.env.VITE_NESHAN_API_KEY;

          if (!searchApiKey) {
            console.warn(
              "VITE_NESHAN_SEARCH_API_KEY or VITE_NESHAN_API_KEY is not set in .env file",
            );
            neshanSearchDisabledRef.current = true;
            return;
          }

          // Try Neshan Search API first
          const searchUrl = `https://api.neshan.org/v1/search?term=${encodeURIComponent(
            query.trim(),
          )}&lat=35.699756&lng=51.338076`;

          try {
            const response = await fetch(searchUrl, {
              headers: {
                "Api-Key": searchApiKey,
                "Content-Type": "application/json",
              },
            });

            const data = await response.json();

            // Check if response has error status (especially code 483)
            if (data.status === "ERROR" || data.code) {
              if (data.code === 483) {
                // API Key not suitable for Search API - disable it permanently for this session
                console.warn(
                  "Neshan Search API key not suitable (code 483), disabling Neshan Search for this session",
                );
                neshanSearchDisabledRef.current = true;
              } else {
                console.warn("Neshan Search API returned error:", data);
              }
            } else if (response.ok) {
              // Success - use Neshan results
              console.log("Neshan Search API Response:", data);

              // Handle different response structures
              if (data.items && Array.isArray(data.items)) {
                allItems = data.items.map(normalizeSearchItem);
              } else if (Array.isArray(data)) {
                allItems = data.map(normalizeSearchItem);
              }
            }
          } catch (neshanError) {
            console.warn("Neshan Search API failed:", neshanError);
          }
        }

        // Use Nominatim (OpenStreetMap) if Neshan API is disabled or returned no results
        if (neshanSearchDisabledRef.current || allItems.length === 0) {
          console.log("Using Nominatim (OpenStreetMap) as fallback");
          const nominatimResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
              query.trim(),
            )}&format=json&limit=10&accept-language=fa&countrycodes=ir&bounded=1&viewbox=44.0,25.0,64.0,40.0&addressdetails=1`,
            {
              headers: {
                "User-Agent": "IntercityTaxiApp/1.0",
              },
            },
          );

          if (nominatimResponse.ok) {
            const nominatimData = await nominatimResponse.json();
            console.log("Nominatim results:", nominatimData.length);

            // Filter to ensure results are in Iran and look like addresses
            allItems = nominatimData
              .filter((item) => {
                const address = item.display_name || "";
                const lat = parseFloat(item.lat);
                const lng = parseFloat(item.lon);

                // Check geographic bounds
                if (lat < 25 || lat > 40 || lng < 44 || lng > 64) {
                  return false;
                }

                // Check if it's an address (not a POI)
                const addressLower = address.toLowerCase();
                const poiPatterns = [
                  "restaurant",
                  "رستوران",
                  "cafe",
                  "کافه",
                  "shop",
                  "فروشگاه",
                  "bank",
                  "بانک",
                  "pharmacy",
                  "داروخانه",
                ];

                const isPOI = poiPatterns.some((pattern) =>
                  addressLower.includes(pattern),
                );

                // Prefer addresses (streets, alleys, etc.)
                const addressPatterns = [
                  "خیابان",
                  "street",
                  "کوچه",
                  "alley",
                  "بلوار",
                  "boulevard",
                  "میدان",
                  "square",
                ];
                const looksLikeAddress = addressPatterns.some((pattern) =>
                  addressLower.includes(pattern),
                );

                return !isPOI || looksLikeAddress;
              })
              .map((item) => ({
                title: item.display_name,
                name: item.display_name,
                address: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                location: {
                  lat: parseFloat(item.lat),
                  lng: parseFloat(item.lon),
                },
                type: "address", // Mark as address for filtering
              }))
              .map(normalizeSearchItem);

            console.log("Filtered Nominatim results:", allItems.length);
          }
        }

        // Debug: Log items before filtering
        console.log("Items before filtering:", allItems.length, allItems);

        // Filter to only include address-type results (exclude POIs)
        const addressResults = filterAddressResults(allItems).map(
          normalizeSearchItem,
        );

        // Debug: Log filtered results
        console.log("Total items from API:", allItems.length);
        console.log("Address results after filtering:", addressResults.length);
        console.log("Sample items:", allItems.slice(0, 3));
        console.log("Filtered sample:", addressResults.slice(0, 3));

        // If filtering removed all results, use original results (fallback)
        // This ensures users always get results when API returns data
        const resultsToUse =
          addressResults.length > 0
            ? addressResults
            : allItems.map(normalizeSearchItem);

        console.log("Results to use (after fallback):", resultsToUse.length);

        // Additional filter: Ensure results are within Iran's geographic bounds
        const iranAddressResults = resultsToUse.filter((item) => {
          const lat =
            item.location?.lat ??
            item.lat ??
            item.location?.y ??
            item.location?.[1];
          const lng =
            item.location?.lng ??
            item.lng ??
            item.location?.x ??
            item.location?.[0];

          // Iran's approximate geographic bounds
          if (!lat || !lng) return false;
          return lat >= 25 && lat <= 40 && lng >= 44 && lng <= 64;
        });

        console.log(
          "Final results after geographic filter:",
          iranAddressResults.length,
        );

        // Update results
        setSearchResults(iranAddressResults);
        // Show results dropdown if we have results
        setShowSearchResults(iranAddressResults.length > 0);
      } catch (error) {
        console.error("Neshan Search API error, trying fallback:", error);

        // Fallback to Nominatim (OpenStreetMap)
        try {
          const nominatimResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
              query.trim(),
            )}&format=json&limit=10&accept-language=fa&countrycodes=ir&bounded=1&viewbox=44.0,25.0,64.0,40.0&addressdetails=1`,
            {
              headers: {
                "User-Agent": "IntercityTaxiApp/1.0",
              },
            },
          );

          if (nominatimResponse.ok) {
            const nominatimData = await nominatimResponse.json();
            console.log("Nominatim results:", nominatimData.length);

            // Filter to ensure results are in Iran and look like addresses
            const allItems = nominatimData
              .filter((item) => {
                const address = item.display_name || "";
                const lat = parseFloat(item.lat);
                const lng = parseFloat(item.lon);

                // Check geographic bounds
                if (lat < 25 || lat > 40 || lng < 44 || lng > 64) {
                  return false;
                }

                // Check if it's an address (not a POI)
                const addressLower = address.toLowerCase();
                const poiPatterns = [
                  "restaurant",
                  "رستوران",
                  "cafe",
                  "کافه",
                  "shop",
                  "فروشگاه",
                  "bank",
                  "بانک",
                  "pharmacy",
                  "داروخانه",
                ];

                const isPOI = poiPatterns.some((pattern) =>
                  addressLower.includes(pattern),
                );

                // Prefer addresses (streets, alleys, etc.)
                const addressPatterns = [
                  "خیابان",
                  "street",
                  "کوچه",
                  "alley",
                  "بلوار",
                  "boulevard",
                  "میدان",
                  "square",
                ];
                const looksLikeAddress = addressPatterns.some((pattern) =>
                  addressLower.includes(pattern),
                );

                return !isPOI || looksLikeAddress;
              })
              .map((item) => ({
                title: item.display_name,
                name: item.display_name,
                address: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                location: {
                  lat: parseFloat(item.lat),
                  lng: parseFloat(item.lon),
                },
                type: "address", // Mark as address for filtering
              }))
              .map(normalizeSearchItem);

            console.log("Filtered Nominatim results:", allItems.length);

            // Filter using our address filter
            const addressResults = filterAddressResults(allItems).map(
              normalizeSearchItem,
            );
            const resultsToUse =
              addressResults.length > 0 ? addressResults : allItems;

            // Geographic filter
            const iranAddressResults = resultsToUse.filter((item) => {
              const lat =
                item.location?.lat ??
                item.lat ??
                item.location?.y ??
                item.location?.[1];
              const lng =
                item.location?.lng ??
                item.lng ??
                item.location?.x ??
                item.location?.[0];
              if (!lat || !lng) return false;
              return lat >= 25 && lat <= 40 && lng >= 44 && lng <= 64;
            });

            setSearchResults(iranAddressResults);
            setShowSearchResults(iranAddressResults.length > 0);
          } else {
            throw new Error("Nominatim fallback also failed");
          }
        } catch (fallbackError) {
          console.error("Fallback search also failed:", fallbackError);
          setSearchResults([]);
          setShowSearchResults(false);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Handle selecting a search result
  const handleSelectSearchResult = (result) => {
    const coordinates = {
      lat: result.location?.lat || result.lat,
      lng: result.location?.lng || result.lng,
    };

    if (!coordinates.lat || !coordinates.lng) {
      return;
    }

    // Fly to location only (don't add marker or set as origin/destination)
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([coordinates.lat, coordinates.lng], 15, {
        animate: true,
        duration: 1.5,
      });
    }

    // Clear search and close search box
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    setShowSearchBox(false);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest(".search-container") === null) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="relative w-full"
      style={{ height: overlay ? "100vh" : "100vh", position: "relative" }}
    >
      {/* Website Link and Search Icon Button - Fixed position on top right of map (hidden in overlay mode) */}
      {!overlay && (
        <>
          <div
            className="absolute top-4 left-4 flex flex-col-reverse gap-2 z-[100]"
            style={{ position: "absolute" }}
          >
            <a
              href="tel:02167189000"
              className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-110 flex-shrink-0"
              title="تماس با ما"
            >
              <svg
                className="h-6 w-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </a>
            <a
              href="https://www.taxirooz.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-110 flex-shrink-0"
              title="وب‌سایت تاکسی‌روز"
            >
              <svg
                className="h-6 w-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            </a>
            <button
              onClick={() => setShowSearchBox(!showSearchBox)}
              className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-110 flex-shrink-0"
              title="جستجوی مکان"
            >
              <svg
                className="h-6 w-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            {onLoginButtonClick && (
              <button
                onClick={onLoginButtonClick}
                className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-110 flex-shrink-0"
                title="ورود به سایت"
              >
                <svg
                  className="h-6 w-6 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="absolute top-4 right-4 z-[120] pointer-events-none">
            <img
              src={whiteLogo}
              alt="Logo"
              className="h-10 md:h-12 w-auto drop-shadow-lg"
            />
          </div>
        </>
      )}

      {/* Search Box - Overlay on top (shown when showSearchBox is true, hidden in overlay mode) */}
      {!overlay && showSearchBox && (
        <div
          className="absolute top-4 right-4 left-4 search-container animate-in slide-in-from-top-2 duration-200 z-[200]"
          style={{ position: "absolute" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="جستجوی مکان (مثلاً: تهران، میدان آزادی)"
              className="w-full px-4 py-3 pr-12 pl-12 border-2 border-gray-300 rounded-lg shadow-lg bg-white/95 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              autoFocus
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              {isSearching ? (
                <svg
                  className="animate-spin h-5 w-5 text-gray-400"
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
              ) : (
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSearchBox(false);
                setSearchQuery("");
                setSearchResults([]);
                setShowSearchResults(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="بستن"
            >
              <svg
                className="h-5 w-5"
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
            </button>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute z-[300] w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {/* Loading State */}
                {isSearching && (
                  <div className="flex items-center justify-center px-4 py-6">
                    <svg
                      className="animate-spin h-5 w-5 text-sky-600"
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
                    <span className="mr-2 text-sm text-gray-600">
                      در حال جستجو...
                    </span>
                  </div>
                )}

                {/* Results List */}
                {!isSearching && searchResults.length > 0 && (
                  <>
                    {searchResults.map((result, index) => {
                      const city = extractCityFromResult(result);
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectSearchResult(result)}
                          className="w-full text-right px-4 py-3 hover:bg-sky-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-start gap-3">
                            <svg
                              className="h-5 w-5 text-sky-500 mt-0.5 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">
                                {result.title || result.name || result.address}
                              </p>
                              {result.address &&
                                result.address !==
                                  (result.title || result.name) && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    {result.address}
                                  </p>
                                )}
                              {city && (
                                <p className="text-xs text-sky-700 mt-1">
                                  شهر: {city}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Empty State */}
                {!isSearching && searchResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                    <svg
                      className="h-8 w-8 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm text-gray-500">آدرس پستی یافت نشد</p>
                    <p className="text-xs text-gray-400 mt-1">
                      لطفاً نام خیابان، کوچه یا پلاک را وارد کنید
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Container - Full Screen */}
      <div
        className="absolute inset-0 z-0"
        style={{ pointerEvents: overlay ? "none" : "auto" }}
      >
        <div
          ref={mapRef}
          className={`w-full h-full ${
            error || mapError ? "border-2 border-red-500" : ""
          }`}
          style={{ direction: "ltr", zIndex: 0 }}
        >
          {mapError && (
            <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
              <div className="text-center p-4">
                <p className="text-red-600 font-semibold mb-2">{mapError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Locations Panel - Overlay on bottom of map (hidden in overlay mode) */}
        {!overlay && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t-2 border-gray-200 shadow-lg z-[50]">
            <div className="p-2 md:p-3">
              {/* Origin */}
              {origin && origin.lat && origin.lng && (
                <div
                  className="flex items-center gap-2 md:gap-3 mb-2 p-1.5 md:p-2 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 cursor-pointer transition-colors"
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo(
                        [origin.lat, origin.lng],
                        15,
                        {
                          animate: true,
                          duration: 1.5,
                        },
                      );
                    }
                  }}
                >
                  <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-red-500 rounded-full flex items-center justify-center text-white">
                    <svg
                      className="w-4 h-4 md:w-5 md:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-semibold text-gray-800">
                      مبدا
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {originAddress ||
                        `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOriginChange(null);
                    }}
                    className="flex-shrink-0 p-1 md:p-1.5 text-red-600 hover:bg-red-200 rounded transition-colors"
                    title="حذف مبدا"
                  >
                    <svg
                      className="w-3.5 h-3.5 md:w-4 md:h-4"
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
                  </button>
                </div>
              )}

              {/* Destinations */}
              {destinations.length > 0 && (
                <div className="space-y-1.5 md:space-y-2 mb-3">
                  {destinations.map((dest, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 md:gap-3 p-1.5 md:p-2 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
                      onClick={() => {
                        if (mapInstanceRef.current && dest.lat && dest.lng) {
                          mapInstanceRef.current.flyTo(
                            [dest.lat, dest.lng],
                            15,
                            {
                              animate: true,
                              duration: 1.5,
                            },
                          );
                        }
                      }}
                    >
                      <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-semibold text-gray-800">
                          مقصد {index + 1}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {destinationAddresses[index] ||
                            `${dest.lat?.toFixed(4)}, ${dest.lng?.toFixed(4)}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDestinationRemove(index);
                        }}
                        className="flex-shrink-0 p-1 md:p-1.5 text-red-600 hover:bg-red-200 rounded transition-colors"
                        title="حذف مقصد"
                      >
                        <svg
                          className="w-3.5 h-3.5 md:w-4 md:h-4"
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
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button */}
              {onActionButtonClick && (
                <button
                  type="button"
                  onClick={onActionButtonClick}
                  disabled={!onActionButtonEnabled}
                  className="w-full py-3 md:py-4 bg-gradient-to-r from-sky-600 to-sky-800 text-white text-base md:text-lg font-semibold rounded-lg shadow-xl hover:from-sky-700 hover:to-sky-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-sky-600 disabled:hover:to-sky-800"
                >
                  {actionButtonText || "ادامه"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapSelector;

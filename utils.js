// Haversine Formula - Calculate distance between two coordinates
export const calculateDistance = (point1, point2) => {
  const earthRadiusKm = 6371;
  const degToRad = Math.PI / 180;

  const dLat = (point2.latitude - point1.latitude) * degToRad;
  const dLon = (point2.longitude - point1.longitude) * degToRad;

  const lat1Rad = point1.latitude * degToRad;
  const lat2Rad = point2.latitude * degToRad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c * 1000; // return in metres
};

// Check if user location is within radius
export const isWithinRadius = (userLocation, center, radiusInMeters) => {
  const distance = calculateDistance(userLocation, center);
  return distance <= radiusInMeters;
};

// Format time - HH:MM:SS
export const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// Format date - YYYY-MM-DD
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get today's date in YYYY-MM-DD format
export const getTodayDate = () => {
  return formatDate(new Date());
};

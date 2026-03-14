import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import * as Location from 'expo-location';
import { GEOFENCE_CONFIG } from '../config/appConfig';
import { setLocation, setLocationLoading } from '../store/slices/locationSlice';

const calcDistance = (p1, p2) => {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (p2.latitude - p1.latitude) * rad;
  const dLon = (p2.longitude - p1.longitude) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1.latitude * rad) * Math.cos(p2.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const useLocation = () => {
  const dispatch = useDispatch();
  const { coords, isInZone, loading, error } = useSelector((state) => state.location);

  const refreshLocation = useCallback(async () => {
    dispatch(setLocationLoading(true));
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const inZone = calcDistance(loc.coords, GEOFENCE_CONFIG.center) <= GEOFENCE_CONFIG.radius;
      dispatch(setLocation({ coords: loc.coords, isInZone: inZone }));
    } catch (_) {
      dispatch(setLocationLoading(false));
    }
  }, [dispatch]);

  return { coords, isInZone, loading, error, refreshLocation };
};

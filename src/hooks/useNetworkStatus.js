import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [networkType, setNetworkType] = useState(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
      setNetworkType(state.type);
    });

    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? true);
      setNetworkType(state.type);
    });

    return unsubscribe;
  }, []);

  return { isConnected, networkType };
};

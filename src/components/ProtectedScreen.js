import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * ProtectedScreen - Componente para proteger telas que requerem autenticação
 * Se o usuário não está autenticado, renderiza null (a navegação vai lidar)
 */
export const ProtectedScreen = ({ component: Component, ...props }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthorized(!!user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!isAuthorized) {
    return null; // Se não autorizado, não renderiza nada
  }

  return <Component {...props} />;
};

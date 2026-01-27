import { useDispatch, useSelector } from 'react-redux';
import { loginUser, registerUser, logoutUser } from '../store/slices/authSlice';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, loading, error, isAuthenticated } = useSelector((state) => state.auth);
  const [firebaseUser, setFirebaseUser] = useState(null);

  // Sincronizar com Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    return dispatch(loginUser({ email, password }));
  };

  const register = async (email, password, profileData = {}) => {
    return dispatch(registerUser({ email, password, profileData }));
  };

  const logout = async () => {
    return dispatch(logoutUser());
  };

  return {
    user: firebaseUser || user, // Usar Firebase user primeiro, depois Redux
    loading,
    error,
    isAuthenticated: !!firebaseUser || isAuthenticated,
    login,
    register,
    logout,
  };
};

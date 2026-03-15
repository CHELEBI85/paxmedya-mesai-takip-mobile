import { useDispatch, useSelector } from 'react-redux';
import { loginUser, logoutUser } from '../store/slices/authSlice';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, loading, error, isAuthenticated } = useSelector((state) => state.auth);
  const [firebaseUser, setFirebaseUser] = useState(null);

  // Firebase Auth ile senkronize et
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    return dispatch(loginUser({ email, password }));
  };

  const logout = async () => {
    return dispatch(logoutUser());
  };

  return {
    user: firebaseUser || user, // Önce Firebase user'ı kullan, sonra Redux
    loading,
    error,
    isAuthenticated: !!firebaseUser || isAuthenticated,
    login,
    logout,
  };
};

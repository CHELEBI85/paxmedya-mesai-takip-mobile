import { useDispatch, useSelector } from 'react-redux';
import {
  fetchWorkRecords,
  addWorkRecord,
  updateWorkRecord,
  deleteWorkRecord,
  getUserProfile,
  updateUserProfile,
} from '../store/slices/databaseSlice';

export const useDatabase = () => {
  const dispatch = useDispatch();
  const { records, userProfile, loading, error } = useSelector((state) => state.database);

  const getWorkRecords = async (userId) => {
    return dispatch(fetchWorkRecords({ userId }));
  };

  const getProfile = async (userId) => {
    return dispatch(getUserProfile({ userId }));
  };

  const updateProfile = async (userId, data) => {
    return dispatch(updateUserProfile({ userId, data }));
  };

  const addRecord = async (userId, data) => {
    return dispatch(addWorkRecord({ userId, data }));
  };

  const updateRecord = async (recordId, data) => {
    return dispatch(updateWorkRecord({ recordId, data }));
  };

  const deleteRecord = async (recordId) => {
    return dispatch(deleteWorkRecord({ recordId }));
  };

  return {
    records,
    userProfile,
    loading,
    error,
    getWorkRecords,
    getProfile,
    updateProfile,
    addRecord,
    updateRecord,
    deleteRecord,
  };
};

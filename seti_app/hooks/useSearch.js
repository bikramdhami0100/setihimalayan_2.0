import { useState, useContext } from 'react';
import { searchSchedules } from '../api/schedules';
import { UIContext } from '../context/UIContext';

export const useSearch = () => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showSnackbar } = useContext(UIContext);

  const search = async (origin, destination, date) => {
    if (!origin || !destination || !date) {
      showSnackbar('Please fill all search fields', 'warning');
      return { success: false, results: [] };
    }
    setIsLoading(true);
    try {
      const response = await searchSchedules(origin, destination, date);
      const schedules = response.data.data.schedules;
      setResults(schedules);
      setIsLoading(false);
      return { success: true, results: schedules };
    } catch (error) {
      const message = error.response?.data?.message || 'Search failed';
      showSnackbar(message, 'error');
      setIsLoading(false);
      return { success: false, results: [] };
    }
  };

  const clearResults = () => setResults([]);

  return { results, isLoading, search, clearResults };
};
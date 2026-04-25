import React, { createContext, useState, useContext } from 'react';
import { searchSchedules } from '../api/schedules';

const SearchContext = createContext();

export function SearchProvider({ children }) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchParams, setLastSearchParams] = useState(null);
  
  // New: Global search for admin/fleet/users
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  const performSearch = async (origin, destination, date) => {
    setIsLoading(true);
    setLastSearchParams({ origin, destination, date });
    try {
      const response = await searchSchedules(origin, destination, date);
      const schedules = response.data.data.schedules;
      setResults(schedules);
      setIsLoading(false);
      return { success: true, results: schedules };
    } catch (error) {
      setIsLoading(false);
      return { success: false, results: [] };
    }
  };

  return (
    <SearchContext.Provider value={{ 
      results, 
      isLoading, 
      performSearch, 
      lastSearchParams,
      globalSearchQuery,
      setGlobalSearchQuery 
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export const useSearchData = () => useContext(SearchContext);

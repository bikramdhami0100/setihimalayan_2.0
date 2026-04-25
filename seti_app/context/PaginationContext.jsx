import React, { createContext, useState, useContext, useCallback } from 'react';

const PaginationContext = createContext();

export function PaginationProvider({ children }) {
  const [paginations, setPaginations] = useState({});

  /**
   * getPaginationState - returns the state for a specific screen/key
   * defaults to { page: 0, limit: 10, total: 0 }
   */
  const getPaginationState = useCallback((key) => {
    return paginations[key] || { page: 0, limit: 10, total: 0 };
  }, [paginations]);

  /**
   * updatePagination - updates state for a specific key
   */
  const updatePagination = useCallback((key, updates) => {
    setPaginations(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { page: 0, limit: 10, total: 0 }),
        ...updates
      }
    }));
  }, []);

  /**
   * resetPagination - clears state for a key
   */
  const resetPagination = useCallback((key) => {
    setPaginations(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  return (
    <PaginationContext.Provider value={{ getPaginationState, updatePagination, resetPagination }}>
      {children}
    </PaginationContext.Provider>
  );
}

export const usePagination = () => {
  const context = useContext(PaginationContext);
  if (!context) throw new Error("usePagination must be used within PaginationProvider");
  return context;
};

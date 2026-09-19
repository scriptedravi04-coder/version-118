import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const LoadingContext = createContext();

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const delayTimerRef = useRef(null);

  const startLoading = useCallback(() => {
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
    }
    // Only show loader if the operation takes longer than 250ms
    delayTimerRef.current = setTimeout(() => {
      setIsLoading(true);
      setIsFinishing(false);
    }, 250);
  }, []);

  const stopLoading = useCallback(() => {
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    setIsFinishing(true);
    setIsLoading(false);
    setIsFinishing(false);
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading, isFinishing }}>
      {children}
    </LoadingContext.Provider>
  );
};

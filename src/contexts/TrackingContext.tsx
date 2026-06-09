import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface TrackingContextType {
  isTracking: boolean;
  error: string | null;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || profile?.role !== 'agent') {
      setIsTracking(false);
      return;
    }

    let watchId: number | null = null;

    const startTracking = () => {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const path = `users/${user.uid}`;
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                lastPosition: {
                  lat: latitude,
                  lng: longitude,
                  updatedAt: new Date().toISOString()
                },
                isOnline: true,
                updatedAt: serverTimestamp()
              });
              setIsTracking(true);
              setError(null);
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, path);
            }
          },
          (err) => {
            console.error('Geolocation error:', err);
            setError('Accès GPS refusé ou indisponible.');
            setIsTracking(false);
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );
      } else {
        setError("Géolocalisation non supportée.");
      }
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        // Optional: set agent offline when they close the app? 
        // Not ideal since we want background tracking. 
        // But for this web env, we can just clear the watch.
      }
    };
  }, [user, profile]);

  return (
    <TrackingContext.Provider value={{ isTracking, error }}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (context === undefined) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
};

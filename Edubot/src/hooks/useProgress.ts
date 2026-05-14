

import { useState, useEffect, useCallback } from 'react';
import {
  loadProgress,
  updateActivityProgress,
  resetProgress,
  ProgressData,
} from '../services/storage';
import { calcAccuracy } from '../utils/helpers';

export function useProgress() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading,  setLoading]  = useState(true);

  
  useEffect(() => {
    try {
      const data = loadProgress();
      setProgress(data);
    } catch {
      setProgress(loadProgress()); 
    } finally {
      setLoading(false);
    }
  }, []);

  
  const recordActivity = useCallback(
    (activity: keyof ProgressData, correct: boolean, timeSpent: number) => {
      const updated = updateActivityProgress(activity, correct, timeSpent);
      setProgress(updated);
    },
    [],
  );

 
  const reset = useCallback(() => {
    resetProgress();
    setProgress(loadProgress());
  }, []);

  
  const getAccuracy = useCallback(
    (activity: keyof ProgressData): number => {
      if (!progress) return 0;
      const { completed, correct } = progress[activity];
      return calcAccuracy(completed, correct);
    },
    [progress],
  );

  const totalCompleted = progress
    ? Object.values(progress).reduce((sum, a) => sum + a.completed, 0)
    : 0;

  const totalTimeSpent = progress
    ? Object.values(progress).reduce((sum, a) => sum + a.timeSpent, 0)
    : 0;

  return {
    progress,
    loading,
    recordActivity,
    reset,
    getAccuracy,
    totalCompleted,
    totalTimeSpent,
  };
}

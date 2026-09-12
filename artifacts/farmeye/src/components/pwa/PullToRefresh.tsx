import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshWrapperProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  className?: string;
}

export const PullToRefreshWrapper: React.FC<PullToRefreshWrapperProps> = ({ 
  children, 
  onRefresh,
  className 
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const threshold = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start tracking if we're at the top of the page
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0 && touchStartY.current > 0) {
      const distance = e.touches[0].clientY - touchStartY.current;
      if (distance > 0 && !isRefreshing) {
        // Apply resistance
        setPullDistance(Math.min(distance * 0.5, threshold * 1.5));
      }
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > threshold && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    touchStartY.current = 0;
  }, [pullDistance, onRefresh, isRefreshing]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center transition-opacity duration-200 z-10",
          pullDistance > 0 || isRefreshing ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          height: isRefreshing ? 60 : pullDistance,
          top: 0,
        }}
      >
        <div className={cn(
          "flex items-center justify-center rounded-full p-2",
          pullDistance > threshold ? "bg-primary/20" : "bg-muted"
        )}>
          <RefreshCw
            className={cn(
              "h-5 w-5 transition-all duration-200",
              isRefreshing && "animate-spin",
              pullDistance > threshold ? "text-primary" : "text-muted-foreground"
            )}
            style={{
              transform: isRefreshing ? undefined : `rotate(${pullDistance * 3}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
          transition: pullDistance === 0 && !isRefreshing ? 'transform 0.2s ease-out' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};

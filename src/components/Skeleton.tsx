import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => {
  return (
    <div 
      className={cn(
        "animate-pulse bg-white/5 rounded-2xl overflow-hidden relative",
        className
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
};

export const CardSkeleton = () => (
  <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
    <Skeleton className="aspect-video w-full rounded-none" />
    <div className="p-8 space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="pt-4 flex gap-4">
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
    </div>
  </div>
);

export const AdminRowSkeleton = () => (
  <div className="flex items-center gap-4 p-4 border-b border-white/5">
    <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/4" />
    </div>
    <Skeleton className="w-24 h-8 rounded-full shrink-0" />
    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
  </div>
);

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyReadiness, SellerReadiness } from '../../lib/profile';
import { Button } from '../ui/Button';

export const SellerReadinessWidget = () => {
  const [readiness, setReadiness] = useState<SellerReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await getMyReadiness();
        if (res.success) {
          setReadiness(res.data);
        } else {
          setError(res.error.message);
        }
      } catch {
        setError('Không thể tải trạng thái gian hàng.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="animate-pulse border border-neutral-200 bg-white p-6"><div className="h-4 w-32 bg-neutral-200 mb-4" /></div>;
  }

  if (error || !readiness) {
    return null; // Fail silently for this progressive enhancement widget
  }

  if (readiness.completionPercentage === 100) {
    return null; // Everything is done, widget disappears.
  }

  const nextStep = readiness.steps.find((s) => !s.completed);

  return (
    <div className="border border-neutral-200 bg-white p-6 mb-8" data-testid="readiness-widget">
      <h2 className="font-display text-lg font-black uppercase tracking-tight text-neutral-900 mb-4">
        Hoàn thiện gian hàng của bạn
      </h2>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-2 bg-neutral-100 overflow-hidden">
          <div 
            className="h-full bg-neutral-900 transition-all duration-500 ease-out" 
            style={{ width: `${readiness.completionPercentage}%` }}
            role="progressbar"
            aria-valuenow={readiness.completionPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="font-mono text-xs text-neutral-500 min-w-max">
          {readiness.completionPercentage}% ({readiness.completedCount}/{readiness.totalSupportedSteps})
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="flex flex-col gap-2">
          {readiness.steps.map((step) => (
            <div key={step.key} className="flex items-center gap-3">
              <span className={`flex shrink-0 items-center justify-center h-5 w-5 rounded-full border ${step.completed ? 'bg-neutral-900 border-neutral-900 text-white' : 'border-neutral-300'}`}>
                {step.completed && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={step.completed ? 'text-neutral-500 line-through' : 'text-neutral-900 font-medium'}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
        
        <div className="flex flex-col items-start md:items-end justify-center mt-4 md:mt-0">
          {nextStep && (
            <div className="flex flex-col md:items-end p-4 bg-neutral-50 border border-neutral-100 w-full">
              <span className="font-mono text-[10px] uppercase text-neutral-500 mb-2">Bước tiếp theo</span>
              <span className="font-medium mb-3">{nextStep.label}</span>
              {nextStep.actionHref && (
                <Link href={nextStep.actionHref}>
                  <Button size="sm" className="font-mono text-xs uppercase tracking-wider">{nextStep.actionLabel || 'Tiếp tục'}</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

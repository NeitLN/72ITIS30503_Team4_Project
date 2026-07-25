'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface ShareStorefrontButtonProps {
  storeUrl: string;
}

export const ShareStorefrontButton: React.FC<ShareStorefrontButtonProps> = ({ storeUrl }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback or silent fail
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="font-mono text-[10px] uppercase tracking-wider"
      title="Chia sẻ gian hàng"
    >
      {copied ? 'Đã sao chép liên kết' : 'Chia sẻ gian hàng'}
    </Button>
  );
};

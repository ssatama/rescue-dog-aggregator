'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface GuideOverlayProps {
  children: React.ReactNode;
}

export function GuideOverlay({ children }: GuideOverlayProps) {
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleClose = () => {
    router.back();
  };

  return (
    <Sheet open={true} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side="bottom"
        className="h-[100vh] md:h-[95vh] w-full max-w-full md:max-w-4xl mx-auto p-0 overflow-y-auto"
      >
        <VisuallyHidden asChild>
          <SheetTitle>Guide Content</SheetTitle>
        </VisuallyHidden>
        <VisuallyHidden asChild>
          <SheetDescription>Reading guide content in overlay mode</SheetDescription>
        </VisuallyHidden>
        <div className="relative h-full">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

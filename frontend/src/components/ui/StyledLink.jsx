import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const StyledLink = React.forwardRef(({
  variant = 'text',
  className,
  children,
  href,
  ...props
}, ref) => {
  const variantStyles = {
    text: 'text-orange-600 hover:text-orange-700 underline underline-offset-4 hover:underline-offset-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2',
    button: 'inline-flex items-center gap-1 px-4 py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2',
    nav: 'text-gray-700 hover:text-orange-600 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2'
  };

  const baseStyles = variantStyles[variant] || variantStyles.text;

  return (
    <Link
      ref={ref}
      href={href}
      className={cn(baseStyles, className)}
      {...props}
    >
      {children}
    </Link>
  );
});

StyledLink.displayName = 'StyledLink';

export default StyledLink;
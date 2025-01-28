'use client';

import * as React from 'react';
import * as ToolbarPrimitive from '@radix-ui/react-toolbar';
import { cn } from '@/lib/utils';

declare module '@radix-ui/react-toolbar';

const Toolbar = React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToolbarPrimitive.Root
    ref={ref}
    className={cn(
      'flex items-center gap-1 rounded-md border bg-background p-1',
      className
    )}
    {...props}
  />
));
Toolbar.displayName = ToolbarPrimitive.Root.displayName;

const ToolbarToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.ToggleGroup>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.ToggleGroup>
>(({ className, ...props }, ref) => (
  <ToolbarPrimitive.ToggleGroup
    ref={ref}
    className={cn('flex items-center gap-1', className)}
    {...props}
  />
));
ToolbarToggleGroup.displayName = ToolbarPrimitive.ToggleGroup.displayName;

const ToolbarToggleItem = React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.ToggleItem>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.ToggleItem>
>(({ className, ...props }, ref) => (
  <ToolbarPrimitive.ToggleItem
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
      className
    )}
    {...props}
  />
));
ToolbarToggleItem.displayName = ToolbarPrimitive.ToggleItem.displayName;

export { Toolbar, ToolbarToggleGroup, ToolbarToggleItem };
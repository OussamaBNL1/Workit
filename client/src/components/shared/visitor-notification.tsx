import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface VisitorNotificationProps {
  className?: string;
  message?: string;
  inline?: boolean;
  redirectTo?: string;
  // For dialog usage
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
}

/**
 * Component to display a notification for visitor users
 * when they try to access features that require authentication
 */
export function VisitorNotification({
  className,
  message = "This feature requires an account. Please sign in or register to continue.",
  inline = false,
  redirectTo = '/auth/login',
  open,
  onOpenChange,
  title = "Visitor Access",
  description = "You need to sign up or log in to access this feature."
}: VisitorNotificationProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleClick = () => {
    setLocation(redirectTo);
  };

  // For dialog version of the notification
  if (open !== undefined && onOpenChange !== undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleClick}>
              Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // For inline display in components
  if (inline) {
    return (
      <div 
        className={cn(
          "flex items-center p-4 gap-3 border rounded-lg bg-amber-50 border-amber-200",
          className
        )}
      >
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-amber-800">{message}</p>
        </div>
        <button 
          onClick={handleClick}
          className="text-sm font-medium text-amber-600 hover:text-amber-800"
        >
          Sign In
        </button>
      </div>
    );
  }

  // Function to show toast notification
  const showVisitorToast = () => {
    toast({
      title: "Visitor Access",
      description: message,
      variant: "destructive",
      action: (
        <button 
          onClick={handleClick}
          className="bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded text-amber-800"
        >
          Sign In
        </button>
      ),
    });
  };

  // Default return if no display mode specified
  return { showVisitorToast };
}

/**
 * Hook to use visitor notifications in functional components
 */
export function useVisitorNotification(options: VisitorNotificationProps = {}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const { 
    message = "This feature requires an account. Please sign in or register to continue.",
    redirectTo = '/auth/login'
  } = options;

  const showNotification = () => {
    toast({
      title: "Visitor Access",
      description: message,
      variant: "destructive",
      action: (
        <button 
          onClick={() => setLocation(redirectTo)}
          className="bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded text-amber-800"
        >
          Sign In
        </button>
      ),
    });
  };

  return { showNotification };
}

/**
 * Wrapper component for VisitorNotification that always returns a JSX element
 * This is needed for using the component in a dialog context
 */
export function VisitorNotificationDialog(props: VisitorNotificationProps) {
  return <VisitorNotification {...props} />;
}
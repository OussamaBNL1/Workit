import React from 'react';
import { useLocation } from 'wouter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Eye } from 'lucide-react';

interface VisitorNotificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

const VisitorNotification: React.FC<VisitorNotificationProps> = ({
  open,
  onOpenChange,
  title = 'Visitor Access Limitation',
  description = 'This feature is only available to registered users. Please sign up or log in to access this functionality.',
}) => {
  const [, setLocation] = useLocation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction onClick={() => setLocation('/auth/login')}>
            Sign In
          </AlertDialogAction>
          <AlertDialogAction onClick={() => setLocation('/auth/register')}>
            Sign Up
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default VisitorNotification;
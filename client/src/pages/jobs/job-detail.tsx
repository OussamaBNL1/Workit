import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisitorNotificationDialog } from '@/components/shared/visitor-notification';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { JobWithUser } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { FileUpload } from '@/components/ui/file-upload';
import { formatDistanceToNow } from 'date-fns';

// Define application form schema
const applicationSchema = z.object({
  description: z.string().min(20, 'Description must be at least 20 characters'),
  resumeFile: z.any().optional(),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

const JobDetail: React.FC = () => {
  const [, params] = useRoute<{ id: string }>('/jobs/:id');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isVisitor } = useAuth();
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [visitorNotifyOpen, setVisitorNotifyOpen] = useState(false);
  const [visitorNotifyMessage, setVisitorNotifyMessage] = useState({
    title: '',
    description: ''
  });

  // Don't attempt to convert MongoDB ObjectID to number
  const jobId = params?.id || '';

  // Fetch job details
  const {
    data: job,
    isLoading,
    error,
  } = useQuery<JobWithUser>({
    queryKey: [`/api/jobs/${jobId}`],
    enabled: !!jobId,
  });

  // Application form
  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      description: '',
    },
  });

  // Application mutation
  const applicationMutation = useMutation({
    mutationFn: async (data: ApplicationFormValues) => {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('description', data.description);
      
      if (data.resumeFile) {
        formData.append('resumeFile', data.resumeFile);
      }

      const response = await fetch(`/api/jobs/${jobId}/applications`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit application');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Application Submitted',
        description: 'Your application has been submitted successfully.',
      });
      setApplicationDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onApplicationSubmit = (data: ApplicationFormValues) => {
    applicationMutation.mutate(data);
  };

  // Handle apply button click
  const handleApply = () => {
    if (isVisitor) {
      setVisitorNotifyMessage({
        title: 'Job Applications Unavailable in Visitor Mode',
        description: 'You need to sign up or log in to apply for jobs on WorkiT.'
      });
      setVisitorNotifyOpen(true);
      return;
    }
    
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to apply for this job.',
        variant: 'destructive',
      });
      setLocation('/auth/login');
      return;
    }

    if (user?.id === job?.userId) {
      toast({
        title: 'Cannot Apply',
        description: 'You cannot apply to your own job posting.',
        variant: 'destructive',
      });
      return;
    }

    setApplicationDialogOpen(true);
  };

  // Handle view profile button click
  const handleViewProfile = () => {
    if (isVisitor) {
      // Visitors can view profiles, no restriction needed
      // In a real app, we'd have user-specific profiles
      setLocation(`/profile`);
      return;
    }
    
    // For now, redirect to the profile page as we don't have user-specific profile pages
    setLocation(`/profile`);
  };

  // Format the createdAt date to "X days/hours ago"
  const formatCreatedDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  // Generate job type badge color
  const getBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'full-time':
        return 'bg-green-100 text-green-800';
      case 'part-time':
        return 'bg-blue-100 text-blue-800';
      case 'contract':
        return 'bg-purple-100 text-purple-800';
      case 'freelance':
        return 'bg-yellow-100 text-yellow-800';
      case 'internship':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-center">Loading job details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-center text-red-500">Error loading job details. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Job Header */}
            <div className="p-6 border-b">
              <div className="flex items-center mb-4">
                <Avatar className="h-12 w-12 mr-4">
                  <AvatarImage src={job.user?.profilePicture} />
                  <AvatarFallback>
                    {job.user?.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-gray-500">{job.user?.username}</span>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="text-sm text-gray-500">{job.location || 'Remote'}</span>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="text-sm text-gray-500">Posted {formatCreatedDate(job.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline" className={`${getBadgeVariant(job.jobType)} font-medium`}>
                  {job.jobType}
                </Badge>
                <Badge variant="outline" className="bg-primary-100 text-primary-800">
                  {job.category}
                </Badge>
                <Badge variant="outline" className="bg-primary-100 text-primary-800">
                  ${job.budget}
                </Badge>
              </div>
            </div>

            {/* Job Image (if available) */}
            {job.image && (
              <div className="w-full h-80 bg-gray-200">
                <img
                  src={job.image}
                  alt={job.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Job Description */}
            <div className="p-6">
              <div className="prose max-w-none">
                <h2 className="text-xl font-semibold mb-2">Job Description</h2>
                <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
              </div>

              {/* Job Details */}
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Job Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-medium">{job.category}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{job.location || 'Remote'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Job Type</p>
                    <p className="font-medium">{job.jobType}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Budget</p>
                    <p className="font-medium">${job.budget}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          {/* Job Card */}
          <Card className="sticky top-8">
            <CardContent className="p-6">
              <div className="mb-6">
                <p className="text-3xl font-bold">${job.budget}</p>
              </div>

              <div className="space-y-4">
                <Button className="w-full" onClick={handleApply}>
                  Apply Now
                </Button>
              </div>

              {/* Employer Info */}
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-medium mb-4">About the Employer</h3>
                <div className="flex items-center mb-4">
                  <Avatar className="h-12 w-12 mr-4">
                    <AvatarImage src={job.user?.profilePicture} />
                    <AvatarFallback>
                      {job.user?.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{job.user?.username}</p>
                    <p className="text-sm text-gray-500">
                      {job.user?.role.charAt(0).toUpperCase() + job.user?.role.slice(1)}
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={handleViewProfile}>
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Application Dialog */}
      <Dialog open={applicationDialogOpen} onOpenChange={setApplicationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {job.title}</DialogTitle>
            <DialogDescription>
              Tell the employer why you're a good fit for this job.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onApplicationSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Letter</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your relevant experience and why you're interested in this job..."
                        {...field}
                        rows={6}
                      />
                    </FormControl>
                    <FormDescription>
                      Highlight your relevant skills and experience.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resumeFile"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Resume/CV</FormLabel>
                    <FormControl>
                      <FileUpload
                        id="resume-upload"
                        label=""
                        accept=".pdf,.doc,.docx"
                        value={value}
                        onChange={onChange}
                        {...fieldProps}
                      />
                    </FormControl>
                    <FormDescription>
                      Upload your resume or CV (PDF, DOC, or DOCX)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApplicationDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={applicationMutation.isPending}>
                  {applicationMutation.isPending ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Visitor Notification */}
      <VisitorNotificationDialog
        open={visitorNotifyOpen}
        onOpenChange={setVisitorNotifyOpen}
        title={visitorNotifyMessage.title}
        description={visitorNotifyMessage.description}
      />
    </div>
  );
};

export default JobDetail;

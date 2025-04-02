import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ServiceCard from '@/components/services/service-card';
import JobCard from '@/components/jobs/job-card';
import { User, ServiceWithUser, JobWithUser, Application, Order } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const userId = user?.id;

  // Redirect if not logged in
  if (!userId) {
    setLocation('/auth/login');
    return null;
  }

  // Fetch user services
  const {
    data: services,
    isLoading: loadingServices,
  } = useQuery<ServiceWithUser[]>({
    queryKey: [`/api/users/${userId}/services`],
    enabled: !!userId && user?.role === 'freelancer',
  });

  // Fetch user jobs
  const {
    data: jobs,
    isLoading: loadingJobs,
  } = useQuery<JobWithUser[]>({
    queryKey: [`/api/users/${userId}/jobs`],
    enabled: !!userId && user?.role === 'employer',
  });

  // Fetch user applications (for freelancer)
  const {
    data: applications,
    isLoading: loadingApplications,
  } = useQuery<Application[]>({
    queryKey: [`/api/users/${userId}/applications`],
    enabled: !!userId && user?.role === 'freelancer',
  });

  // Fetch job applications (for employer's jobs)
  const {
    data: jobApplications,
    isLoading: loadingJobApplications,
  } = useQuery<{ [key: number]: Application[] }>({
    queryKey: ['jobApplications'],
    enabled: !!userId && user?.role === 'employer' && !!jobs,
    queryFn: async () => {
      if (!jobs || jobs.length === 0) return {};
      
      const applicationsByJob: { [key: number]: Application[] } = {};
      
      for (const job of jobs) {
        try {
          const res = await fetch(`/api/jobs/${job.id}/applications`, {
            credentials: 'include',
          });
          
          if (res.ok) {
            const apps = await res.json();
            applicationsByJob[job.id] = apps;
          }
        } catch (error) {
          console.error(`Error fetching applications for job ${job.id}:`, error);
        }
      }
      
      return applicationsByJob;
    },
  });

  // Update application status mutation
  const updateApplicationMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PUT', `/api/applications/${id}/status`, { status });
    },
    onSuccess: () => {
      // Invalidate job applications
      if (jobs) {
        jobs.forEach(job => {
          queryClient.invalidateQueries({ queryKey: [`/api/jobs/${job.id}/applications`] });
        });
      }
      toast({
        title: 'Application Updated',
        description: 'The application status has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch user orders
  const {
    data: orders,
    isLoading: loadingOrders,
  } = useQuery<Order[]>({
    queryKey: [`/api/users/${userId}/orders`],
    enabled: !!userId,
  });

  // Helper to get initials from username
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  // Handle application status update
  const handleUpdateApplicationStatus = (id: number, status: 'approved' | 'rejected') => {
    updateApplicationMutation.mutate({ id, status });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Profile Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user?.profilePicture} />
            <AvatarFallback className="text-2xl">{user ? getInitials(user.username) : ''}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{user?.username}</h1>
            <p className="text-gray-500">{user?.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {user?.role}
              </Badge>
            </div>
            <p className="mt-4 text-gray-700 max-w-2xl">
              {user?.bio || 'No bio provided yet.'}
            </p>
          </div>
          <div className="ml-auto">
            <Button onClick={() => setLocation('/profile/edit')}>Edit Profile</Button>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue={user?.role === 'freelancer' ? 'services' : 'jobs'} className="mt-8">
        <TabsList className="mb-8 grid w-full md:w-auto grid-cols-2 md:grid-cols-4">
          {user?.role === 'freelancer' && (
            <TabsTrigger value="services">My Services</TabsTrigger>
          )}
          {user?.role === 'employer' && (
            <TabsTrigger value="jobs">My Jobs</TabsTrigger>
          )}
          {user?.role === 'freelancer' && (
            <TabsTrigger value="applications">My Applications</TabsTrigger>
          )}
          {user?.role === 'employer' && (
            <TabsTrigger value="job-applications">Job Applications</TabsTrigger>
          )}
          <TabsTrigger value="orders">My Orders</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* Services Tab (Freelancer) */}
        {user?.role === 'freelancer' && (
          <TabsContent value="services">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">My Services</h2>
              <Button onClick={() => setLocation('/services/create')}>
                Create New Service
              </Button>
            </div>

            {loadingServices ? (
              <p>Loading your services...</p>
            ) : services && services.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <ServiceCard key={service.id} service={{ ...service, user: user }} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="mb-4">You haven't created any services yet.</p>
                  <Button onClick={() => setLocation('/services/create')}>
                    Create Your First Service
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Jobs Tab (Employer) */}
        {user?.role === 'employer' && (
          <TabsContent value="jobs">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">My Jobs</h2>
              <Button onClick={() => setLocation('/jobs/create')}>
                Post New Job
              </Button>
            </div>

            {loadingJobs ? (
              <p>Loading your jobs...</p>
            ) : jobs && jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={{ ...job, user: user }} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="mb-4">You haven't posted any jobs yet.</p>
                  <Button onClick={() => setLocation('/jobs/create')}>
                    Post Your First Job
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Applications Tab (Freelancer) */}
        {user?.role === 'freelancer' && (
          <TabsContent value="applications">
            <h2 className="text-xl font-semibold mb-6">My Job Applications</h2>

            {loadingApplications ? (
              <p>Loading your applications...</p>
            ) : applications && applications.length > 0 ? (
              <div className="space-y-4">
                {applications.map((application) => (
                  <Card key={application.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between">
                        <div>
                          <h3 className="text-lg font-medium">
                            {application.job?.title || 'Job Title'}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Applied on {new Date(application.createdAt).toLocaleDateString()}
                          </p>
                          <div className="mt-4">
                            <p className="text-gray-700">{application.description}</p>
                          </div>
                          {application.resumeFile && (
                            <p className="mt-2 text-sm text-gray-500">
                              Resume uploaded: {application.resumeFile}
                            </p>
                          )}
                        </div>
                        <div className="mt-4 md:mt-0">
                          <Badge
                            variant={
                              application.status === 'approved'
                                ? 'default'
                                : application.status === 'rejected'
                                ? 'destructive'
                                : 'outline'
                            }
                          >
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="mb-4">You haven't applied to any jobs yet.</p>
                  <Button onClick={() => setLocation('/jobs')}>
                    Browse Jobs
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Job Applications Tab (Employer) */}
        {user?.role === 'employer' && (
          <TabsContent value="job-applications">
            <h2 className="text-xl font-semibold mb-6">Applications to My Jobs</h2>

            {loadingJobApplications || loadingJobs ? (
              <p>Loading job applications...</p>
            ) : jobs && jobs.length > 0 && jobApplications ? (
              <div className="space-y-8">
                {jobs.map((job) => {
                  const apps = jobApplications[job.id] || [];
                  return (
                    <div key={job.id} className="mb-8">
                      <h3 className="text-lg font-medium mb-4">{job.title}</h3>
                      
                      {apps.length > 0 ? (
                        <div className="space-y-4">
                          {apps.map((application) => (
                            <Card key={application.id}>
                              <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center">
                                      <Avatar className="h-10 w-10 mr-3">
                                        <AvatarImage src={application.user?.profilePicture} />
                                        <AvatarFallback>
                                          {application.user?.username.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <h4 className="font-medium">{application.user?.username}</h4>
                                        <p className="text-sm text-gray-500">
                                          Applied {new Date(application.createdAt).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="mt-4">
                                      <p className="text-gray-700">{application.description}</p>
                                    </div>
                                    {application.resumeFile && (
                                      <div className="mt-2">
                                        <a 
                                          href={application.resumeFile} 
                                          target="_blank" 
                                          rel="noreferrer"
                                          className="text-primary hover:underline text-sm"
                                        >
                                          View Resume
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-4 md:mt-0 md:ml-4 flex flex-col items-end">
                                    <Badge
                                      variant={
                                        application.status === 'approved'
                                          ? 'default'
                                          : application.status === 'rejected'
                                          ? 'destructive'
                                          : 'outline'
                                      }
                                      className="mb-4"
                                    >
                                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                                    </Badge>
                                    
                                    {application.status === 'pending' && (
                                      <div className="flex space-x-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateApplicationStatus(application.id, 'approved')}
                                          disabled={updateApplicationMutation.isPending}
                                        >
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleUpdateApplicationStatus(application.id, 'rejected')}
                                          disabled={updateApplicationMutation.isPending}
                                        >
                                          Dismiss
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-6 text-center">
                            <p>No applications received for this job yet.</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="mb-4">You haven't posted any jobs yet.</p>
                  <Button onClick={() => setLocation('/jobs/create')}>
                    Post Your First Job
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Orders Tab */}
        <TabsContent value="orders">
          <h2 className="text-xl font-semibold mb-6">My Orders</h2>

          {loadingOrders ? (
            <p>Loading your orders...</p>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between">
                      <div>
                        <h3 className="text-lg font-medium">
                          {order.service?.title || 'Service Title'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Ordered on {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        <div className="mt-2">
                          <p className="font-medium">Amount: ${order.totalPrice}</p>
                          <p className="text-sm text-gray-500">
                            Payment Method: {order.paymentMethod === 'card' ? 'Card Payment' : 'Bank Transfer'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 md:mt-0">
                        <Badge
                          variant={
                            order.status === 'completed'
                              ? 'default'
                              : order.status === 'cancelled'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="mb-4">You haven't placed any orders yet.</p>
                <Button onClick={() => setLocation('/services')}>
                  Browse Services
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4">Account Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="font-medium">{user?.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Account Type</p>
                    <p className="font-medium capitalize">{user?.role}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Member Since</p>
                    <p className="font-medium">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Button onClick={() => setLocation('/profile/edit')} className="w-full">
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4">Stats</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {user?.role === 'freelancer' ? (
                    <>
                      <div className="bg-primary-50 p-4 rounded-md">
                        <p className="text-primary font-semibold text-2xl">
                          {services?.length || 0}
                        </p>
                        <p className="text-sm text-gray-500">Active Services</p>
                      </div>
                      <div className="bg-primary-50 p-4 rounded-md">
                        <p className="text-primary font-semibold text-2xl">
                          {applications?.length || 0}
                        </p>
                        <p className="text-sm text-gray-500">Job Applications</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-primary-50 p-4 rounded-md">
                        <p className="text-primary font-semibold text-2xl">
                          {jobs?.length || 0}
                        </p>
                        <p className="text-sm text-gray-500">Active Jobs</p>
                      </div>
                      <div className="bg-primary-50 p-4 rounded-md">
                        <p className="text-primary font-semibold text-2xl">
                          {Object.values(jobApplications || {}).flat().length || 0}
                        </p>
                        <p className="text-sm text-gray-500">Applications Received</p>
                      </div>
                    </>
                  )}
                  <div className="bg-primary-50 p-4 rounded-md">
                    <p className="text-primary font-semibold text-2xl">
                      {orders?.filter(o => o.buyerId === userId).length || 0}
                    </p>
                    <p className="text-sm text-gray-500">Orders Made</p>
                  </div>
                  <div className="bg-primary-50 p-4 rounded-md">
                    <p className="text-primary font-semibold text-2xl">
                      {orders?.filter(o => o.sellerId === userId).length || 0}
                    </p>
                    <p className="text-sm text-gray-500">Orders Received</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;

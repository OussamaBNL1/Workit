import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import { ServiceWithUser, paymentMethods } from '@/lib/types';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Define payment form schema
const paymentSchema = z.object({
  paymentMethod: z.enum(['card', 'bank_transfer'], {
    required_error: 'Please select a payment method',
  }),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const Payment: React.FC = () => {
  const [, params] = useRoute<{ serviceId: string }>('/payment/:serviceId');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const serviceId = params?.serviceId ? parseInt(params.serviceId) : 0;

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to complete your order.',
        variant: 'destructive',
      });
      setLocation('/auth/login');
    }
  }, [isAuthenticated, toast, setLocation]);

  // Fetch service details
  const {
    data: service,
    isLoading,
    error,
  } = useQuery<ServiceWithUser>({
    queryKey: [`/api/services/${serviceId}`],
    enabled: !!serviceId,
  });

  // Initialize form
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: 'card',
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (data: PaymentFormValues) => {
      return apiRequest('POST', `/api/services/${serviceId}/orders`, data);
    },
    onSuccess: () => {
      setIsProcessing(false);
      toast({
        title: 'Order Placed Successfully',
        description: 'Your order has been placed. Thank you for your purchase!',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/orders`] });
      // Redirect to orders page after successful payment
      setTimeout(() => {
        setLocation('/profile');
      }, 2000);
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: PaymentFormValues) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to complete your order.',
        variant: 'destructive',
      });
      return;
    }

    if (user.id === service?.userId) {
      toast({
        title: 'Cannot Order Own Service',
        description: 'You cannot order your own service.',
        variant: 'destructive',
      });
      return;
    }

    // Show processing state
    setIsProcessing(true);

    // Simulate payment processing delay
    setTimeout(() => {
      createOrderMutation.mutate(data);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-center">Loading payment details...</p>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-center text-red-500">Error loading service details. Please try again later.</p>
        <div className="mt-4 text-center">
          <Button onClick={() => setLocation('/services')}>Back to Services</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Complete Your Order</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Order Summary */}
        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 mr-4 overflow-hidden rounded">
                  <img
                    src={service.image || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643'}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium">{service.title}</h3>
                  <div className="flex items-center mt-1">
                    <Avatar className="h-5 w-5 mr-1">
                      <AvatarImage src={service.user?.profilePicture} />
                      <AvatarFallback>
                        {service.user?.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-500">{service.user?.username}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service Price</span>
                  <span>${service.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Service Fee</span>
                  <span>${(service.price * 0.1).toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${(service.price * 1.1).toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 text-sm text-gray-500">
                <p>
                  By completing this order, you agree to WorkiT's Terms of Service and Privacy Policy.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Form */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>
                Choose your preferred payment method to complete your order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Payment Method</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            {paymentMethods.map((method) => (
                              <FormItem
                                key={method.value}
                                className="flex items-center space-x-3 space-y-0 border rounded-md p-4"
                              >
                                <FormControl>
                                  <RadioGroupItem value={method.value} />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {method.label}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('paymentMethod') === 'card' && (
                    <div className="space-y-4">
                      <div>
                        <FormLabel>Card Number</FormLabel>
                        <Input placeholder="1234 5678 9012 3456" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FormLabel>Expiry Date</FormLabel>
                          <Input placeholder="MM/YY" />
                        </div>
                        <div>
                          <FormLabel>CVC</FormLabel>
                          <Input placeholder="123" />
                        </div>
                      </div>
                    </div>
                  )}

                  {form.watch('paymentMethod') === 'bank_transfer' && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-md">
                      <p className="font-medium">Bank Transfer Details:</p>
                      <p>Account Name: WorkiT Services</p>
                      <p>Account Number: 1234567890</p>
                      <p>Bank Name: Digital Banking Corp</p>
                      <p>Reference: Your order will be processed after payment confirmation.</p>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation(`/services/${serviceId}`)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isProcessing || createOrderMutation.isPending}
                    >
                      {isProcessing ? 'Processing...' : 'Complete Payment'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Payment;

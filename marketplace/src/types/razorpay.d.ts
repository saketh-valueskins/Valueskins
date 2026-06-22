// Shared Razorpay checkout types for the payment flow
interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name?: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  notes?: Record<string, any>;
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on?: (event: string, callback: (response: any) => void) => void;
}

interface RazorpayConstructor {
  new (options: RazorpayCheckoutOptions): RazorpayInstance;
}

interface Window {
  Razorpay: RazorpayConstructor;
}

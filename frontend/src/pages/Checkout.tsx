import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { createPaymentOrder, verifyPayment, type ShippingAddress } from "@/services/ordersService";
import { addAddress, updateAddress, getProfile } from "@/services/dashboardService";
import type { AddressRecord } from "@/types/backend";
import { getApiErrorMessage } from "@/lib/apiError";
import { formatCurrency } from "@/lib/formatCurrency";
import { CreditCard, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import "@/types/razorpay";
import type { RazorpayOptions, RazorpayResponse } from "@/types/razorpay";

interface FormState extends ShippingAddress {
  fullName: string;
  phoneNumber: string;
  email: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressType: "home" | "work" | "other";
}

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttarakhand', 'Uttar Pradesh', 'West Bengal', 'Delhi', 'Chandigarh',
  'Puducherry', 'Lakshadweep', 'Daman and Diu', 'Dadra and Nagar Haveli',
];

function normalizePhone10(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length <= 10) return d;
  return d.slice(-10);
}

function addressTypeToLabel(t: FormState["addressType"]): string {
  if (t === "work") return "Work";
  if (t === "other") return "Other";
  return "Home";
}

function savedRecordToForm(addr: AddressRecord, profile: { name: string; email: string; phone: string }): FormState {
  const line1 = (addr.address1 || addr.address || "").trim();
  const at = addr.addressType;
  const addressType: FormState["addressType"] =
    at === "work" || at === "other" || at === "home" ? at : "home";
  return {
    fullName: (addr.fullName || profile.name || "").trim(),
    phoneNumber: normalizePhone10(addr.phoneNumber || profile.phone || ""),
    email: (addr.email || profile.email || "").trim(),
    address1: line1,
    address2: (addr.address2 || "").trim(),
    city: (addr.city || "").trim(),
    state: (addr.state || "").trim(),
    postalCode: (addr.postalCode || "").trim(),
    country: (addr.country || "India").trim(),
    addressType,
  };
}

function formToSavedPayload(form: FormState) {
  const combined = [form.address1, form.address2].filter(Boolean).join(", ");
  return {
    label: addressTypeToLabel(form.addressType),
    address: combined,
    address1: form.address1.trim(),
    address2: form.address2.trim() || undefined,
    city: form.city.trim(),
    state: form.state.trim(),
    postalCode: form.postalCode.trim(),
    country: form.country.trim() || "India",
    fullName: form.fullName.trim(),
    phoneNumber: form.phoneNumber.trim(),
    email: form.email.trim(),
    addressType: form.addressType,
    isDefault: true,
  };
}

const Checkout = () => {
  const navigate = useNavigate();
  const { items, loading: cartLoading, error: cartError } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<AddressRecord[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedSavedId, setSelectedSavedId] = useState<string | "new">("new");
  const [saveAddressForNextTime, setSaveAddressForNextTime] = useState(true);
  const [profileContact, setProfileContact] = useState({ name: "", email: "", phone: "" });

  const [shippingAddress, setShippingAddress] = useState<FormState>({
    fullName: '',
    phoneNumber: '',
    email: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    addressType: 'home',
  });

  useEffect(() => {
    if (window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => console.error("Failed to load Razorpay script");
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setAddressesLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const profile = await getProfile();
        if (cancelled) return;
        const list: AddressRecord[] = Array.isArray(profile.addresses) ? profile.addresses : [];
        setSavedAddresses(list);
        const pc = {
          name: (profile.name || "").trim(),
          email: (profile.email || "").trim(),
          phone: normalizePhone10(profile.phone || ""),
        };
        setProfileContact(pc);

        const preferred = list.find((a) => a.isDefault) || list[0];
        if (preferred?._id) {
          setSelectedSavedId(String(preferred._id));
          setShippingAddress(savedRecordToForm(preferred, pc));
        } else {
          setSelectedSavedId("new");
          setShippingAddress((prev) => ({
            ...prev,
            fullName: pc.name || prev.fullName,
            email: pc.email || prev.email,
            phoneNumber: pc.phone || prev.phoneNumber,
            country: "India",
          }));
        }
      } catch {
        if (!cancelled) toast.error("Could not load your saved addresses");
      } finally {
        if (!cancelled) setAddressesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!shippingAddress.fullName?.trim()) errors.fullName = 'Full name is required';
    if (!shippingAddress.phoneNumber?.trim()) errors.phoneNumber = 'Phone number is required';
    if (!/^[0-9]{10}$/.test(shippingAddress.phoneNumber?.trim() || '')) {
      errors.phoneNumber = 'Phone number must be 10 digits';
    }
    if (!shippingAddress.email?.trim()) errors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingAddress.email?.trim() || '')) {
      errors.email = 'Invalid email format';
    }
    if (!shippingAddress.address1?.trim()) errors.address1 = 'Address line 1 is required';
    if (!shippingAddress.city?.trim()) errors.city = 'City is required';
    if (!shippingAddress.state?.trim()) errors.state = 'State is required';
    if (!shippingAddress.postalCode?.trim()) errors.postalCode = 'Postal code is required';
    if (!/^[0-9]{6}$/.test(shippingAddress.postalCode?.trim() || '')) {
      errors.postalCode = 'Postal code must be 6 digits';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canSubmit = useMemo(
    () => items.length > 0 && !isSubmitting && !addressesLoading,
    [items.length, isSubmitting, addressesLoading]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (!validateForm()) {
      setErrorMsg('Please fill all required fields correctly');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (!razorpayLoaded) {
        throw new Error("Razorpay is not loaded yet. Please try again.");
      }

      if (saveAddressForNextTime) {
        try {
          const payload = formToSavedPayload(shippingAddress);
          let updatedList: AddressRecord[] | null = null;
          /** After save, which saved id the form corresponds to (for UI state). */
          let resolvedSavedId: string | null = null;

          if (selectedSavedId !== "new") {
            const updated = await updateAddress(selectedSavedId, payload);
            updatedList = Array.isArray(updated) ? updated : null;
            resolvedSavedId = selectedSavedId;
          } else {
            const lineMatch = (a: AddressRecord) =>
              (a.address1?.trim() || a.address?.trim()) === payload.address1;
            const dup = savedAddresses.find(
              (a) =>
                a.postalCode?.trim() === payload.postalCode &&
                a.city?.trim().toLowerCase() === payload.city.toLowerCase() &&
                lineMatch(a)
            );
            if (dup?._id) {
              const updated = await updateAddress(String(dup._id), payload);
              updatedList = Array.isArray(updated) ? updated : null;
              resolvedSavedId = String(dup._id);
            } else {
              const updated = await addAddress(payload);
              updatedList = Array.isArray(updated) ? updated : null;
            }
          }

          if (updatedList && updatedList.length > 0) {
            setSavedAddresses(updatedList);
            if (resolvedSavedId) {
              setSelectedSavedId(resolvedSavedId);
            } else {
              const def =
                updatedList.find((a) => a.isDefault) || updatedList[updatedList.length - 1];
              if (def?._id) setSelectedSavedId(String(def._id));
            }
          }
        } catch (saveErr: unknown) {
          const msg = getApiErrorMessage(saveErr, "Could not save your address");
          toast.error(msg);
          setIsSubmitting(false);
          return;
        }
      }

      const orderData = await createPaymentOrder({ shippingAddress });

      const options: RazorpayOptions = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "Vanca Patina",
        description: "Purchase from Vanca Patina",
        handler: async (response: RazorpayResponse) => {
          try {
            setIsVerifyingPayment(true);
            toast.info("Processing payment...");

            await verifyPayment({
              appOrderId: orderData.appOrderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success("Payment successful! Order created successfully.");
            window.location.href = "/my-orders";
          } catch (verifyError: unknown) {
            const errorMessage = getApiErrorMessage(verifyError, "Payment verification failed");
            setErrorMsg(errorMessage);
            toast.error(errorMessage);
            setIsSubmitting(false);
          } finally {
            setIsVerifyingPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            // User closed the payment modal without completing payment
            setIsSubmitting(false);
            toast.error("Payment was cancelled");
          },
        },
        prefill: {
          email: shippingAddress.email || "",
          contact: shippingAddress.phoneNumber || "",
        },
        theme: {
          color: "#8B4513",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: unknown) {
      setErrorMsg(getApiErrorMessage(error, "Checkout failed"));
      setIsSubmitting(false);
    }
  };

  if (!localStorage.getItem("token")) {
    return (
      <div className="min-h-screen pt-32 text-center">
        <p className="text-muted-foreground">Please log in to checkout.</p>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 px-6 py-3 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = Number((subtotal * 0.05).toFixed(2));
  const shipping = subtotal > 0 && subtotal <= 2000 ? 75 : 0;
  const grandTotal = subtotal + tax + shipping;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 lg:px-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">Checkout</h1>

        {cartLoading && <div className="text-muted-foreground">Loading cart...</div>}
        {cartError && <div className="text-destructive mb-4">{cartError}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass-card p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Delivery Address Section */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Delivery Address</h2>
                  <p className="text-xs text-muted-foreground mb-4">* All fields are required</p>
                </div>

                {addressesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading your saved addresses…
                  </div>
                ) : savedAddresses.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground block">Use a saved address</label>
                    <select
                      value={selectedSavedId}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "new") {
                          setSelectedSavedId("new");
                          setShippingAddress({
                            fullName: profileContact.name,
                            email: profileContact.email,
                            phoneNumber: profileContact.phone,
                            address1: "",
                            address2: "",
                            city: "",
                            state: "",
                            postalCode: "",
                            country: "India",
                            addressType: "home",
                          });
                          setFormErrors({});
                          return;
                        }
                        const rec = savedAddresses.find((a) => String(a._id) === v);
                        if (rec) {
                          setSelectedSavedId(String(rec._id));
                          setShippingAddress(savedRecordToForm(rec, profileContact));
                          setFormErrors({});
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm"
                    >
                      <option value="new">Enter a new address</option>
                      {savedAddresses.map((a) => (
                        <option key={a._id} value={String(a._id)}>
                          {a.label} — {a.city}
                          {a.state ? `, ${a.state}` : ""}
                          {a.isDefault ? " (default)" : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      You can edit the fields below after choosing an address.
                    </p>
                  </div>
                ) : null}

                <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border/60 bg-secondary/30 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={saveAddressForNextTime}
                    onChange={(e) => setSaveAddressForNextTime(e.target.checked)}
                    className="mt-0.5 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    <span className="font-medium">Save this address for next time</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Stored securely on your account and prefilled on future checkouts. You can manage addresses from your dashboard.
                    </span>
                  </span>
                </label>

                {/* Full Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Full Name *</label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={shippingAddress.fullName}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-lg bg-secondary border text-foreground transition-colors ${
                        formErrors.fullName ? 'border-destructive' : 'border-border'
                      }`}
                    />
                    {formErrors.fullName && <p className="text-xs text-destructive mt-1">{formErrors.fullName}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Phone (10 digits) *</label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={shippingAddress.phoneNumber}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, phoneNumber: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-lg bg-secondary border text-foreground transition-colors ${
                        formErrors.phoneNumber ? 'border-destructive' : 'border-border'
                      }`}
                    />
                    {formErrors.phoneNumber && <p className="text-xs text-destructive mt-1">{formErrors.phoneNumber}</p>}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">Email Address *</label>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={shippingAddress.email}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-lg bg-secondary border text-foreground transition-colors ${
                      formErrors.email ? 'border-destructive' : 'border-border'
                    }`}
                  />
                  {formErrors.email && <p className="text-xs text-destructive mt-1">{formErrors.email}</p>}
                </div>

                {/* Address Lines */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">Address Line 1 *</label>
                  <input
                    type="text"
                    placeholder="House No., Building name"
                    value={shippingAddress.address1}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, address1: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-lg bg-secondary border text-foreground transition-colors ${
                      formErrors.address1 ? 'border-destructive' : 'border-border'
                    }`}
                  />
                  {formErrors.address1 && <p className="text-xs text-destructive mt-1">{formErrors.address1}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    placeholder="Road name, Area, Colony (optional)"
                    value={shippingAddress.address2}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, address2: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground transition-colors"
                  />
                </div>

                {/* City, State, Postal Code */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">City *</label>
                    <input
                      type="text"
                      placeholder="City"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-lg bg-secondary border text-foreground transition-colors ${
                        formErrors.city ? 'border-destructive' : 'border-border'
                      }`}
                    />
                    {formErrors.city && <p className="text-xs text-destructive mt-1">{formErrors.city}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">State *</label>
                    <select
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-lg bg-secondary border text-foreground transition-colors ${
                        formErrors.state ? 'border-destructive' : 'border-border'
                      }`}
                    >
                      <option value="">Select State</option>
                      {STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    {formErrors.state && <p className="text-xs text-destructive mt-1">{formErrors.state}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Postal Code (6 digits) *</label>
                    <input
                      type="text"
                      placeholder="Postal code"
                      value={shippingAddress.postalCode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-lg bg-secondary border text-foreground transition-colors ${
                        formErrors.postalCode ? 'border-destructive' : 'border-border'
                      }`}
                    />
                    {formErrors.postalCode && <p className="text-xs text-destructive mt-1">{formErrors.postalCode}</p>}
                  </div>
                </div>

                {/* Address Type */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">Address Type</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['home', 'work', 'other'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setShippingAddress({ ...shippingAddress, addressType: type })}
                        className={`px-3 py-1.5 rounded text-sm capitalize border transition-colors ${
                          shippingAddress.addressType === type
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/60'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="border-t border-border pt-6 space-y-4">
                <h2 className="text-lg font-semibold text-foreground mb-4">Payment Method</h2>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <CreditCard className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Razorpay Secure Payment</p>
                    <p className="text-xs text-muted-foreground">Safe & secure online payment</p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{errorMsg}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting || isVerifyingPayment || addressesLoading}
                className="w-full mt-6 px-6 py-4 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isVerifyingPayment ? 'Processing order...' : isSubmitting ? 'Processing...' : `Proceed to Payment - ${formatCurrency(grandTotal)}`}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="glass-card p-6 h-fit sticky top-24">
            <h3 className="text-lg font-semibold text-foreground mb-4">Order Summary</h3>

            {items.length === 0 ? (
              <p className="text-muted-foreground">Your cart is empty.</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-start gap-3 pb-3 border-b border-border/50">
                      {item.product.image && (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(item.product.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (5%)</span>
                    <span className="font-medium text-foreground">{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-foreground">
                      {shipping === 0 ? (
                        <span className="text-emerald-600">FREE</span>
                      ) : (
                        formatCurrency(shipping)
                      )}
                    </span>
                  </div>
                  {shipping === 0 && subtotal > 0 && (
                    <p className="text-xs text-emerald-600 pt-1">
                      ✓ Free shipping on orders above ₹2000
                    </p>
                  )}
                  <div className="border-t border-border pt-3 mt-3 flex justify-between text-base">
                    <span className="font-semibold text-foreground">Grand Total</span>
                    <span className="font-bold text-[#D4AF37]">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

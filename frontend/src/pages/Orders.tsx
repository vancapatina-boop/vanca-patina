import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, FileText } from "lucide-react";
import { downloadInvoice, getMyOrders } from "@/services/ordersService";

type OrderItem = {
  name: string;
  qty: number;
  price: number;
  image?: string;
};

type Order = {
  _id: string;
  orderId?: string;
  orderItems: OrderItem[];
  totalPrice: number;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentMethod: "COD" | "Razorpay" | "PayPal";
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
  isPaid: boolean;
  createdAt: string;
  invoice?: {
    invoiceNumber?: string;
    invoiceUrl?: string;
  };
};

const Orders = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);

    getMyOrders()
      .then((data) => {
        if (cancelled) return;
        setOrders(Array.isArray(data) ? data : []);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const message =
          typeof e === "object" && e && "response" in e
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (e as any)?.response?.data?.message ?? (e as any)?.message
            : "Failed to load orders";
        setErrorMsg(message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleInvoiceDownload = async (orderId: string) => {
    try {
      setInvoiceLoadingId(orderId);
      const blob = await downloadInvoice(orderId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice_${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const message =
        typeof e === "object" && e && "response" in e
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (e as any)?.response?.data?.message ?? "Invoice is not available yet"
          : "Invoice is not available yet";
      setErrorMsg(message);
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen pt-32 text-center text-muted-foreground">Loading your orders...</div>;
  }

  if (errorMsg) {
    return <div className="min-h-screen pt-32 text-center text-destructive">{errorMsg}</div>;
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 lg:px-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <p>No orders yet.</p>
            <Link to="/shop" className="inline-block mt-4 text-primary font-semibold hover:underline">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const invoiceAvailable = Boolean(order.invoice?.invoiceUrl) || order.paymentStatus === "paid" || order.status === "delivered";

              return (
                <div key={order._id} className="glass-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Order: {order.orderId || order._id}</p>
                      <p className="text-sm text-muted-foreground">Placed: {new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">Total: Rs. {order.totalPrice.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.status} | {order.paymentMethod} | {order.paymentStatus || (order.isPaid ? "paid" : "pending")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {order.orderItems.map((it, idx) => (
                      <div key={`${order._id}-${idx}`} className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{it.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {it.qty}</p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">Rs. {(it.price * it.qty).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{order.invoice?.invoiceNumber || "Invoice will be generated automatically once eligible"}</span>
                    </div>
                    <button
                      type="button"
                      disabled={!invoiceAvailable || invoiceLoadingId === order._id}
                      onClick={() => handleInvoiceDownload(order._id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      {invoiceLoadingId === order._id ? "Preparing..." : "Download Invoice"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;

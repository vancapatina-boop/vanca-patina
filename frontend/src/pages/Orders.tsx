import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyOrders } from "@/services/ordersService";

type OrderItem = {
  name: string;
  qty: number;
  price: number;
  image?: string;
};

type Order = {
  _id: string;
  orderItems: OrderItem[];
  totalPrice: number;
  status: "processing" | "shipped" | "delivered";
  isPaid: boolean;
  createdAt: string;
};

const Orders = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

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
      .catch((e: any) => {
        if (cancelled) return;
        setErrorMsg(e?.response?.data?.message ?? e?.message ?? "Failed to load orders");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 text-center text-muted-foreground">
        Loading your orders...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen pt-32 text-center text-destructive">
        {errorMsg}
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 lg:px-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">
          My Orders
        </h1>

        {orders.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <p>No orders yet.</p>
            <Link
              to="/shop"
              className="inline-block mt-4 text-primary font-semibold hover:underline"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order._id} className="glass-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Order: {order._id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Placed: {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      Total: ₹{order.totalPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status: {order.status} {order.isPaid ? "(Paid)" : "(Unpaid)"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {order.orderItems.map((it, idx) => (
                    <div
                      key={`${order._id}-${idx}`}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {it.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {it.qty}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        ₹{(it.price * it.qty).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;


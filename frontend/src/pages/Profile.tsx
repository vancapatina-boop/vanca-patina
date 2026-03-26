import { useEffect, useState } from "react";
import api from "@/services/api";

type Profile = {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
};

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);

    api
      .get("/api/users/profile")
      .then((res) => {
        if (cancelled) return;
        setProfile(res.data);
        setForm({
          name: res.data.name ?? "",
          email: res.data.email ?? "",
          password: "",
        });
      })
      .catch((e: any) => {
        if (cancelled) return;
        setErrorMsg(e?.response?.data?.message ?? e?.message ?? "Failed to load profile");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await api.put("/api/users/profile", form);
      setProfile(res.data);
      // Keep password field empty after save.
      setForm((f) => ({ ...f, password: "" }));
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? e?.message ?? "Failed to update profile");
    }
  };

  if (loading) {
    return <div className="min-h-screen pt-32 text-center text-muted-foreground">Loading profile...</div>;
  }

  if (errorMsg) {
    return <div className="min-h-screen pt-32 text-center text-destructive">{errorMsg}</div>;
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 lg:px-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">My Profile</h1>

        <form onSubmit={handleSubmit} className="glass-card p-6 max-w-xl">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <input
                className="mt-2 w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <input
                className="mt-2 w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">New Password</label>
              <input
                type="password"
                className="mt-2 w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>

            <button
              type="submit"
              className="w-full px-6 py-4 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;


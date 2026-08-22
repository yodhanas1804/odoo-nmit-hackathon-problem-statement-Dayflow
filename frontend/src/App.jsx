import { useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, LogOut } from "lucide-react";
import { getAdminUser, getCurrentUser, getHealth, login, signup } from "./api";

const emptyForm = {
  employee_id: "",
  name: "",
  email: "",
  password: "",
  role: "EMPLOYEE",
};

function App() {
  const [health, setHealth] = useState(null);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(emptyForm);
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem("dayflowAuth");
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((err) => setNotice(err.message || "Unable to reach backend"));
  }, []);

  const isHealthy = health?.status === "ok";
  const isAdmin = auth?.user?.role === "ADMIN";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const action = mode === "login" ? login : signup;
    const payload =
      mode === "login" ? { email: form.email, password: form.password } : form;

    try {
      const nextAuth = await action(payload);
      localStorage.setItem("dayflowAuth", JSON.stringify(nextAuth));
      setAuth(nextAuth);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message);
    }
  }

  async function checkProtectedRoute(type) {
    setError("");
    setNotice("");
    try {
      const user = type === "admin" ? await getAdminUser(auth.access_token) : await getCurrentUser(auth.access_token);
      setNotice(`${type === "admin" ? "Admin" : "Employee"} route allowed for ${user.name}`);
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    localStorage.removeItem("dayflowAuth");
    setAuth(null);
    setNotice("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Dayflow HRMS</h1>
            <p className="mt-1 text-sm text-slate-600">Human resource operations workspace</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white">
            <Activity size={20} aria-hidden="true" />
          </div>
        </header>

        <div className="grid flex-1 place-items-center py-10">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start gap-3">
              {isHealthy ? <CheckCircle2 className="mt-1 text-emerald-600" size={22} /> : <AlertCircle className="mt-1 text-amber-600" size={22} />}
              <div>
                <h2 className="text-lg font-semibold tracking-normal">{auth ? "Dashboard Access" : "Authentication"}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{isHealthy ? `Backend connected: ${health.service}` : notice || "Checking backend connection..."}</p>
              </div>
            </div>

            {auth ? (
              <div className="space-y-5">
                <div className="rounded-md border border-slate-200 p-4">
                  <p className="text-sm font-medium">{auth.user.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{auth.user.email} · {auth.user.role}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" onClick={() => checkProtectedRoute("employee")}>Employee Route</button>
                  <button className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white" onClick={() => checkProtectedRoute("admin")}>Admin Route</button>
                  <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium" onClick={logout}><LogOut size={16} /> Logout</button>
                </div>
                <p className="text-sm text-slate-600">{isAdmin ? "Admin dashboard placeholder" : "Employee dashboard placeholder"}</p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="inline-flex rounded-md border border-slate-300 p-1">
                  <button type="button" className={`rounded px-3 py-1.5 text-sm ${mode === "login" ? "bg-slate-950 text-white" : ""}`} onClick={() => setMode("login")}>Login</button>
                  <button type="button" className={`rounded px-3 py-1.5 text-sm ${mode === "signup" ? "bg-slate-950 text-white" : ""}`} onClick={() => setMode("signup")}>Signup</button>
                </div>
                {mode === "signup" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Employee ID" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                )}
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" type="submit">{mode === "login" ? "Login" : "Create Account"}</button>
              </form>
            )}
            {(error || notice) && <p className={`mt-4 text-sm ${error ? "text-red-600" : "text-slate-600"}`}>{error || notice}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;

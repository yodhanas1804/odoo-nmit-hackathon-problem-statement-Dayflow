import { useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { getHealth } from "./api";

function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((err) => setError(err.message || "Unable to reach backend"));
  }, []);

  const isHealthy = health?.status === "ok";

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
          <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              {isHealthy ? (
                <CheckCircle2 className="mt-1 text-emerald-600" size={22} aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-1 text-amber-600" size={22} aria-hidden="true" />
              )}
              <div>
                <h2 className="text-lg font-semibold tracking-normal">Application Foundation</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isHealthy
                    ? `Backend connected: ${health.service} (${health.environment})`
                    : error || "Checking backend connection..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;

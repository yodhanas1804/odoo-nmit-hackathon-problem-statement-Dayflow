import { useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, Clock, LogOut, Save } from "lucide-react";
import {
  checkIn,
  checkOut,
  getAdminAttendance,
  getAdminProfiles,
  getHealth,
  getMyAttendance,
  getMyProfile,
  login,
  signup,
  updateAdminProfile,
  updateMyProfile,
} from "./api";

const emptyAuthForm = {
  employee_id: "",
  name: "",
  email: "",
  password: "",
  role: "EMPLOYEE",
};

const editableEmployeeFields = ["address", "phone", "profile_picture_url"];
const editableAdminFields = [
  "personal_details",
  "job_details",
  "salary_structure",
  "documents_metadata",
  "address",
  "phone",
  "profile_picture_url",
];

function compactProfile(profile) {
  return {
    personal_details: profile?.personal_details || "",
    job_details: profile?.job_details || "",
    salary_structure: profile?.salary_structure || "",
    documents_metadata: profile?.documents_metadata || "",
    address: profile?.address || "",
    phone: profile?.phone || "",
    profile_picture_url: profile?.profile_picture_url || "",
  };
}

function App() {
  const [health, setHealth] = useState(null);
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem("dayflowAuth");
    return saved ? JSON.parse(saved) : null;
  });
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(compactProfile());
  const [adminProfiles, setAdminProfiles] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [adminAttendance, setAdminAttendance] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [adminForm, setAdminForm] = useState(compactProfile());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isAdmin = auth?.user?.role === "ADMIN";

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((err) => setNotice(err.message || "Unable to reach backend"));
  }, []);

  useEffect(() => {
    if (!auth) return;
    loadProfile();
    loadAttendance();
    if (auth.user.role === "ADMIN") {
      loadAdminProfiles();
      loadAdminAttendance();
    }
  }, [auth]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const action = mode === "login" ? login : signup;
    const payload =
      mode === "login"
        ? { email: authForm.email, password: authForm.password }
        : authForm;

    try {
      const nextAuth = await action(payload);
      localStorage.setItem("dayflowAuth", JSON.stringify(nextAuth));
      setAuth(nextAuth);
      setAuthForm(emptyAuthForm);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadProfile() {
    const nextProfile = await getMyProfile(auth.access_token);
    setProfile(nextProfile);
    setProfileForm(compactProfile(nextProfile));
  }

  async function loadAdminProfiles() {
    const profiles = await getAdminProfiles(auth.access_token);
    setAdminProfiles(profiles);
    if (profiles.length && !selectedEmployeeId) {
      setSelectedEmployeeId(profiles[0].employee_id);
      setAdminForm(compactProfile(profiles[0]));
    }
  }

  async function loadAttendance() {
    const records = await getMyAttendance(auth.access_token);
    setAttendance(records);
  }

  async function loadAdminAttendance() {
    const records = await getAdminAttendance(auth.access_token);
    setAdminAttendance(records);
  }

  async function handleAttendanceAction(action) {
    setError("");
    setNotice("");
    try {
      const saved = await action(auth.access_token);
      setNotice(saved.check_out ? "Checked out for today" : "Checked in for today");
      await loadAttendance();
      if (isAdmin) await loadAdminAttendance();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveMyProfile(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const payload = Object.fromEntries(
        editableEmployeeFields.map((field) => [field, profileForm[field]]),
      );
      const saved = await updateMyProfile(auth.access_token, payload);
      setProfile(saved);
      setProfileForm(compactProfile(saved));
      setNotice("Profile updated");
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveAdminProfile(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const saved = await updateAdminProfile(auth.access_token, selectedEmployeeId, adminForm);
      setNotice(`Updated ${saved.name}`);
      await loadAdminProfiles();
    } catch (err) {
      setError(err.message);
    }
  }

  function selectAdminProfile(employeeId) {
    setSelectedEmployeeId(employeeId);
    const selected = adminProfiles.find((item) => item.employee_id === employeeId);
    setAdminForm(compactProfile(selected));
  }

  function logout() {
    localStorage.removeItem("dayflowAuth");
    setAuth(null);
    setProfile(null);
    setAdminProfiles([]);
    setAttendance([]);
    setAdminAttendance([]);
    setNotice("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
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
          <div className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <StatusLine health={health} auth={auth} />
            {auth ? (
              <Dashboard
                auth={auth}
                profile={profile}
                profileForm={profileForm}
                setProfileForm={setProfileForm}
                saveMyProfile={saveMyProfile}
                attendance={attendance}
                onCheckIn={() => handleAttendanceAction(checkIn)}
                onCheckOut={() => handleAttendanceAction(checkOut)}
                logout={logout}
                isAdmin={isAdmin}
                adminProfiles={adminProfiles}
                adminAttendance={adminAttendance}
                selectedEmployeeId={selectedEmployeeId}
                selectAdminProfile={selectAdminProfile}
                adminForm={adminForm}
                setAdminForm={setAdminForm}
                saveAdminProfile={saveAdminProfile}
              />
            ) : (
              <AuthForm
                mode={mode}
                setMode={setMode}
                form={authForm}
                setForm={setAuthForm}
                onSubmit={handleSubmit}
              />
            )}
            {(error || notice) && (
              <p className={`mt-4 text-sm ${error ? "text-red-600" : "text-slate-600"}`}>
                {error || notice}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusLine({ health, auth }) {
  const healthy = health?.status === "ok";
  return (
    <div className="mb-6 flex items-start gap-3">
      {healthy ? (
        <CheckCircle2 className="mt-1 text-emerald-600" size={22} />
      ) : (
        <AlertCircle className="mt-1 text-amber-600" size={22} />
      )}
      <div>
        <h2 className="text-lg font-semibold tracking-normal">
          {auth ? "Employee Profile" : "Authentication"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {healthy ? `Backend connected: ${health.service}` : "Checking backend connection..."}
        </p>
      </div>
    </div>
  );
}

function AuthForm({ mode, setMode, form, setForm, onSubmit }) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="inline-flex rounded-md border border-slate-300 p-1">
        <button type="button" className={`rounded px-3 py-1.5 text-sm ${mode === "login" ? "bg-slate-950 text-white" : ""}`} onClick={() => setMode("login")}>Login</button>
        <button type="button" className={`rounded px-3 py-1.5 text-sm ${mode === "signup" ? "bg-slate-950 text-white" : ""}`} onClick={() => setMode("signup")}>Signup</button>
      </div>
      {mode === "signup" && (
        <div className="grid gap-4 sm:grid-cols-3">
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
  );
}

function Dashboard(props) {
  const {
    auth,
    profile,
    profileForm,
    setProfileForm,
    saveMyProfile,
    attendance,
    onCheckIn,
    onCheckOut,
    logout,
    isAdmin,
  } = props;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-4">
        <div>
          <p className="text-sm font-medium">{auth.user.name}</p>
          <p className="mt-1 text-sm text-slate-600">{auth.user.email} - {auth.user.role}</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium" onClick={logout}><LogOut size={16} /> Logout</button>
      </div>

      <form className="grid gap-4 lg:grid-cols-2" onSubmit={saveMyProfile}>
        <Readonly label="Employee ID" value={profile?.employee_id} />
        <Readonly label="Job Details" value={profile?.job_details} />
        <Readonly label="Salary Structure" value={profile?.salary_structure} />
        <Readonly label="Documents" value={profile?.documents_metadata} />
        <Input label="Address" value={profileForm.address} onChange={(value) => setProfileForm({ ...profileForm, address: value })} />
        <Input label="Phone" value={profileForm.phone} onChange={(value) => setProfileForm({ ...profileForm, phone: value })} />
        <Input label="Profile Picture URL" value={profileForm.profile_picture_url} onChange={(value) => setProfileForm({ ...profileForm, profile_picture_url: value })} />
        <div className="flex items-end">
          <button className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" type="submit"><Save size={16} /> Save Profile</button>
        </div>
      </form>

      <AttendancePanel
        attendance={attendance}
        onCheckIn={onCheckIn}
        onCheckOut={onCheckOut}
      />

      {isAdmin && <AdminProfilePanel {...props} />}
      {isAdmin && <AdminAttendancePanel records={props.adminAttendance} />}
    </div>
  );
}

function AttendancePanel({ attendance, onCheckIn, onCheckOut }) {
  const today = formatDateKey(new Date());
  const todayRecord = attendance.find((record) => record.date === today);

  return (
    <section className="border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-normal">Attendance</h3>
          <p className="mt-1 text-sm text-slate-600">Daily actions and recent attendance</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300" type="button" onClick={onCheckIn} disabled={Boolean(todayRecord)}>
            <Clock size={16} /> Check In
          </button>
          <button className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300" type="button" onClick={onCheckOut} disabled={!todayRecord || Boolean(todayRecord.check_out)}>
            <Clock size={16} /> Check Out
          </button>
        </div>
      </div>
      <AttendanceTable records={attendance} emptyText="No attendance records for the last 7 days." />
    </section>
  );
}

function AdminAttendancePanel({ records }) {
  return (
    <section className="border-t border-slate-200 pt-6">
      <h3 className="text-base font-semibold tracking-normal">Admin Attendance View</h3>
      <AttendanceTable records={records} showEmployee emptyText="No employee attendance records for the last 7 days." />
    </section>
  );
}

function AdminProfilePanel({ adminProfiles, selectedEmployeeId, selectAdminProfile, adminForm, setAdminForm, saveAdminProfile }) {
  return (
    <form className="border-t border-slate-200 pt-6" onSubmit={saveAdminProfile}>
      <h3 className="text-base font-semibold tracking-normal">Admin Profile Management</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-medium">
          Employee
          <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={selectedEmployeeId} onChange={(e) => selectAdminProfile(e.target.value)}>
            {adminProfiles.map((item) => <option key={item.employee_id} value={item.employee_id}>{item.name} ({item.employee_id})</option>)}
          </select>
        </label>
        {editableAdminFields.map((field) => (
          <Input key={field} label={field.replaceAll("_", " ")} value={adminForm[field]} onChange={(value) => setAdminForm({ ...adminForm, [field]: value })} />
        ))}
      </div>
      <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" type="submit"><Save size={16} /> Save Employee</button>
    </form>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label className="text-sm font-medium capitalize">
      {label}
      <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Readonly({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 min-h-5 text-sm text-slate-800">{value || "Not set"}</p>
    </div>
  );
}

function AttendanceTable({ records, showEmployee = false, emptyText }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full min-w-[620px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {showEmployee && <th className="px-3 py-2 font-medium">Employee ID</th>}
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Check In</th>
            <th className="px-3 py-2 font-medium">Check Out</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {records.length ? (
            records.map((record) => (
              <tr key={record.id} className="border-t border-slate-200">
                {showEmployee && <td className="px-3 py-2">{record.employee_id}</td>}
                <td className="px-3 py-2">{record.date}</td>
                <td className="px-3 py-2">{formatTime(record.check_in)}</td>
                <td className="px-3 py-2">
                  {record.check_out ? formatTime(record.check_out) : "Not checked out"}
                </td>
                <td className="px-3 py-2">{record.status.replace("_", " ")}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-3 py-4 text-slate-600" colSpan={showEmployee ? 5 : 4}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateKey(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default App;

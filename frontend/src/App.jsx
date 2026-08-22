import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  Clock,
  FileText,
  KeyRound,
  LogOut,
  Printer,
  Save,
  Send,
  Upload,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import {
  checkIn,
  checkOut,
  createLeaveRequest,
  getAdminAttendance,
  getAdminLeaves,
  getAdminPayroll,
  getAdminProfiles,
  getAdminRegistrations,
  getAdminUsers,
  getHealth,
  getMyAttendance,
  getMyLeaves,
  getMyPayroll,
  getMyProfile,
  login,
  resetAdminUserPassword,
  signup,
  updateAdminLeave,
  updateAdminPayroll,
  updateAdminProfile,
  updateAdminRegistration,
  updateAdminUserRole,
  updateAdminUserStatus,
  updateMyProfile,
} from "./api";

const emptyAuthForm = {
  employee_id: "",
  name: "",
  email: "",
  password: "",
  role: "EMPLOYEE",
};

const emptyLeaveForm = {
  leave_type: "PAID",
  start_date: "",
  end_date: "",
  remarks: "",
};

const MIN_WORK_MS = 7 * 60 * 60 * 1000;
const PROFILE_IMAGE_MAX_BYTES = 1024 * 1024;
const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const editableSelfProfileFields = [
  "name",
  "address",
  "phone",
  "father_name",
  "mother_name",
  "profile_picture_url",
];
const editableAdminFields = [
  "name",
  "personal_details",
  "job_details",
  "salary_structure",
  "documents_metadata",
  "address",
  "phone",
  "profile_picture_url",
  "father_name",
  "mother_name",
];

function compactProfile(profile) {
  return {
    name: profile?.name || "",
    personal_details: profile?.personal_details || "",
    job_details: profile?.job_details || "",
    salary_structure: profile?.salary_structure || "",
    documents_metadata: profile?.documents_metadata || "",
    address: profile?.address || "",
    phone: profile?.phone || "",
    profile_picture_url: profile?.profile_picture_url || "",
    father_name: profile?.father_name || "",
    mother_name: profile?.mother_name || "",
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
  const [adminRegistrations, setAdminRegistrations] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [adminAttendance, setAdminAttendance] = useState([]);
  const [leaveForm, setLeaveForm] = useState(emptyLeaveForm);
  const [leaves, setLeaves] = useState([]);
  const [adminLeaves, setAdminLeaves] = useState([]);
  const [payroll, setPayroll] = useState(null);
  const [adminPayroll, setAdminPayroll] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [adminForm, setAdminForm] = useState(compactProfile());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionPrompt, setActionPrompt] = useState("");

  const isAdmin = auth?.user?.role === "ADMIN";

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((err) => setNotice(err.message || "Unable to reach backend"));
  }, []);

  useEffect(() => {
    if (!auth) return;
    loadDashboardData();
  }, [auth]);

  async function loadDashboardData() {
    setError("");
    try {
      await Promise.all([loadProfile(), loadAttendance(), loadLeaves(), loadPayroll()]);
      if (auth.user.role === "ADMIN") {
        await Promise.all([
          loadAdminProfiles(),
          loadAdminRegistrations(),
          loadAdminUsers(),
          loadAdminAttendance(),
          loadAdminLeaves(),
          loadAdminPayroll(),
        ]);
      }
    } catch (err) {
      setError(err.message || "Unable to load dashboard data");
    }
  }

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
      if (mode === "signup") {
        setNotice("Registration submitted. An admin must approve it before you can log in.");
        setAuthForm(emptyAuthForm);
        setMode("login");
        return;
      }
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

  async function loadAdminRegistrations() {
    const records = await getAdminRegistrations(auth.access_token);
    setAdminRegistrations(records);
  }

  async function loadAdminUsers() {
    const records = await getAdminUsers(auth.access_token);
    setAdminUsers(records);
  }

  async function loadAttendance() {
    const records = await getMyAttendance(auth.access_token);
    setAttendance(records);
  }

  async function loadAdminAttendance() {
    const records = await getAdminAttendance(auth.access_token);
    setAdminAttendance(records);
  }

  async function loadLeaves() {
    const records = await getMyLeaves(auth.access_token);
    setLeaves(records);
  }

  async function loadAdminLeaves() {
    const records = await getAdminLeaves(auth.access_token);
    setAdminLeaves(records);
  }

  async function loadPayroll() {
    const record = await getMyPayroll(auth.access_token);
    setPayroll(record);
  }

  async function loadAdminPayroll() {
    const records = await getAdminPayroll(auth.access_token);
    setAdminPayroll(records);
  }

  async function handleAttendanceAction(action) {
    setError("");
    setNotice("");
    try {
      const saved = await action(auth.access_token);
      showActionPrompt(saved.check_out ? "Checked out for today" : "Checked in for today");
      await loadAttendance();
      if (isAdmin) await loadAdminAttendance();
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitLeaveRequest(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await createLeaveRequest(auth.access_token, leaveForm);
      setLeaveForm(emptyLeaveForm);
      showActionPrompt("Leave request submitted");
      await loadLeaves();
      if (isAdmin) await loadAdminLeaves();
    } catch (err) {
      setError(err.message);
    }
  }

  async function decideLeave(leaveId, status, adminComment) {
    setError("");
    setNotice("");
    try {
      await updateAdminLeave(auth.access_token, leaveId, {
        status,
        admin_comment: adminComment,
      });
      showActionPrompt(`Leave request ${status.toLowerCase()}`);
      await loadAdminLeaves();
      await loadLeaves();
    } catch (err) {
      setError(err.message);
    }
  }

  async function decideRegistration(requestId, status, adminComment) {
    setError("");
    setNotice("");
    try {
      await updateAdminRegistration(auth.access_token, requestId, {
        status,
        admin_comment: adminComment,
      });
      showActionPrompt(`Registration request ${status.toLowerCase()}`);
      await loadAdminRegistrations();
      await loadAdminProfiles();
      await loadAdminUsers();
      await loadAdminPayroll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveAdminPayroll(employeeId, payload) {
    setError("");
    setNotice("");
    try {
      const saved = await updateAdminPayroll(auth.access_token, employeeId, payload);
      showActionPrompt(`Updated payroll for ${saved.employee_id}`);
      await loadAdminPayroll();
      if (employeeId === auth.user.employee_id) await loadPayroll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveAdminUserRole(employeeId, role) {
    setError("");
    setNotice("");
    try {
      await updateAdminUserRole(auth.access_token, employeeId, { role });
      showActionPrompt(`Updated role for ${employeeId}`);
      await loadAdminUsers();
      await loadAdminProfiles();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveAdminUserStatus(employeeId, isActive) {
    setError("");
    setNotice("");
    try {
      await updateAdminUserStatus(auth.access_token, employeeId, { is_active: isActive });
      showActionPrompt(`${employeeId} ${isActive ? "reactivated" : "deactivated"}`);
      await loadAdminUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveAdminPassword(employeeId, password) {
    setError("");
    setNotice("");
    try {
      await resetAdminUserPassword(auth.access_token, employeeId, { password });
      showActionPrompt(`Password reset for ${employeeId}`);
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
        editableSelfProfileFields.map((field) => [field, profileForm[field]]),
      );
      const saved = await updateMyProfile(auth.access_token, payload);
      const nextAuth = {
        ...auth,
        user: {
          ...auth.user,
          name: saved.name,
        },
      };
      localStorage.setItem("dayflowAuth", JSON.stringify(nextAuth));
      setAuth(nextAuth);
      setProfile(saved);
      setProfileForm(compactProfile(saved));
      showActionPrompt("Profile updated");
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
      showActionPrompt(`Updated ${saved.name}`);
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

  function showActionPrompt(message) {
    setNotice(message);
    setActionPrompt(message);
  }

  function logout() {
    localStorage.removeItem("dayflowAuth");
    setAuth(null);
    setProfile(null);
    setAdminProfiles([]);
    setAdminRegistrations([]);
    setAdminUsers([]);
    setAttendance([]);
    setAdminAttendance([]);
    setLeaveForm(emptyLeaveForm);
    setLeaves([]);
    setAdminLeaves([]);
    setPayroll(null);
    setAdminPayroll([]);
    setNotice("");
    setActionPrompt("");
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
                leaveForm={leaveForm}
                setLeaveForm={setLeaveForm}
                leaves={leaves}
                submitLeaveRequest={submitLeaveRequest}
                payroll={payroll}
                logout={logout}
                isAdmin={isAdmin}
                adminProfiles={adminProfiles}
                adminRegistrations={adminRegistrations}
                decideRegistration={decideRegistration}
                adminUsers={adminUsers}
                saveAdminUserRole={saveAdminUserRole}
                saveAdminUserStatus={saveAdminUserStatus}
                saveAdminPassword={saveAdminPassword}
                adminAttendance={adminAttendance}
                adminLeaves={adminLeaves}
                decideLeave={decideLeave}
                adminPayroll={adminPayroll}
                saveAdminPayroll={saveAdminPayroll}
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
            {actionPrompt && (
              <ActionPrompt message={actionPrompt} onClose={() => setActionPrompt("")} />
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

function ActionPrompt({ message, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 text-emerald-600" size={22} />
          <div>
            <h2 className="text-base font-semibold tracking-normal">Action Done</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          </div>
        </div>
        <button className="mt-5 w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" type="button" onClick={onClose}>
          OK
        </button>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Employee ID" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
    leaveForm,
    setLeaveForm,
    leaves,
    submitLeaveRequest,
    payroll,
    logout,
    isAdmin,
  } = props;
  const [activeSection, setActiveSection] = useState("overview");
  const pendingLeaves = props.adminLeaves?.filter((leave) => leave.status === "PENDING").length || 0;
  const pendingRegistrations = props.adminRegistrations?.filter((item) => item.status === "PENDING").length || 0;
  const todayAttendance = attendance.find((record) => record.date === formatDateKey(new Date()));
  const modules = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "leaves", label: "Leave", icon: FileText },
    { id: "payroll", label: "Payroll", icon: Wallet },
    ...(isAdmin ? [{ id: "users", label: "User Information", icon: KeyRound }] : []),
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: Users }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-emerald-50 p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar profile={profile} name={auth.user.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{auth.user.name}</p>
            <p className="mt-1 truncate text-sm text-slate-600">{auth.user.email} - {auth.user.role}</p>
          </div>
        </div>
        <ProfileDropdown
          profile={profile}
          user={auth.user}
          onProfile={() => setActiveSection("profile")}
          onLogout={logout}
        />
      </div>

      <ModuleNav modules={modules} activeSection={activeSection} setActiveSection={setActiveSection} />

      {activeSection === "overview" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard title="Profile" value={profile?.job_details || "Profile ready"} detail={profile?.employee_id || auth.user.employee_id} icon={UserRound} onClick={() => setActiveSection("profile")} />
          <DashboardCard title="Attendance" value={todayAttendance ? "Checked in today" : "No check-in today"} detail={`${attendance.length} recent records`} icon={Clock} onClick={() => setActiveSection("attendance")} />
          <DashboardCard title="Leave" value={`${leaves.length} requests`} detail={isAdmin ? `${pendingLeaves} pending approvals` : "Track approval status"} icon={FileText} onClick={() => setActiveSection("leaves")} />
          <DashboardCard title="Payroll" value={formatCurrency(payroll?.net_salary)} detail="Current net salary" icon={Wallet} onClick={() => setActiveSection("payroll")} />
          {isAdmin && <DashboardCard title="User Information" value={`${props.adminUsers.length} accounts`} detail="Emails, employee IDs, and passwords" icon={KeyRound} onClick={() => setActiveSection("users")} />}
          {isAdmin && <DashboardCard title="Admin" value={`${pendingRegistrations} signup approvals`} detail={`${props.adminProfiles.length} employees`} icon={Users} onClick={() => setActiveSection("admin")} />}
        </div>
      )}

      {activeSection === "profile" && (
        <ProfilePanel
          profile={profile}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          saveMyProfile={saveMyProfile}
        />
      )}

      {activeSection === "attendance" && (
        <AttendancePanel
          auth={auth}
          attendance={attendance}
          onCheckIn={onCheckIn}
          onCheckOut={onCheckOut}
        />
      )}

      {activeSection === "leaves" && (
        <LeavePanel
          auth={auth}
          payroll={payroll}
          form={leaveForm}
          setForm={setLeaveForm}
          leaves={leaves}
          onSubmit={submitLeaveRequest}
        />
      )}

      {activeSection === "payroll" && <PayrollPanel auth={auth} profile={profile} payroll={payroll} />}

      {isAdmin && activeSection === "users" && (
        <AdminAccountPanel
          users={props.adminUsers}
          profiles={props.adminProfiles}
          attendance={props.adminAttendance}
          leaves={props.adminLeaves}
          currentEmployeeId={auth.user.employee_id}
          onRoleSave={props.saveAdminUserRole}
          onStatusSave={props.saveAdminUserStatus}
          onPasswordSave={props.saveAdminPassword}
        />
      )}

      {isAdmin && activeSection === "admin" && (
        <div className="space-y-6">
          <AdminRequestsPanel
            registrations={props.adminRegistrations}
            onRegistrationDecision={props.decideRegistration}
            leaves={props.adminLeaves}
            profiles={props.adminProfiles}
            onLeaveDecision={props.decideLeave}
          />
          <AdminProfilePanel {...props} />
          <AdminAttendancePanel records={props.adminAttendance} />
          <AdminPayrollPanel
            records={props.adminPayroll}
            onSave={props.saveAdminPayroll}
          />
        </div>
      )}
    </div>
  );
}

function ModuleNav({ modules, activeSection, setActiveSection }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
      {modules.map((module) => {
        const Icon = module.icon;
        return (
          <button key={module.id} className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${activeSection === module.id ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`} type="button" onClick={() => setActiveSection(module.id)}>
            <Icon size={16} /> {module.label}
          </button>
        );
      })}
    </div>
  );
}

function ProfileDropdown({ profile, user, onProfile, onLogout }) {
  const [open, setOpen] = useState(false);

  function handleProfile() {
    setOpen(false);
    onProfile();
  }

  function handleLogout() {
    setOpen(false);
    onLogout();
  }

  return (
    <div className="relative">
      <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50" type="button" onClick={() => setOpen(!open)}>
        <ProfileAvatar profile={profile} name={user.name} size="sm" />
        Account
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <button className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50" type="button" onClick={handleProfile}>
            <UserRound size={16} /> Profile
          </button>
          <button className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm text-red-700 hover:bg-red-50" type="button" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileAvatar({ profile, name, size = "md" }) {
  const dimensions = size === "lg" ? "h-12 w-12" : "h-8 w-8";
  const initials = String(name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (profile?.profile_picture_url) {
    return (
      <img
        className={`${dimensions} shrink-0 rounded-full border border-slate-200 bg-slate-100 object-cover`}
        alt={`${name || "User"} profile`}
        src={profile.profile_picture_url}
      />
    );
  }

  return (
    <span className={`${dimensions} grid shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-semibold text-white`}>
      {initials}
    </span>
  );
}

function DashboardCard({ title, value, detail, icon: Icon, onClick }) {
  return (
    <button className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md" type="button" onClick={onClick}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <Icon size={18} className="text-slate-500" />
      </div>
      <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </button>
  );
}

function ProfilePanel({ profile, profileForm, setProfileForm, saveMyProfile }) {
  function handleProfilePictureUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
      window.alert("Upload a JPG, PNG, WebP, or GIF image.");
      event.target.value = "";
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      window.alert("Profile picture must be 1 MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm({ ...profileForm, profile_picture_url: String(reader.result || "") });
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold tracking-normal">My Profile</h3>
          <p className="mt-1 text-sm text-slate-600">Personal details, family details, and account identity</p>
        </div>
        <ProfileAvatar profile={{ profile_picture_url: profileForm.profile_picture_url }} name={profileForm.name || profile?.name} size="lg" />
      </div>
      <form className="mt-5 space-y-5" onSubmit={saveMyProfile}>
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-3">
          <Input label="Name" placeholder="Enter full name" value={profileForm.name} onChange={(value) => setProfileForm({ ...profileForm, name: value })} required />
          <Readonly label="Employee ID" value={profile?.employee_id} />
          <Readonly label="Role" value={profile?.role} />
          <Readonly label="Email" value={profile?.email} />
          <Input label="Phone" placeholder="Enter phone number" value={profileForm.phone} onChange={(value) => setProfileForm({ ...profileForm, phone: value })} />
          <label className="text-sm font-medium">
            Profile Picture
            <span className="mt-1 flex items-center gap-2 text-xs font-normal text-slate-500">
              <Upload size={14} /> JPG, PNG, WebP, or GIF up to 1 MB
            </span>
            <span className="mt-1 flex items-center gap-2">
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium" accept={PROFILE_IMAGE_TYPES.join(",")} type="file" onChange={handleProfilePictureUpload} />
            </span>
          </label>
        </div>
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-2">
          <Input label="Father Name" placeholder="Enter father's name" value={profileForm.father_name} onChange={(value) => setProfileForm({ ...profileForm, father_name: value })} />
          <Input label="Mother Name" placeholder="Enter mother's name" value={profileForm.mother_name} onChange={(value) => setProfileForm({ ...profileForm, mother_name: value })} />
          <Input label="Address" placeholder="Enter current address" value={profileForm.address} onChange={(value) => setProfileForm({ ...profileForm, address: value })} />
          <Readonly label="Job Details" value={profile?.job_details} />
          <Readonly label="Salary Structure" value={profile?.salary_structure} />
          <Readonly label="Documents" value={profile?.documents_metadata} />
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm" type="submit"><Save size={16} /> Save Profile</button>
      </form>
    </section>
  );
}

function AttendancePanel({ auth, attendance, onCheckIn, onCheckOut }) {
  const today = formatDateKey(new Date());
  const todayRecord = attendance.find((record) => record.date === today);
  const [now, setNow] = useState(Date.now());
  const [showEarlyCheckout, setShowEarlyCheckout] = useState(false);
  const workedMs = todayRecord?.check_in
    ? Math.max(0, (todayRecord.check_out ? new Date(todayRecord.check_out).getTime() : now) - new Date(todayRecord.check_in).getTime())
    : 0;
  const remainingMs = Math.max(0, MIN_WORK_MS - workedMs);
  const minimumComplete = workedMs >= MIN_WORK_MS;

  useEffect(() => {
    if (!todayRecord?.check_in || todayRecord.check_out) return undefined;
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, [todayRecord?.check_in, todayRecord?.check_out]);

  function handleCheckOut() {
    if (todayRecord?.check_in && !todayRecord.check_out) {
      if (!minimumComplete) {
        setShowEarlyCheckout(true);
        return;
      }
    }
    onCheckOut();
  }

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
          <button className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300" type="button" onClick={handleCheckOut} disabled={!todayRecord || Boolean(todayRecord.check_out)}>
            <Clock size={16} /> Check Out
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium" type="button" onClick={() => printAttendanceSlip(auth.user, attendance)}>
            <Printer size={16} /> Print Slip
          </button>
        </div>
      </div>
      {todayRecord?.check_in && (
        <WorkSessionPanel
          record={todayRecord}
          workedMs={workedMs}
          remainingMs={remainingMs}
          minimumComplete={minimumComplete}
        />
      )}
      <AttendanceTable records={attendance} emptyText="No attendance records for the last 31 days." />
      {showEarlyCheckout && (
        <EarlyCheckoutDialog
          workedMs={workedMs}
          remainingMs={remainingMs}
          onCancel={() => setShowEarlyCheckout(false)}
          onConfirm={() => {
            setShowEarlyCheckout(false);
            onCheckOut();
          }}
        />
      )}
    </section>
  );
}

function WorkSessionPanel({ record, workedMs, remainingMs, minimumComplete }) {
  return (
    <div className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
      <Readonly label={record.check_out ? "Shift" : "Currently Working"} value={record.check_out ? "Completed" : "Active"} />
      <Readonly label="Check-in" value={formatTime(record.check_in)} />
      <Readonly label="Worked" value={formatDuration(workedMs, true)} />
      <Readonly label="Minimum Required" value="07h 00m" />
      <Readonly label={minimumComplete ? "Minimum Status" : "Remaining"} value={minimumComplete ? "7-hour minimum completed" : formatDuration(remainingMs, true)} />
      {record.check_out && <Readonly label="Check-out" value={formatTime(record.check_out)} />}
      {record.check_out && <Readonly label="Status" value={minimumComplete ? "Minimum completed" : "Below minimum"} />}
    </div>
  );
}

function EarlyCheckoutDialog({ workedMs, remainingMs, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
        <h2 className="text-base font-semibold tracking-normal">Minimum Work Session Not Completed</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">You have not completed the minimum 7-hour work session.</p>
        <div className="mt-4 grid gap-3 rounded-md bg-slate-50 p-3 text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-600">Worked</span><strong>{formatDuration(workedMs)}</strong></div>
          <div className="flex justify-between gap-4"><span className="text-slate-600">Remaining</span><strong>{formatDuration(remainingMs)}</strong></div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium" type="button" onClick={onCancel}>Continue Working</button>
          <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" type="button" onClick={onConfirm}>Check Out Anyway</button>
        </div>
      </div>
    </div>
  );
}

function AdminAttendancePanel({ records }) {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const filteredRecords = records.filter((record) => {
    const matchesSearch = !search || record.employee_id.toLowerCase().includes(search.toLowerCase());
    const matchesDate = !dateFilter || record.date === dateFilter;
    return matchesSearch && matchesDate;
  });

  return (
    <section className="border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-normal">Admin Attendance View</h3>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search employee ID" value={search} onChange={(event) => setSearch(event.target.value)} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
        </div>
      </div>
      <AttendanceTable records={filteredRecords} showEmployee emptyText="No employee attendance records match the current filters." />
    </section>
  );
}

function LeavePanel({ auth, payroll, form, setForm, leaves, onSubmit }) {
  return (
    <section className="border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-normal">Leave Requests</h3>
          <p className="mt-1 text-sm text-slate-600">Request time off and review your own leave history</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Readonly label="Paid Leave Available" value={Math.max(0, (payroll?.paid_leave_allowance || 2) - (payroll?.paid_leave_used || 0))} />
          <Readonly label="Sick Leave Available" value={Math.max(0, (payroll?.sick_leave_allowance || 1) - (payroll?.sick_leave_used || 0))} />
        </div>
      </div>
      <form className="mt-4 grid gap-4 lg:grid-cols-4" onSubmit={onSubmit}>
        <label className="text-sm font-medium">
          Type
          <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
            <option value="PAID">Paid</option>
            <option value="SICK">Sick</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </label>
        <Input label="Start Date" type="date" value={form.start_date} onChange={(value) => setForm({ ...form, start_date: value })} required />
        <Input label="End Date" type="date" value={form.end_date} onChange={(value) => setForm({ ...form, end_date: value })} required />
        <Input label="Remarks" value={form.remarks} onChange={(value) => setForm({ ...form, remarks: value })} />
        <div className="flex items-end">
          <button className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" type="submit"><Send size={16} /> Apply</button>
        </div>
      </form>
      <LeaveTable records={leaves} user={auth.user} onPrint={printLeaveSlip} emptyText="No leave requests yet." />
    </section>
  );
}

function AdminLeavePanel({ records, profiles = [], onDecision }) {
  const [comments, setComments] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const profileByEmployeeId = Object.fromEntries(profiles.map((profile) => [profile.employee_id, profile]));
  const filteredRecords = records.filter((record) => {
    const profile = profileByEmployeeId[record.employee_id];
    const haystack = `${record.employee_id} ${profile?.name || ""} ${record.leave_type} ${record.status}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesStatus = !statusFilter || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <section className="border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-normal">Admin Leave Approvals</h3>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search employee or status" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Employee ID</th>
              <th className="px-3 py-2 font-medium">Employee</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Dates</th>
              <th className="px-3 py-2 font-medium">Remarks</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Comment</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length ? (
              filteredRecords.map((record) => {
                const comment = comments[record.id] ?? record.admin_comment ?? "";
                const closed = record.status !== "PENDING";
                const profile = profileByEmployeeId[record.employee_id];
                return (
                  <tr key={record.id} className="border-t border-slate-200 align-top">
                    <td className="px-3 py-2">{record.employee_id}</td>
                    <td className="px-3 py-2">{profile?.name || "Unknown"}</td>
                    <td className="px-3 py-2">{record.leave_type}</td>
                    <td className="px-3 py-2">{record.start_date} to {record.end_date}</td>
                    <td className="px-3 py-2">{record.remarks || "None"}</td>
                    <td className="px-3 py-2">{record.status}</td>
                    <td className="px-3 py-2">
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={comment} onChange={(e) => setComments({ ...comments, [record.id]: e.target.value })} disabled={closed} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300" type="button" disabled={closed} onClick={() => onDecision(record.id, "APPROVED", comment)}>Approve</button>
                        <button className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300" type="button" disabled={closed} onClick={() => onDecision(record.id, "REJECTED", comment)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-3 py-4 text-slate-600" colSpan={8}>No leave requests match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminRegistrationPanel({ records, onDecision }) {
  const [comments, setComments] = useState({});

  return (
    <section className="border-t border-slate-200 pt-6">
      <h3 className="text-base font-semibold tracking-normal">Signup Approvals</h3>
      <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Employee ID</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Comment</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length ? (
              records.map((record) => {
                const comment = comments[record.id] ?? record.admin_comment ?? "";
                const closed = record.status !== "PENDING";
                return (
                  <tr key={record.id} className="border-t border-slate-200 align-top">
                    <td className="px-3 py-2">{record.employee_id}</td>
                    <td className="px-3 py-2">{record.name}</td>
                    <td className="px-3 py-2">{record.email}</td>
                    <td className="px-3 py-2">{record.status}</td>
                    <td className="px-3 py-2">
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={comment} onChange={(e) => setComments({ ...comments, [record.id]: e.target.value })} disabled={closed} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300" type="button" disabled={closed} onClick={() => onDecision(record.id, "APPROVED", comment)}>Approve</button>
                        <button className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300" type="button" disabled={closed} onClick={() => onDecision(record.id, "REJECTED", comment)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-3 py-4 text-slate-600" colSpan={6}>No signup requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminRequestsPanel({ registrations, onRegistrationDecision, leaves, profiles, onLeaveDecision }) {
  const [requestType, setRequestType] = useState("registrations");

  return (
    <section className="border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-normal">Requests</h3>
        <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={requestType} onChange={(event) => setRequestType(event.target.value)}>
          <option value="registrations">Signup Requests</option>
          <option value="leaves">Leave Requests</option>
        </select>
      </div>
      {requestType === "registrations" ? (
        <AdminRegistrationPanel records={registrations} onDecision={onRegistrationDecision} />
      ) : (
        <AdminLeavePanel records={leaves} profiles={profiles} onDecision={onLeaveDecision} />
      )}
    </section>
  );
}

function AdminAccountPanel({ users, profiles = [], attendance = [], leaves = [], currentEmployeeId, onRoleSave, onStatusSave, onPasswordSave }) {
  const [roles, setRoles] = useState({});
  const [passwords, setPasswords] = useState({});
  const [search, setSearch] = useState("");
  const profileByEmployeeId = Object.fromEntries(profiles.map((profile) => [profile.employee_id, profile]));
  const filteredUsers = users.filter((user) => {
    const haystack = `${user.name} ${user.employee_id} ${user.email} ${user.role}`.toLowerCase();
    return !search || haystack.includes(search.toLowerCase());
  });

  if (!users.length) {
    return (
      <section className="border-t border-slate-200 pt-6">
        <h3 className="text-base font-semibold tracking-normal">User Information</h3>
        <p className="mt-4 text-sm text-slate-600">No accounts available.</p>
      </section>
    );
  }

  function roleValue(user) {
    return roles[user.employee_id] ?? user.role;
  }

  function passwordValue(user) {
    return passwords[user.employee_id] ?? "";
  }

  function savePassword(event, user) {
    event.preventDefault();
    onPasswordSave(user.employee_id, passwordValue(user));
    setPasswords({ ...passwords, [user.employee_id]: "" });
  }

  return (
    <section className="border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-normal">Employee Directory</h3>
        <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search employees" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Employee ID</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Work Status</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Forgot Password</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length ? filteredUsers.map((user) => {
              const isSelf = user.employee_id === currentEmployeeId;
              const profile = profileByEmployeeId[user.employee_id];
              const workStatus = getEmployeeWorkStatus(user.employee_id, attendance, leaves);
              return (
                <tr key={user.employee_id} className="border-t border-slate-200 align-top">
                  <td className="px-3 py-2">
                    <button className="flex items-center gap-3 text-left" type="button">
                      <ProfileAvatar profile={profile} name={user.name} size="sm" />
                      <span>
                        <span className="block font-medium text-slate-900">{user.name}</span>
                        <span className="block text-xs text-slate-500">{profile?.job_details || "Employee"}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-2">{user.employee_id}</td>
                  <td className="px-3 py-2">{user.email}</td>
                  <td className="px-3 py-2"><WorkStatusBadge status={workStatus} /></td>
                  <td className="px-3 py-2">
                    <select className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm" value={roleValue(user)} onChange={(event) => setRoles({ ...roles, [user.employee_id]: event.target.value })} disabled={isSelf}>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">{user.is_active ? "Active" : "Deactivated"}</td>
                  <td className="px-3 py-2">
                    <form className="flex min-w-[280px] gap-2" onSubmit={(event) => savePassword(event, user)}>
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" minLength={8} placeholder="New password" type="password" value={passwordValue(user)} onChange={(event) => setPasswords({ ...passwords, [user.employee_id]: event.target.value })} required />
                      <button className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white" type="submit"><KeyRound size={16} /> Reset</button>
                    </form>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex min-w-[250px] flex-wrap gap-2">
                      <button className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300" type="button" disabled={isSelf} onClick={() => onRoleSave(user.employee_id, roleValue(user))}><Save size={16} /> Save Role</button>
                      <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:bg-slate-100" type="button" disabled={isSelf} onClick={() => onStatusSave(user.employee_id, !user.is_active)}>
                        {user.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td className="px-3 py-4 text-slate-600" colSpan={8}>No employees match the current search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WorkStatusBadge({ status }) {
  const styles = {
    present: "border-emerald-200 bg-emerald-50 text-emerald-800",
    leave: "border-sky-200 bg-sky-50 text-sky-800",
    absent: "border-amber-200 bg-amber-50 text-amber-800",
  };
  const labels = {
    present: "Present",
    leave: "On approved leave",
    absent: "Absent/no time off",
  };
  const symbols = {
    present: "●",
    leave: "✈",
    absent: "●",
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium ${styles[status]}`} title={labels[status]} aria-label={labels[status]}>
      {symbols[status]} {labels[status]}
    </span>
  );
}

function PayrollPanel({ auth, profile, payroll }) {
  return (
    <section className="border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-normal">Payroll</h3>
        <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium" type="button" onClick={() => printSalarySlip(auth.user, profile, payroll)}>
          <Printer size={16} /> Print Salary Slip
        </button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Readonly label="Basic Salary" value={formatCurrency(payroll?.basic_salary)} />
        <Readonly label="Allowances" value={formatCurrency(payroll?.allowances)} />
        <Readonly label="Fixed Deductions" value={formatCurrency(payroll?.deductions)} />
        <Readonly label="Leave Deduction" value={formatCurrency(payroll?.leave_deduction)} />
        <Readonly label="Net Salary" value={formatCurrency(payroll?.net_salary)} />
        <Readonly label="Paid Leave" value={`${payroll?.paid_leave_used || 0}/${payroll?.paid_leave_allowance || 2} used`} />
        <Readonly label="Sick Leave" value={`${payroll?.sick_leave_used || 0}/${payroll?.sick_leave_allowance || 1} used`} />
        <Readonly label="Unpaid Leave Days" value={payroll?.unpaid_leave_days} />
      </div>
    </section>
  );
}

function AdminPayrollPanel({ records, onSave }) {
  const [forms, setForms] = useState({});

  function fieldValue(record, field) {
    return forms[record.employee_id]?.[field] ?? String(record[field] ?? 0);
  }

  function updateField(employeeId, field, value) {
    setForms({
      ...forms,
      [employeeId]: {
        ...forms[employeeId],
        [field]: value,
      },
    });
  }

  function submitPayroll(event, record) {
    event.preventDefault();
    onSave(record.employee_id, {
      basic_salary: Number(fieldValue(record, "basic_salary")),
      allowances: Number(fieldValue(record, "allowances")),
      deductions: Number(fieldValue(record, "deductions")),
    });
  }

  return (
    <section className="border-t border-slate-200 pt-6">
      <h3 className="text-base font-semibold tracking-normal">Admin Payroll Management</h3>
      <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Employee ID</th>
              <th className="px-3 py-2 font-medium">Basic</th>
              <th className="px-3 py-2 font-medium">Allowances</th>
              <th className="px-3 py-2 font-medium">Deductions</th>
              <th className="px-3 py-2 font-medium">Net</th>
              <th className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {records.length ? (
              records.map((record) => (
                <tr key={record.employee_id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{record.employee_id}</td>
                  <td className="px-3 py-2">
                    <input className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm" min="0" step="0.01" type="number" value={fieldValue(record, "basic_salary")} onChange={(event) => updateField(record.employee_id, "basic_salary", event.target.value)} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm" min="0" step="0.01" type="number" value={fieldValue(record, "allowances")} onChange={(event) => updateField(record.employee_id, "allowances", event.target.value)} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm" min="0" step="0.01" type="number" value={fieldValue(record, "deductions")} onChange={(event) => updateField(record.employee_id, "deductions", event.target.value)} />
                  </td>
                  <td className="px-3 py-2">{formatCurrency(record.net_salary)}</td>
                  <td className="px-3 py-2">
                    <button className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" type="button" onClick={(event) => submitPayroll(event, record)}><Save size={16} /> Save</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-4 text-slate-600" colSpan={6}>No payroll records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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

function Input({ label, value, onChange, type = "text", required = false, placeholder = "" }) {
  return (
    <label className="text-sm font-medium capitalize">
      {label}
      <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case placeholder:text-slate-400" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} />
    </label>
  );
}

function Readonly({ label, value }) {
  const displayValue = value === undefined || value === null || value === "" ? "Not set" : value;
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 min-h-5 text-sm text-slate-800">{displayValue}</p>
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
            <th className="px-3 py-2 font-medium">Worked</th>
            <th className="px-3 py-2 font-medium">7-hour Status</th>
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
                <td className="px-3 py-2">{formatAttendanceDuration(record)}</td>
                <td className="px-3 py-2">{attendanceMinimumStatus(record)}</td>
                <td className="px-3 py-2">{record.status.replace("_", " ")}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-3 py-4 text-slate-600" colSpan={showEmployee ? 7 : 6}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function LeaveTable({ records, user, onPrint, emptyText }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Start</th>
            <th className="px-3 py-2 font-medium">End</th>
            <th className="px-3 py-2 font-medium">Remarks</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Admin Comment</th>
            <th className="px-3 py-2 font-medium">Slip</th>
          </tr>
        </thead>
        <tbody>
          {records.length ? (
            records.map((record) => (
              <tr key={record.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{record.leave_type}</td>
                <td className="px-3 py-2">{record.start_date}</td>
                <td className="px-3 py-2">{record.end_date}</td>
                <td className="px-3 py-2">{record.remarks || "None"}</td>
                <td className="px-3 py-2">{record.status}</td>
                <td className="px-3 py-2">{record.admin_comment || "None"}</td>
                <td className="px-3 py-2">
                  <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:bg-slate-100" type="button" disabled={record.status !== "APPROVED"} onClick={() => onPrint(user, record)}>
                    <Printer size={16} /> Print
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-3 py-4 text-slate-600" colSpan={7}>{emptyText}</td>
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

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "INR",
  }).format(Number(value || 0));
}

function formatDuration(ms, showSeconds = false) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const base = `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  return showSeconds ? `${base} ${String(seconds).padStart(2, "0")}s` : base;
}

function attendanceWorkedMs(record) {
  if (!record?.check_in || !record?.check_out) return null;
  return Math.max(0, new Date(record.check_out).getTime() - new Date(record.check_in).getTime());
}

function formatAttendanceDuration(record) {
  const workedMs = attendanceWorkedMs(record);
  return workedMs === null ? "Open" : formatDuration(workedMs);
}

function attendanceMinimumStatus(record) {
  const workedMs = attendanceWorkedMs(record);
  if (workedMs === null) return "In progress";
  return workedMs >= MIN_WORK_MS ? "Completed" : "Below minimum";
}

function formatHours(record) {
  if (!record?.check_in || !record?.check_out) return "Open";
  const hours = (new Date(record.check_out) - new Date(record.check_in)) / 36e5;
  return `${hours.toFixed(2)} hrs`;
}

function leaveDays(record) {
  return Math.floor((new Date(record.end_date) - new Date(record.start_date)) / 86400000) + 1;
}

function getEmployeeWorkStatus(employeeId, attendance, leaves) {
  const today = formatDateKey(new Date());
  const todayAttendance = attendance.find(
    (record) => record.employee_id === employeeId && record.date === today,
  );
  if (todayAttendance?.check_in && !todayAttendance.check_out) return "present";

  const approvedLeaveToday = leaves.some(
    (leave) =>
      leave.employee_id === employeeId &&
      leave.status === "APPROVED" &&
      leave.start_date <= today &&
      leave.end_date >= today,
  );
  return approvedLeaveToday ? "leave" : "absent";
}

function currentMonthLabel() {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printDocument(title, bodyHtml) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    window.alert("Please allow popups to print this slip.");
    return;
  }
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          h2 { font-size: 16px; margin: 24px 0 8px; }
          p { margin: 4px 0; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background: #f1f5f9; color: #475569; text-transform: uppercase; font-size: 11px; }
          .summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
          .box { border: 1px solid #cbd5e1; padding: 10px; }
          .label { color: #64748b; font-size: 11px; text-transform: uppercase; }
          .value { color: #0f172a; font-weight: 700; margin-top: 4px; }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function printSalarySlip(user, profile, payroll) {
  const rows = [
    ["Basic Salary", formatCurrency(payroll?.basic_salary)],
    ["Allowances", formatCurrency(payroll?.allowances)],
    ["Fixed Deductions", formatCurrency(payroll?.deductions)],
    ["Leave Deduction", formatCurrency(payroll?.leave_deduction)],
    ["Net Salary", formatCurrency(payroll?.net_salary)],
  ];
  const leaveRows = [
    ["Paid Leave", `${payroll?.paid_leave_used || 0}/${payroll?.paid_leave_allowance || 2} used`],
    ["Sick Leave", `${payroll?.sick_leave_used || 0}/${payroll?.sick_leave_allowance || 1} used`],
    ["Unpaid Leave Days", payroll?.unpaid_leave_days || 0],
  ];

  printDocument(
    `Salary Slip - ${user.employee_id}`,
    `
      <h1>Salary Slip</h1>
      <p>${escapeHtml(currentMonthLabel())}</p>
      <div class="summary">
        <div class="box"><div class="label">Employee</div><div class="value">${escapeHtml(user.name)}</div></div>
        <div class="box"><div class="label">Employee ID</div><div class="value">${escapeHtml(user.employee_id)}</div></div>
        <div class="box"><div class="label">Email</div><div class="value">${escapeHtml(user.email)}</div></div>
        <div class="box"><div class="label">Job Details</div><div class="value">${escapeHtml(profile?.job_details || "Not set")}</div></div>
      </div>
      <h2>Salary Breakdown</h2>
      <table><tbody>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>
      <h2>Leave Breakdown</h2>
      <table><tbody>${leaveRows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>
    `,
  );
}

function printAttendanceSlip(user, attendance) {
  const rows = attendance.map((record) => `
    <tr>
      <td>${escapeHtml(record.date)}</td>
      <td>${escapeHtml(formatTime(record.check_in))}</td>
      <td>${escapeHtml(record.check_out ? formatTime(record.check_out) : "Not checked out")}</td>
      <td>${escapeHtml(formatAttendanceDuration(record))}</td>
      <td>${escapeHtml(attendanceMinimumStatus(record))}</td>
      <td>${escapeHtml(record.status.replace("_", " "))}</td>
    </tr>
  `);

  printDocument(
    `Attendance Slip - ${user.employee_id}`,
    `
      <h1>Attendance Slip</h1>
      <p>${escapeHtml(currentMonthLabel())}</p>
      <div class="summary">
        <div class="box"><div class="label">Employee</div><div class="value">${escapeHtml(user.name)}</div></div>
        <div class="box"><div class="label">Employee ID</div><div class="value">${escapeHtml(user.employee_id)}</div></div>
        <div class="box"><div class="label">Email</div><div class="value">${escapeHtml(user.email)}</div></div>
        <div class="box"><div class="label">Records</div><div class="value">${attendance.length}</div></div>
      </div>
      <table>
        <thead>
          <tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Worked</th><th>7-hour Status</th><th>Status</th></tr>
        </thead>
        <tbody>${rows.length ? rows.join("") : `<tr><td colspan="6">No attendance records.</td></tr>`}</tbody>
      </table>
    `,
  );
}

function printLeaveSlip(user, leave) {
  const rows = [
    ["Employee", user.name],
    ["Employee ID", user.employee_id],
    ["Leave Type", leave.leave_type],
    ["Start Date", leave.start_date],
    ["End Date", leave.end_date],
    ["Number of Days", leaveDays(leave)],
    ["Reason/Remarks", leave.remarks || "None"],
    ["Approval Status", leave.status],
    ["Admin Comment", leave.admin_comment || "None"],
  ];

  printDocument(
    `Leave Slip - ${user.employee_id}`,
    `
      <h1>Dayflow HRMS</h1>
      <p>Leave Slip</p>
      <table><tbody>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>
    `,
  );
}

export default App;

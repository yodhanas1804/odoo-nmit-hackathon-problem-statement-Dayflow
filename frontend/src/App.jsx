import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  LogOut,
  Save,
  Send,
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
      setNotice(saved.check_out ? "Checked out for today" : "Checked in for today");
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
      setNotice("Leave request submitted");
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
      setNotice(`Leave request ${status.toLowerCase()}`);
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
      setNotice(`Registration request ${status.toLowerCase()}`);
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
      setNotice(`Updated payroll for ${saved.employee_id}`);
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
      setNotice(`Updated role for ${employeeId}`);
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
      setNotice(`${employeeId} ${isActive ? "reactivated" : "deactivated"}`);
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
      setNotice(`Password reset for ${employeeId}`);
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
    { id: "profile", label: "Profile", icon: UserRound },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "leaves", label: "Leave", icon: FileText },
    { id: "payroll", label: "Payroll", icon: Wallet },
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: Users }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-4">
        <div>
          <p className="text-sm font-medium">{auth.user.name}</p>
          <p className="mt-1 text-sm text-slate-600">{auth.user.email} - {auth.user.role}</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium" onClick={logout}><LogOut size={16} /> Logout</button>
      </div>

      <ModuleNav modules={modules} activeSection={activeSection} setActiveSection={setActiveSection} />

      {activeSection === "overview" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard title="Profile" value={profile?.job_details || "Profile ready"} detail={profile?.employee_id || auth.user.employee_id} icon={UserRound} onClick={() => setActiveSection("profile")} />
          <DashboardCard title="Attendance" value={todayAttendance ? "Checked in today" : "No check-in today"} detail={`${attendance.length} recent records`} icon={Clock} onClick={() => setActiveSection("attendance")} />
          <DashboardCard title="Leave" value={`${leaves.length} requests`} detail={isAdmin ? `${pendingLeaves} pending approvals` : "Track approval status"} icon={FileText} onClick={() => setActiveSection("leaves")} />
          <DashboardCard title="Payroll" value={formatCurrency(payroll?.net_salary)} detail="Current net salary" icon={Wallet} onClick={() => setActiveSection("payroll")} />
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
          attendance={attendance}
          onCheckIn={onCheckIn}
          onCheckOut={onCheckOut}
        />
      )}

      {activeSection === "leaves" && (
        <LeavePanel
          form={leaveForm}
          setForm={setLeaveForm}
          leaves={leaves}
          onSubmit={submitLeaveRequest}
        />
      )}

      {activeSection === "payroll" && <PayrollPanel payroll={payroll} />}

      {isAdmin && activeSection === "admin" && (
        <div className="space-y-6">
          <AdminRequestsPanel
            registrations={props.adminRegistrations}
            onRegistrationDecision={props.decideRegistration}
            leaves={props.adminLeaves}
            onLeaveDecision={props.decideLeave}
          />
          <AdminAccountPanel
            users={props.adminUsers}
            currentEmployeeId={auth.user.employee_id}
            onRoleSave={props.saveAdminUserRole}
            onStatusSave={props.saveAdminUserStatus}
            onPasswordSave={props.saveAdminPassword}
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
    <div className="flex gap-2 overflow-x-auto rounded-md border border-slate-200 p-2">
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

function DashboardCard({ title, value, detail, icon: Icon, onClick }) {
  return (
    <button className="rounded-md border border-slate-200 bg-slate-50 p-4 text-left hover:border-slate-400" type="button" onClick={onClick}>
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
  return (
    <section className="border-t border-slate-200 pt-6">
      <h3 className="text-base font-semibold tracking-normal">Profile</h3>
      <form className="mt-4 grid gap-4 lg:grid-cols-2" onSubmit={saveMyProfile}>
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
    </section>
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

function LeavePanel({ form, setForm, leaves, onSubmit }) {
  return (
    <section className="border-t border-slate-200 pt-6">
      <h3 className="text-base font-semibold tracking-normal">Leave Requests</h3>
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
      <LeaveTable records={leaves} emptyText="No leave requests yet." />
    </section>
  );
}

function AdminLeavePanel({ records, onDecision }) {
  const [comments, setComments] = useState({});

  return (
    <section className="border-t border-slate-200 pt-6">
      <h3 className="text-base font-semibold tracking-normal">Admin Leave Approvals</h3>
      <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Employee ID</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Dates</th>
              <th className="px-3 py-2 font-medium">Remarks</th>
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
                <td className="px-3 py-4 text-slate-600" colSpan={7}>No leave requests yet.</td>
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

function AdminRequestsPanel({ registrations, onRegistrationDecision, leaves, onLeaveDecision }) {
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
        <AdminLeavePanel records={leaves} onDecision={onLeaveDecision} />
      )}
    </section>
  );
}

function AdminAccountPanel({ users, currentEmployeeId, onRoleSave, onStatusSave, onPasswordSave }) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [password, setPassword] = useState("");

  const selectedUser = users.find((user) => user.employee_id === selectedEmployeeId) || users[0];

  useEffect(() => {
    if (!selectedUser) return;
    setSelectedEmployeeId(selectedUser.employee_id);
    setRole(selectedUser.role);
  }, [selectedUser?.employee_id, selectedUser?.role]);

  if (!users.length) {
    return (
      <section className="border-t border-slate-200 pt-6">
        <h3 className="text-base font-semibold tracking-normal">Account Management</h3>
        <p className="mt-4 text-sm text-slate-600">No accounts available.</p>
      </section>
    );
  }

  const isSelf = selectedUser.employee_id === currentEmployeeId;

  return (
    <section className="border-t border-slate-200 pt-6">
      <h3 className="text-base font-semibold tracking-normal">Account Management</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <label className="text-sm font-medium">
          Account ID
          <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={selectedUser.employee_id} onChange={(event) => setSelectedEmployeeId(event.target.value)}>
            {users.map((user) => (
              <option key={user.employee_id} value={user.employee_id}>
                {user.name} ({user.employee_id})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Role
          <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={role} onChange={(event) => setRole(event.target.value)} disabled={isSelf}>
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <Readonly label="Status" value={selectedUser.is_active ? "Active" : "Deactivated"} />
        <Readonly label="Email" value={selectedUser.email} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300" type="button" disabled={isSelf} onClick={() => onRoleSave(selectedUser.employee_id, role)}><Save size={16} /> Save Role</button>
        <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:bg-slate-100" type="button" disabled={isSelf} onClick={() => onStatusSave(selectedUser.employee_id, !selectedUser.is_active)}>
          {selectedUser.is_active ? "Deactivate Account" : "Reactivate Account"}
        </button>
      </div>
      <form className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]" onSubmit={(event) => {
        event.preventDefault();
        onPasswordSave(selectedUser.employee_id, password);
        setPassword("");
      }}>
        <Input label="New Password" type="password" value={password} onChange={setPassword} required />
        <div className="flex items-end">
          <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" type="submit">Reset Password</button>
        </div>
      </form>
    </section>
  );
}

function PayrollPanel({ payroll }) {
  return (
    <section className="border-t border-slate-200 pt-6">
      <h3 className="text-base font-semibold tracking-normal">Payroll</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Readonly label="Basic Salary" value={formatCurrency(payroll?.basic_salary)} />
        <Readonly label="Allowances" value={formatCurrency(payroll?.allowances)} />
        <Readonly label="Deductions" value={formatCurrency(payroll?.deductions)} />
        <Readonly label="Net Salary" value={formatCurrency(payroll?.net_salary)} />
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

function Input({ label, value, onChange, type = "text", required = false }) {
  return (
    <label className="text-sm font-medium capitalize">
      {label}
      <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
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

function LeaveTable({ records, emptyText }) {
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
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-3 py-4 text-slate-600" colSpan={6}>{emptyText}</td>
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

export default App;

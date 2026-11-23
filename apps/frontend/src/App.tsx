import "./index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Feed } from "./pages/Feed";
import { Jobs } from "./pages/Jobs";
import { Events } from "./pages/Events";
import { Connections } from "./pages/Connections";
import { AllAlumni } from "./pages/AllAlumni";
import { Students } from "./pages/Students";
import { PendingApprovals } from "./pages/PendingApprovals";
import { Applications, MyApplications } from "./pages/Applications";
import { Profile } from "./pages/Profile";
import { Chat } from "./pages/Chat";
import { getToken, getUser } from "./lib/api";
import { NotificationProvider } from "./lib/notifications";

const Home = () => {
  const u = getUser();
  return <Navigate to={u && getToken() ? `/${u.role.toLowerCase()}` : "/login"} replace />;
};

export function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* role homes share the community feed */}
        <Route path="/student" element={<Feed />} />
        <Route path="/alumni" element={<Feed />} />
        <Route path="/admin" element={<Feed />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/events" element={<Events />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/allAlumni" element={<AllAlumni />} />
        <Route path="/students" element={<Students />} />
        <Route path="/pendingApprovals" element={<PendingApprovals />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/myApplications" element={<MyApplications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/allChat" element={<Chat />} />
        <Route path="*" element={<Home />} />
      </Routes>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;

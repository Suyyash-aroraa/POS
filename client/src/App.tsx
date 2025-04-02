import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import POSPage from "@/pages/pos-page";
import ParcelPage from "@/pages/parcel-page";
import SettingsPage from "@/pages/settings-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthDebug } from "@/components/auth/auth-debug";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/pos" component={POSPage} />
      <ProtectedRoute path="/parcel" component={ParcelPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <Router />
      {/* Temporary debugging component */}
      <AuthDebug />
    </>
  );
}

export default App;

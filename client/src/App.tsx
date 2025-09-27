import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import PatientManagement from "@/pages/PatientManagement";
import AddPatient from "@/pages/AddPatient";
import PatientDetails from "@/pages/PatientDetails";
import AttachDocumentPage from "@/pages/AttachDocumentPage";
import CommentsPage from "@/pages/CommentsPage";
import TimelinePage from "@/pages/TimelinePage";
import UserManagement from "@/pages/UserManagement";
import UserDetails from "@/pages/UserDetails";
import Analytics from "@/pages/Analytics";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import SEOSettings from "@/pages/SEOSettings";
import Notifications from "@/pages/Notifications";
import ChangePassword from "@/pages/ChangePassword";
import NotFound from "@/pages/not-found";
import Sidebar, { SidebarProvider, useSidebar } from "@/components/Sidebar";
import Header from "@/components/Header";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ConcurrentSessionDialog } from "@/components/ConcurrentSessionDialog";
import { useSessionMonitoring } from "@/hooks/useSessionMonitoring";

function AuthenticatedLayout() {
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();
  const {
    showConcurrentDialog,
    activeSessions,
    handleForceLogin,
    closeConcurrentDialog,
    userEmail,
  } = useSessionMonitoring();
  
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={`min-h-screen transition-all duration-300 ${
        isCollapsed 
          ? 'md:ml-[4.5rem]' 
          : 'md:ml-64'
      }`}>
        <Header />
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/patients" component={PatientManagement} />
          <Route path="/patients/:id" component={PatientDetails} />
          <Route path="/patients/:id/attach-document" component={({ params }: any) => <AttachDocumentPage patientId={params.id} />} />
          <Route path="/patients/:id/comments" component={({ params }: any) => <CommentsPage patientId={params.id} />} />
          <Route path="/patients/:id/timeline" component={({ params }: any) => <TimelinePage patientId={params.id} />} />
          <Route path="/add-patient" component={AddPatient} />
          <Route path="/users" component={UserManagement} />
          <Route path="/users/:id" component={UserDetails} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
          <Route path="/seo-settings" component={SEOSettings} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/change-password" component={() => <ChangePassword userId={user?.id} />} />
          <Route component={NotFound} />
        </Switch>
      </div>
      
      {/* Concurrent Session Dialog */}
      <ConcurrentSessionDialog
        isOpen={showConcurrentDialog}
        onClose={closeConcurrentDialog}
        activeSessions={activeSessions}
        onForceLogin={handleForceLogin}
        userEmail={userEmail}
      />
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <AuthenticatedLayout />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={500} skipDelayDuration={200}>
          <SidebarProvider>
            <Toaster />
            <Router />
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

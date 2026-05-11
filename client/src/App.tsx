import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ChatWidget from "./components/ChatWidget";

// Pages
import Home from "./pages/Home";
import Contents from "./pages/Contents";
import ContentDetail from "./pages/ContentDetail";
import Pricing from "./pages/Pricing";
import SearchPage from "./pages/SearchPage";
import MyPage from "./pages/MyPage";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminContents from "./pages/admin/AdminContents";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminPlaylists from "./pages/admin/AdminPlaylists";
import AdminSubscribers from "./pages/admin/AdminSubscribers";
import AdminNewsletter from "./pages/admin/AdminNewsletter";
import AdminChat from "./pages/admin/AdminChat";
import AdminPlans from "./pages/admin/AdminPlans";

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/contents" component={Contents} />
      <Route path="/contents/:slug" component={ContentDetail} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/search" component={SearchPage} />
      <Route path="/mypage" component={MyPage} />

      {/* Admin */}
      <Route path="/admin">{() => <AdminRoute component={AdminDashboard} />}</Route>
      <Route path="/admin/contents">{() => <AdminRoute component={AdminContents} />}</Route>
      <Route path="/admin/categories">{() => <AdminRoute component={AdminCategories} />}</Route>
      <Route path="/admin/playlists">{() => <AdminRoute component={AdminPlaylists} />}</Route>
      <Route path="/admin/subscribers">{() => <AdminRoute component={AdminSubscribers} />}</Route>
      <Route path="/admin/newsletter">{() => <AdminRoute component={AdminNewsletter} />}</Route>
      <Route path="/admin/chat">{() => <AdminRoute component={AdminChat} />}</Route>
      <Route path="/admin/plans">{() => <AdminRoute component={AdminPlans} />}</Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <ChatWidget />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

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
import AdminPlans from "./pages/admin/AdminPlans";
import AdminTelegram from "./pages/admin/AdminTelegram";
import AdminContentEditor from "./pages/admin/AdminContentEditor";

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

      {/* Admin - Full screen editor (no AdminLayout) */}
      <Route path="/admin/editor/new" component={AdminContentEditor} />
      <Route path="/admin/editor/:id" component={AdminContentEditor} />

      {/* Admin - Standard layout */}
      <Route path="/admin">{() => <AdminRoute component={AdminDashboard} />}</Route>
      <Route path="/admin/contents">{() => <AdminRoute component={AdminContents} />}</Route>
      <Route path="/admin/categories">{() => <AdminRoute component={AdminCategories} />}</Route>
      <Route path="/admin/playlists">{() => <AdminRoute component={AdminPlaylists} />}</Route>
      <Route path="/admin/subscribers">{() => <AdminRoute component={AdminSubscribers} />}</Route>
      <Route path="/admin/plans">{() => <AdminRoute component={AdminPlans} />}</Route>
      <Route path="/admin/telegram">{() => <AdminRoute component={AdminTelegram} />}</Route>

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
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, type ElementType } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Pages
const Home = lazy(() => import("./pages/Home"));
const Contents = lazy(() => import("./pages/Contents"));
const ContentDetail = lazy(() => import("./pages/ContentDetail"));
const Pricing = lazy(() => import("./pages/Pricing"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const MyPage = lazy(() => import("./pages/MyPage"));
const PreviewPage = lazy(() => import("./pages/PreviewPage"));
const AuthorProfile = lazy(() => import("./pages/AuthorProfile"));
const PlaylistDetail = lazy(() => import("./pages/PlaylistDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin Pages
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminContents = lazy(() => import("./pages/admin/AdminContents"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminPlaylists = lazy(() => import("./pages/admin/AdminPlaylists"));
const AdminSubscribers = lazy(() => import("./pages/admin/AdminSubscribers"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminTelegram = lazy(() => import("./pages/admin/AdminTelegram"));
const AdminContentEditor = lazy(() => import("./pages/admin/AdminContentEditor"));

function PageFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}

function AdminRoute({ component: Component }: { component: ElementType }) {
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
      <Route path="/preview/:token" component={PreviewPage} />
      <Route path="/author" component={AuthorProfile} />
      <Route path="/playlists/:slug" component={PlaylistDetail} />

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
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<PageFallback />}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

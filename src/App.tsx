import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { AnimatePresence, motion } from "framer-motion";
import Index from "./pages/Index";
import About from "./pages/About";
import HowItWorks from "./pages/HowItWorks";
import Categories from "./pages/Categories";
import Contacts from "./pages/Contacts";
import BecomeMaster from "./pages/BecomeMaster";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MasterDashboardPage from "./pages/MasterDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import SuperAdminDashboardPage from "./pages/SuperAdminDashboardPage";
import NotFound from "./pages/NotFound";
import PriceList from "./pages/PriceList";
import MasterProfile from "./pages/MasterProfile";
import Masters from "./pages/Masters";
import MasterDetail from "./pages/MasterDetail";
import CategoryDetail from "./pages/CategoryDetail";
import ServiceDetail from "./pages/ServiceDetail";
import VerifyEmail from "./pages/VerifyEmail";
import PendingApproval from "./pages/PendingApproval";
import Shop from "./pages/Shop";
import ShopCategory from "./pages/ShopCategory";
import ProductDetail from "./pages/ProductDetail";
import CartPage from "./pages/Cart";
import MasterStore from "./pages/MasterStore";

const queryClient = new QueryClient();

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        <Route path="/how-it-works" element={<PageTransition><HowItWorks /></PageTransition>} />
        <Route path="/categories" element={<PageTransition><Categories /></PageTransition>} />
        <Route path="/category/:id" element={<PageTransition><CategoryDetail /></PageTransition>} />
        <Route path="/service/:id" element={<PageTransition><ServiceDetail /></PageTransition>} />
        <Route path="/contacts" element={<PageTransition><Contacts /></PageTransition>} />
        <Route path="/services" element={<PageTransition><PriceList /></PageTransition>} />
        <Route path="/become-master" element={<PageTransition><BecomeMaster /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/master/:id" element={<PageTransition><MasterProfile /></PageTransition>} />
        <Route path="/masters" element={<PageTransition><Masters /></PageTransition>} />
        <Route path="/masters/:id" element={<PageTransition><MasterDetail /></PageTransition>} />
        <Route path="/verify-email" element={<PageTransition><VerifyEmail /></PageTransition>} />
        <Route path="/pending-approval" element={<PageTransition><PendingApproval /></PageTransition>} />
        <Route path="/shop" element={<PageTransition><Shop /></PageTransition>} />
        <Route path="/shop/category/:id" element={<PageTransition><ShopCategory /></PageTransition>} />
        <Route path="/shop/product/:id" element={<PageTransition><ProductDetail /></PageTransition>} />
        <Route path="/cart" element={<PageTransition><CartPage /></PageTransition>} />
        <Route path="/master-store/:masterId" element={<PageTransition><MasterStore /></PageTransition>} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/master-dashboard" element={<MasterDashboardPage />} />
        <Route path="/master-dashboard/*" element={<MasterDashboardPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/dashboard/*" element={<AdminDashboardPage />} />
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboardPage />} />
        <Route path="/super-admin/dashboard/*" element={<SuperAdminDashboardPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;

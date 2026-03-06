import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { GameStateProvider } from "@/contexts/GameStateContext";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Market from "./pages/Market";
import Profile from "./pages/Profile";
import Tasks from "./pages/Tasks";
import Exchange from "./pages/Exchange";
import Withdraw from "./pages/Withdraw";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Leaderboard from "./pages/Leaderboard";
import Referral from "./pages/Referral";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";
import LoadingScreen from "./components/LoadingScreen";

const queryClient = new QueryClient();

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <GameStateProvider>
      <div className="mx-auto max-w-lg min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/market" element={<Market />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/exchange" element={<Exchange />} />
          <Route path="/withdraw" element={<Withdraw />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/referral" element={<Referral />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
      </div>
    </GameStateProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

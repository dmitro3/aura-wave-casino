
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LevelSyncProvider } from "@/contexts/LevelSyncContext";
import Index from "./pages/Index";
import Rewards from "./pages/Rewards";
import Roulette from "./pages/Roulette";
import Coinflip from "./pages/Coinflip";
import Tower from "./pages/Tower";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <AuthProvider>
      <LevelSyncProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/roulette" element={<Roulette />} />
          <Route path="/coinflip" element={<Coinflip />} />
          <Route path="/tower" element={<Tower />} />
          <Route path="/rewards" element={<Rewards />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </LevelSyncProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

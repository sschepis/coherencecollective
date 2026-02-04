import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import DiscoveryFeed from "./pages/DiscoveryFeed";
import CoherenceWorkFeed from "./pages/CoherenceWorkFeed";
import ClaimDetail from "./pages/ClaimDetail";
import ClaimsList from "./pages/ClaimsList";
import AgentsList from "./pages/AgentsList";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/feed/discovery" element={<DiscoveryFeed />} />
          <Route path="/feed/work" element={<CoherenceWorkFeed />} />
          <Route path="/claims" element={<ClaimsList />} />
          <Route path="/claims/:id" element={<ClaimDetail />} />
          <Route path="/agents" element={<AgentsList />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

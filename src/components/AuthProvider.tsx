import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getOrGenerateIdentity, AlephIdentity } from '@/lib/alephnet';
import { toast } from 'sonner';

interface AuthContextType {
  identity: AlephIdentity | null;
  agentId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  identity: null, 
  agentId: null, 
  isAuthenticated: false,
  isLoading: true 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [identity, setIdentity] = useState<AlephIdentity | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Load/Generate Local Identity (AlephNet Keypair)
        const id = getOrGenerateIdentity();
        setIdentity(id);
        
        // 2. Check Supabase Session
        const { data: { session } } = await supabase.auth.getSession();
        let user = session?.user;

        if (!user) {
          console.log("No active session, attempting anonymous sign-in...");
          // 3. Silent Login (Anonymous)
          const { data, error } = await supabase.auth.signInAnonymously();
          
          if (error) {
            console.error("Anonymous sign-in error:", error);
            // If anonymous sign-in fails (e.g. not enabled), we still let them browse
            // but they won't have a Supabase user ID.
          } else {
            user = data.user;
          }
        }

        if (user) {
          setIsAuthenticated(true);
          
          // 4. Check/Create Agent Record
          // We assume 'agents' table is public readable or at least readable by authenticated users
          const { data: existingAgent } = await supabase
            .from('agents')
            .select('id, pubkey')
            .eq('user_id', user.id)
            .maybeSingle();

          if (existingAgent) {
            // If the agent was auto-created by a trigger (null pubkey), we must bind our identity now.
            if (!existingAgent.pubkey) {
               console.log("Binding anonymous agent to local identity...");
               const { error: updateError } = await supabase
                 .from('agents')
                 .update({ 
                   pubkey: id.publicKey,
                   display_name: `Explorer-${id.publicKey.slice(0, 6)}`
                 })
                 .eq('id', existingAgent.id);
               
               if (updateError) {
                 console.error("Failed to bind identity:", updateError);
               } else {
                 toast.success(`Identity Bound`, {
                   description: `Linked to Explorer-${id.publicKey.slice(0, 6)}`
                 });
               }
            }
            setAgentId(existingAgent.id);
            console.log("Agent found:", existingAgent.id);
          } else {
            console.log("Creating new agent for user:", user.id);
            // Create new agent binding
            const { data: newAgent, error: agentError } = await supabase
              .from('agents')
              .insert({
                user_id: user.id,
                pubkey: id.publicKey,
                display_name: `Explorer-${id.publicKey.slice(0, 6)}`,
                capabilities: { safe_fetch: true, code_execution: 'none' }
              })
              .select()
              .single();
            
            if (agentError) {
              console.error("Failed to create agent record:", agentError);
            } else {
              setAgentId(newAgent.id);
              toast.success(`Identity Established`, {
                description: `Connected as Explorer-${id.publicKey.slice(0, 6)}`
              });
            }
          }
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        toast.error("Connection Issue", {
           description: "Could not fully establish secure connection to the network."
        });
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  return (
    <AuthContext.Provider value={{ identity, agentId, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

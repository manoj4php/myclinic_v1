import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { ClinicLogoText } from "@/components/Logo";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/login", { email, password });
      const { token } = await response.json();
      
      if (token) {
        localStorage.setItem("jwtToken", token);
        toast({
          title: "Success",
          description: "Login successful!",
        });
        // Force a page reload to update auth state
        window.location.href = "/";
      } else {
        throw new Error("No token received");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message?.includes('401') ? "Invalid email or password" : "Login failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <ClinicLogoText size="lg" />
            </div>
            <p className="text-muted-foreground mt-2">Healthcare Management System</p>
          </div>
          
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full"
              disabled={isLoading}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full"
              disabled={isLoading}
            />
            <p className="text-center text-sm text-muted-foreground">
              Secure access to your clinic management system
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Demo: admin@myclinic.com / admin123
            </p>
            
            <Button 
              onClick={handleLogin}
              className="w-full py-3 text-lg"
              data-testid="button-login"
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </div>
          
          <div className="mt-8 text-center">
            <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div>
                <i className="fas fa-user-md block mb-1"></i>
                <span>Doctors</span>
              </div>
              <div>
                <i className="fas fa-users block mb-1"></i>
                <span>Patients</span>
              </div>
              <div>
                <i className="fas fa-chart-bar block mb-1"></i>
                <span>Analytics</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
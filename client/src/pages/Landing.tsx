import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { ClinicLogoText } from "@/components/Logo";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
 // debugger;
  const handleLogin = async () => {
    const response = await apiRequest("POST", "/api/login", { email, password });
    const { token } = await response.json();
    localStorage.setItem("jwtToken", token);
    window.location.href = "/";
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
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-2"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-2"
            />
            <p className="text-center text-sm text-muted-foreground">
              Secure access to your clinic management system
            </p>
            
            <Button 
              onClick={handleLogin}
              className="w-full py-3 text-lg"
              data-testid="button-login"
            >
              Sign In
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
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string) => void;
}

export default function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', password: '', confirmPassword: '' });
  const { toast } = useToast();

  const handleLogin = () => {
    if (!loginData.username || !loginData.password) {
      toast({
        title: "Missing Fields",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    const users = JSON.parse(localStorage.getItem('gamblingUsers') || '{}');
    if (users[loginData.username] && users[loginData.username].password === loginData.password) {
      onLogin(loginData.username);
      onClose();
      toast({
        title: "Welcome back!",
        description: `Logged in as ${loginData.username}`,
      });
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    }
  };

  const handleRegister = () => {
    if (!registerData.username || !registerData.password || !registerData.confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    const users = JSON.parse(localStorage.getItem('gamblingUsers') || '{}');
    if (users[registerData.username]) {
      toast({
        title: "Username Taken",
        description: "This username is already taken",
        variant: "destructive",
      });
      return;
    }

    const newUser = {
      username: registerData.username,
      password: registerData.password,
      registrationDate: new Date().toISOString(),
      balance: 0,
      level: 1,
      xp: 0,
      totalWagered: 0,
      totalProfit: 0,
      lastClaimTime: 0,
      gameStats: {
        coinflip: { wins: 0, losses: 0, profit: 0 },
        crash: { wins: 0, losses: 0, profit: 0 }
      },
      badges: ['welcome']
    };

    users[registerData.username] = newUser;
    localStorage.setItem('gamblingUsers', JSON.stringify(users));
    
    onLogin(registerData.username);
    onClose();
    toast({
      title: "Account Created!",
      description: `Welcome to the platform, ${registerData.username}!`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-0 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold gradient-primary bg-clip-text text-transparent">
            Welcome to ArcadeFinance
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                className="glass border-0"
                placeholder="Enter your username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="glass border-0"
                placeholder="Enter your password"
              />
            </div>
            <Button onClick={handleLogin} className="w-full gradient-primary hover:glow-primary transition-smooth">
              Login
            </Button>
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-username">Username</Label>
              <Input
                id="register-username"
                value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                className="glass border-0"
                placeholder="Choose a username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                className="glass border-0"
                placeholder="Choose a password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                className="glass border-0"
                placeholder="Confirm your password"
              />
            </div>
            <Button onClick={handleRegister} className="w-full gradient-primary hover:glow-primary transition-smooth">
              Create Account
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
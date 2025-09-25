import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { logoutWithConfirmation } from "@/lib/authUtils";
import type { User } from "@/types";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("profile");
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      emailNotifications: user?.emailNotifications ?? true,
      smsNotifications: false,
      archivalPeriod: "yearly",
      systemTheme: "light",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) {
        throw new Error("User ID not found");
      }
      
      // Only include fields that can be updated (exclude email and password)
      const updateData = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        emailNotifications: data.emailNotifications,
      };
      
      const response = await apiRequest("PUT", `/api/users/${user.id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = async (data: any) => {
    updateProfileMutation.mutate(data);
  };

  const handleSaveNotifications = async (data: any) => {
    setIsLoading(true);
    try {
      // API call to update notification settings
      toast({
        title: "Success",
        description: "Notification settings updated!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSystem = async (data: any) => {
    setIsLoading(true);
    try {
      // API call to update system settings
      toast({
        title: "Success",
        description: "System settings updated!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6" data-testid="settings-view">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">Manage your account and system preferences</p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system">System</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
          {user?.role === 'super_admin' && (
            <TabsTrigger value="seo" data-testid="tab-seo">SEO</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveProfile)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input data-testid="input-first-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input data-testid="input-last-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" disabled data-testid="input-email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input data-testid="input-phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                    {updateProfileMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveNotifications)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Email Notifications</p>
                        <p className="text-xs text-muted-foreground">Receive email alerts for patient updates</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-email-notifications"
                            />
                          </FormControl>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">SMS Notifications</p>
                        <p className="text-xs text-muted-foreground">Receive text messages for urgent updates</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="smsNotifications"
                        render={({ field }) => (
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-sms-notifications"
                            />
                          </FormControl>
                        )}
                      />
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Notification Types</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Patient Added</span>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Patient Updated</span>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>File Uploaded</span>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>System Updates</span>
                          <Switch />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} data-testid="button-save-notifications">
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Saving...
                      </>
                    ) : (
                      "Save Preferences"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveSystem)} className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="archivalPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Data Archival Period</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-archival-period">
                                <SelectValue placeholder="Select archival period" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="6months">6 Months</SelectItem>
                              <SelectItem value="yearly">1 Year</SelectItem>
                              <SelectItem value="2years">2 Years</SelectItem>
                              <SelectItem value="5years">5 Years</SelectItem>
                              <SelectItem value="never">Never</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="systemTheme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System Theme</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-system-theme">
                                <SelectValue placeholder="Select theme" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                              <SelectItem value="auto">Auto</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Data Management</p>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <i className="fas fa-download mr-2"></i>
                          Export Data
                        </Button>
                        <Button variant="outline" size="sm">
                          <i className="fas fa-database mr-2"></i>
                          Backup System
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} data-testid="button-save-system">
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Password</p>
                  <p className="text-xs text-muted-foreground mb-4">Change your account password</p>
                  <Button variant="outline">
                    <i className="fas fa-key mr-2"></i>
                    Change Password
                  </Button>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground mb-4">Add an extra layer of security to your account</p>
                  <Button variant="outline">
                    <i className="fas fa-shield-alt mr-2"></i>
                    Enable 2FA
                  </Button>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Account Activity</p>
                  <p className="text-xs text-muted-foreground mb-4">View recent login activity and sessions</p>
                  <Button variant="outline">
                    <i className="fas fa-history mr-2"></i>
                    View Activity Log
                  </Button>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Session Management</p>
                  <p className="text-xs text-muted-foreground mb-4">End your current session and log out</p>
                  <Button 
                    variant="outline" 
                    onClick={logoutWithConfirmation}
                    data-testid="button-logout-settings"
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Logout
                  </Button>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Danger Zone</p>
                  <p className="text-xs text-muted-foreground mb-4">Permanently delete your account and all data</p>
                  <Button variant="destructive">
                    <i className="fas fa-trash mr-2"></i>
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

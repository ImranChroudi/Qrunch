import { getAdminContext, NotLinkedError } from "@/lib/data/admin";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { AdminLocaleProvider } from "@/components/dashboard/admin-locale-provider";
import { AdminLanguageSwitcher } from "@/components/dashboard/admin-language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ChefHat } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const { restaurant, profile } = await getAdminContext();
 
    return (
      <AdminLocaleProvider initialLocale={profile?.locale}>
        <div className="min-h-screen bg-background">
          <div className="flex min-h-screen">
            <aside className="hidden w-72 border-r border-sidebar-border/60 bg-sidebar md:flex md:flex-col">
              <AppSidebar restaurant={restaurant} />
            </aside>
            <div className="flex w-full flex-col">
              <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden">
                          <Menu className="h-5 w-5" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-72 p-0">
                        <AppSidebar restaurant={restaurant} />
                      </SheetContent>
                    </Sheet>
                    <p className="text-sm font-semibold">{restaurant.name}</p>
                  </div>
                  <AdminLanguageSwitcher />
                </div>
              </header>
              <div className="hidden items-center justify-end gap-2 border-b bg-background/95 px-4 py-2 md:flex">
                <AdminLanguageSwitcher />
              </div>
              <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
            </div>
          </div>
        </div>
      </AdminLocaleProvider>
    );
  } catch (error) {
    if (error instanceof NotLinkedError) {
      return (
        <AdminLocaleProvider initialLocale="en">
          <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ChefHat className="h-6 w-6" />
              </div>
              <CardTitle>Set up your restaurant</CardTitle>
              <CardDescription>
                Your account isn&apos;t linked to a restaurant yet. Create one to start managing your menu.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <form action="/dashboard/onboarding" method="post" className="w-full space-y-4">
                <div className="space-y-2 text-left">
                  <label htmlFor="name" className="text-sm font-medium">
                    Restaurant name
                  </label>
                  <input
                    id="name"
                    name="name"
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="Pizza House Tanger"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create restaurant
                </Button>
              </form>
              <LogoutButton
                variant="link"
                className="text-sm text-muted-foreground hover:underline"
              >
                Sign out
              </LogoutButton>
            </CardContent>
          </Card>
        </div>
        </AdminLocaleProvider>
      );
    }
    throw error;
  }
}

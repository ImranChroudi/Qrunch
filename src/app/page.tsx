import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, UtensilsCrossed, Settings, BarChart3 } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <section className="relative flex flex-col items-center justify-center px-4 py-20 text-center sm:py-32">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Digital QR menus for modern restaurants
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Give customers instant access to your menu by scanning a QR code. No app required.
              Update prices, availability and images in real-time from your admin dashboard.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/login">Get started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Instant QR access",
              description: "Customers scan and see your menu instantly on any mobile device.",
              icon: QrCode,
            },
            {
              title: "Real-time updates",
              description: "Hide items, change prices or update photos and they reflect immediately.",
              icon: UtensilsCrossed,
            },
            {
              title: "Brand your menu",
              description: "Upload your logo, cover image and match your restaurant colors.",
              icon: Settings,
            },
            {
              title: "Built for speed",
              description: "Mobile-first, image-optimized and designed for slower connections.",
              icon: BarChart3,
            },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border/60">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <footer className="border-t px-4 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} MenuQr. Built for restaurants.</p>
      </footer>
    </main>
  );
}

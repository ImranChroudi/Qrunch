"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Link2, Printer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminT } from "@/components/dashboard/admin-locale-provider";

const QR_SIZE = 320;

export function QRClient({
  menuUrl,
  restaurantName,
  isPublished,
  primaryColor,
}: {
  menuUrl: string;
  restaurantName: string;
  isPublished: boolean;
  primaryColor: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [svgMarkup, setSvgMarkup] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const t = useAdminT();

  const generate = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsGenerating(true);
    try {
      await QRCode.toCanvas(canvas, menuUrl, {
        width: QR_SIZE,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#ffffff" },
      });
      const svg = await QRCode.toString(menuUrl, {
        type: "svg",
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#ffffff" },
      });
      setSvgMarkup(svg);
    } catch (error) {
      toast.error(t("qr.regenerate"));
      if (error instanceof Error) console.error(error);
    } finally {
      setIsGenerating(false);
    }
  }, [menuUrl, t]);

  useEffect(() => {
    void generate();
  }, [generate]);

  function downloadDataUrl(dataUrl: string, filename: string) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadDataUrl(canvas.toDataURL("image/png"), `qr-${restaurantName.toLowerCase().replace(/\s+/g, "-")}.png`);
    toast.success(t("qr.downloadPng"));
  }

  function downloadSvg() {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, `qr-${restaurantName.toLowerCase().replace(/\s+/g, "-")}.svg`);
    URL.revokeObjectURL(url);
    toast.success(t("qr.downloadSvg"));
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(menuUrl);
      toast.success(t("qr.linkCopied"));
    } catch {
      toast.error(t("qr.copyLink"));
    }
  }

  function printQr() {
    const printWindow = window.open("", "_blank", "width=480,height=640");
    if (!printWindow) {
      toast.error(t("qr.print"));
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurantName} — Menu QR</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; }
            h1 { font-size: 20px; margin: 0 0 4px; }
            p { color: #666; font-size: 13px; margin: 0 0 24px; }
            canvas { max-width: 320px; }
            .url { font-size: 12px; color: #444; margin-top: 24px; word-break: break-all; }
          </style>
        </head>
        <body>
          <h1>${restaurantName}</h1>
          <p>Scan to view our menu</p>
          <div id="mount"></div>
          <p class="url">${menuUrl}</p>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"><\/script>
          <script>
            const mount = document.getElementById("mount");
            const canvas = document.createElement("canvas");
            mount.appendChild(canvas);
            QRCode.toCanvas(canvas, ${JSON.stringify(menuUrl)}, { width: 320, margin: 2, errorCorrectionLevel: "H" }, () => window.print());
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("qr.title")}</h1>
          <p className="text-muted-foreground">
            Print this code on table tents, receipts or posters.
          </p>
        </div>
        {!isPublished ? (
          <Badge variant="secondary">{t("qr.unpublished")}</Badge>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle>QR preview</CardTitle>
            <CardDescription>High error correction, safe to print small.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div
              className="flex items-center justify-center rounded-xl border border-border/60 bg-white p-6 shadow-sm"
              style={{ outline: `6px solid ${primaryColor}1a` }}
            >
              <canvas
                ref={canvasRef}
                width={QR_SIZE}
                height={QR_SIZE}
                className={cn("h-auto w-[240px] max-w-full", isGenerating && "opacity-40")}
                aria-label={t("qr.title")}
              />
            </div>
            <div className="flex w-full max-w-md flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input readOnly value={menuUrl} aria-label={t("qr.menuUrl")} className="text-sm" />
                <Button variant="outline" size="icon" onClick={copyLink} aria-label={t("qr.copyLink")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={downloadPng} disabled={isGenerating}>
                  <Download className="mr-2 h-4 w-4" />
                  PNG
                </Button>
                <Button variant="outline" onClick={downloadSvg} disabled={isGenerating || !svgMarkup}>
                  <Download className="mr-2 h-4 w-4" />
                  SVG
                </Button>
                <Button variant="outline" onClick={printQr} disabled={isGenerating}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>How it works</CardTitle>
            <CardDescription>Point customers at your live menu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
              <p>Download the PNG for digital use or the SVG for print shops.</p>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              <p>Place one code per table so every scan is attributed separately.</p>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                3
              </span>
              <p>
                Scans are counted in <span className="font-medium text-foreground">Analytics</span>{" "}
                with the <span className="font-medium text-foreground">qr</span> source.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 p-3 text-xs">
              <Link2 className="h-4 w-4 shrink-0" />
              <span className="break-all">{menuUrl}</span>
            </div>
            {isPublished ? null : (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Publish the menu in Restaurant Settings before printing — right now customers
                would see a hidden notice.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

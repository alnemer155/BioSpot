import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export function QrCodeSection({ url, username }: { url: string; username: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloadReady, setDownloadReady] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        url,
        {
          width: 200,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
          errorCorrectionLevel: "M",
        },
        (err) => {
          if (!err) setDownloadReady(true);
        }
      );
    }
  }, [url]);

  const download = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${username}-qr.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="space-y-4 border border-border bg-card p-5">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        QR Code
      </h2>
      <p className="break-all text-xs text-muted-foreground">{url}</p>
      <div className="flex flex-col items-center gap-4">
        <canvas ref={canvasRef} className="border border-border" />
        {downloadReady && (
          <button
            onClick={download}
            className="border border-border px-4 py-2 text-xs text-foreground transition-colors hover:bg-accent"
          >
            Download PNG
          </button>
        )}
      </div>
    </div>
  );
}

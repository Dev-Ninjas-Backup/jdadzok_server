import appMetadata from "@metadata/app-metadata";
import { Controller, Get, Header, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

function createDeploymentVersion(): string {
    if (process.env.APP_VERSION) {
        return process.env.APP_VERSION;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `v${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/** Fixed at process start / restart — does not change per request. */
const DEPLOYMENT_VERSION = createDeploymentVersion();

@ApiTags("App")
@Controller()
export class AppController {
    @ApiExcludeEndpoint()
    @Get()
    @Header("Content-Type", "text/html")
    getLanding(): string {
        const environment = process.env.NODE_ENV || "development";
        const version = appMetadata.version;
        const deploymentVersion = DEPLOYMENT_VERSION;
        const displayName = "Synqulan API";
        const description =
            "Synqulan REST API — social, marketplace, donations, and admin endpoints for the Synqulan platform.";
        const year = new Date().getFullYear();

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${displayName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: radial-gradient(ellipse at center, #1e293b 0%, #0f172a 55%, #020617 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      color: #e2e8f0;
    }

    .card {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(51, 65, 85, 0.5);
      border-radius: 16px;
      padding: 48px;
      width: 100%;
      max-width: 560px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
    }

    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 14px;
      letter-spacing: -0.5px;
    }

    .description {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .badge {
      display: inline-block;
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 28px;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }

    .info-box {
      background: rgba(30, 41, 59, 0.55);
      border: 1px solid rgba(51, 65, 85, 0.45);
      border-radius: 12px;
      padding: 16px 18px;
    }

    .info-label {
      color: #64748b;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .info-value {
      color: #ffffff;
      font-size: 1.05rem;
      font-weight: 600;
      word-break: break-all;
    }

    .status-online {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      flex-shrink: 0;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
      }
      50% {
        opacity: 0.85;
        box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
      }
    }

    .links {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 28px;
    }

    .link-button {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      background: rgba(30, 41, 59, 0.55);
      border: 1px solid rgba(51, 65, 85, 0.45);
      border-radius: 10px;
      color: #e2e8f0;
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 500;
      transition: background 0.15s, border-color 0.15s, transform 0.15s;
    }

    .link-button:hover {
      background: rgba(30, 41, 59, 0.85);
      border-color: rgba(59, 130, 246, 0.45);
      transform: translateX(3px);
    }

    .link-icon {
      font-size: 1.15rem;
      line-height: 1;
    }

    .footer {
      text-align: center;
      color: #64748b;
      font-size: 0.8rem;
    }

    @media (max-width: 640px) {
      .card { padding: 32px 24px; }
      h1 { font-size: 1.6rem; }
      .info-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${displayName}</h1>
    <p class="description">${description}</p>
    <span class="badge">Backend Service</span>

    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Release Version</div>
        <div class="info-value">v${version}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Deployment Version</div>
        <div class="info-value">${deploymentVersion}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Environment</div>
        <div class="info-value">${environment}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Status</div>
        <div class="info-value status-online">
          <span class="status-dot"></span>
          <span>Online</span>
        </div>
      </div>
    </div>

    <div class="links">
      <a href="/docs" class="link-button">
        <span class="link-icon">📘</span>
        <span>API Documentation</span>
      </a>
      <a href="/api/health" class="link-button">
        <span class="link-icon">❤️</span>
        <span>Health Check</span>
      </a>
    </div>

    <div class="footer">&copy; ${year} Synqulan — All rights reserved</div>
  </div>

  <script>
    async function checkHealth() {
      try {
        const response = await fetch('/api/health');
        const statusText = document.querySelector('.status-online span:last-child');
        const dot = document.querySelector('.status-dot');
        if (!statusText || !dot) return;

        if (response.ok) {
          statusText.textContent = 'Online';
          dot.style.background = '#22c55e';
        } else {
          statusText.textContent = 'Degraded';
          dot.style.background = '#f59e0b';
        }
      } catch {
        const statusText = document.querySelector('.status-online span:last-child');
        const dot = document.querySelector('.status-dot');
        if (!statusText || !dot) return;
        statusText.textContent = 'Offline';
        dot.style.background = '#ef4444';
        dot.style.animation = 'none';
      }
    }

    checkHealth();
    setInterval(checkHealth, 30000);
  </script>
</body>
</html>`;
    }

    @ApiOkResponse({
        description: "Returns service health status for monitoring",
        schema: {
            example: {
                status: "healthy",
                timestamp: "2025-05-27T12:00:00.000Z",
                version: "0.3.1",
                uptime: 3600,
            },
        },
    })
    @Get("api/health")
    async getHealthCheck(@Res() res: Response) {
        res.status(200).json({
            status: "ok",
            name: appMetadata.displayName,
            version: appMetadata.version,
            description: appMetadata.description,
            environment: process.env.NODE_ENV,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            team: {
                name: "Dev Ninja",
                leader: "Niloy",
                members: [
                    {
                        name: "Milon",
                        role: "Backend Developer",
                    },
                    {
                        name: "Sujon",
                        role: "Backend Developer",
                    },
                ],
            },
        });
    }
}

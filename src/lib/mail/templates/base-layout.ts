import appMetadata from "@metadata/app-metadata";
const generateBaseLayout = (subject: string, body: string): string => {
    return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>${subject}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        background-color: #f9f9f9;
        font-family: 'Segoe UI', sans-serif;
        margin: 0;
        padding: 30px;
      }
      .container {
        max-width: 600px;
        background-color: #fff;
        padding: 30px;
        margin: auto;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.05);
      }
      h1 {
        color: #333;
      }
      p {
        color: #555;
        font-size: 16px;
      }
      .footer {
        margin-top: 40px;
        font-size: 12px;
        color: #999;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      ${body}
      <div class="footer">
        <p>You're receiving this email from ${appMetadata.displayName}.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};
export default generateBaseLayout;

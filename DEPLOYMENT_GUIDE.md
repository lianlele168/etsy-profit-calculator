# Deployment Guide

Recommended first deployment path:

1. Create a free GitHub account if you do not already have one.
2. Create a new GitHub repository named `etsy-profit-calculator` or another short project name.
3. Push this local project to that repository.
4. Create a free Cloudflare account.
5. In Cloudflare, go to Workers & Pages, create a Pages project, and import the GitHub repository.
6. Use these Cloudflare Pages settings:
   - Framework preset: None
   - Build command: `exit 0`
   - Build output directory: `/`
   - Root directory: leave blank
   - Production branch: `main`
7. Deploy. Cloudflare will provide a free URL like `https://your-project.pages.dev`.
8. Replace `https://example.com` in the project with the final Pages URL.
9. Replace `hello@example.com` with a real monitored email address.
10. Commit and push the replacements. Cloudflare will redeploy automatically.
11. After the site is live, submit the Pages URL to Google Search Console.

For this static HTML/CSS/JS project, no build framework or server is required.

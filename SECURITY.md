# Security Policy

## Owner

- **Project:** CH RTV Platform
- **Owner:** OLuwayemi Oyinlola Michael
- **Portfolio:** https://www.oyinlola.site/
- **GitHub:** https://github.com/oyinlola-tech

## Security Scope

This policy applies to the CH RTV Platform codebase, including:

- backend microservices
- frontend admin dashboard
- database bootstrap and seed scripts
- environment configuration examples
- deployment and setup documentation

## Supported Security Review Scope

Security review is most relevant for the latest repository state and the current active branch or release snapshot under direct owner control.

Older copies, forks, unofficial mirrors, locally modified deployments, and unauthorized redistributions are not considered supported distributions.

## Reporting a Vulnerability

Please do not report unpatched security vulnerabilities through public issues, public pull requests, social posts, screenshots, or public demo videos.

Use a private owner-controlled contact route instead:

1. Contact the owner through the contact method provided on `https://www.oyinlola.site/`.
2. If needed, use the contact options available from `https://github.com/oyinlola-tech`.
3. Share enough technical detail to reproduce and validate the issue safely.

## What to Include in a Report

Include as many of the following as possible:

- affected component or file
- vulnerability type
- exact steps to reproduce
- proof-of-concept payload or request
- realistic impact
- prerequisites or environment assumptions
- suggested mitigation if available

If sensitive data is involved, redact secrets and personal data before sending screenshots or logs.

## Response Expectations

The owner will review reports as availability permits. Response timing is best-effort and may vary depending on severity, reproducibility, and current project commitments.

## Coordinated Disclosure Expectations

Please allow reasonable time for investigation and remediation before any public disclosure.

Do not publish exploit details while a vulnerability remains unpatched or while mitigations are still being prepared.

## Secrets and Sensitive Data

This repository must never be used to store live production secrets.

Requirements:

- keep `.env` files out of version control
- rotate `JWT_SECRET` and admin credentials before any real deployment
- avoid committing API keys, database passwords, or webhook secrets
- sanitize logs before sharing them externally
- restrict access to production environment files and backups

## Deployment Hardening Checklist

Before any non-local deployment:

- replace all default or development credentials
- generate a strong random `JWT_SECRET`
- restrict MySQL access to trusted hosts only
- place the app behind HTTPS and a reverse proxy
- limit admin access by IP, VPN, or private network
- review firewall rules for TCP device ingress
- monitor failed logins, gateway abuse, and integration failures
- keep dependencies reviewed and updated
- back up the database and test restoration

## Repository-Specific Security Notes

This platform includes several areas that require extra care:

- TCP device ingestion can be abused if exposed broadly without network controls
- admin authentication must not keep default credentials beyond local testing
- integration endpoints may expose shipment or operational data if misconfigured
- audit, setup, and architecture documentation should be reviewed before sharing with third parties
- `.env` values define internal trust boundaries and should be treated as sensitive

## Authorized Testing

Security testing is allowed only when authorized by the owner and only against environments you are explicitly permitted to assess.

Do not perform intrusive testing against production systems, third-party endpoints, client assets, or public infrastructure without written approval.

## Dependency and Maintenance Guidance

- run `npm audit --omit=dev` regularly
- review upstream package changes before upgrades
- retest authentication, rate limiting, and validation flows after dependency updates
- verify that security headers and internal service restrictions remain intact after configuration changes

## Legal Notice

This repository is proprietary and not free to use. Security review access does not grant permission to reuse, deploy, copy, or redistribute the project outside the owner's written approval.

# SecureFlow

**A 24-month security engineering project (September 2026 – August 2028)**

SecureFlow is a deliberately simple multi-tenant project-management backend that serves as
the workload for a progressively built production-like security architecture.

> The backend is the workload. The infrastructure is the laboratory.
> The security architecture is the subject. The two-year evolution is the curriculum.

## What SecureFlow is

- **Multi-tenant project management API** — Organizations → Projects → Tasks / Comments / Attachments → API Keys
- **Human identities:** Owner, Admin, Member
- **Machine identities:** CI/CD (later: API, Worker)
- **Stack:** TypeScript · Node.js · PostgreSQL · Redis · Docker

The application intentionally stays boring. All the complexity — infrastructure, security
architecture, observability, detection, incident response — evolves *around* it.

## The system's evolution

```
Simple application → Linux server → Hardened server → Networked production system →
Cloud infrastructure → IAM → Infrastructure as Code → Secure CI/CD → Containers →
Kubernetes → Threat-modeled application → Security telemetry → SIEM →
Detection engineering → Incident response → Adversarial testing → Hardened platform
```

## Curriculum map

| Period | SecureFlow's problem | Response |
|--------|----------------------|---------------|
| Sep 2026 | Where does the application run? | Linux |
| Oct | How do we secure the machine? | Host hardening |
| Nov | How does it communicate? | Networking |
| Dec | How do we expose it safely? | DNS / TLS / proxies / firewalls |
| Jan 2027 | What protects our data and identities? | Cryptography |
| Feb | How do we scale the infrastructure? | AWS |
| Mar | Who can access what? | IAM |
| Apr | How do we reproduce infrastructure? | Terraform |
| May | How does software safely reach production? | DevSecOps |
| Jun | How do we package workloads securely? | Docker |
| Jul | How do we orchestrate them? | Kubernetes |
| Aug | How do we secure the cluster? | Kubernetes security |
| Sep | How do we operate it reliably? | Production operations |
| Oct | Can the application itself be attacked? | AppSec |
| Nov | How do we prevent vulnerabilities? | Secure engineering |
| Dec | What can attack the whole architecture? | Threat modeling |
| Jan 2028 | How should the architecture defend itself? | Security architecture |
| Feb | How do we know what's happening? | Telemetry |
| Mar | How do we analyze security events? | SIEM |
| Apr | How do we detect malicious behavior? | Detection engineering |
| May | What happens after detection? | Incident response |
| Jun | How would an attacker move through it? | Adversarial security |
| Jul | What happens in a mature distributed system? | Advanced production security |
| Aug | Can you independently assess the entire thing? | Final security assessment |

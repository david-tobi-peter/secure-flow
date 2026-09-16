# SecureFlow

**A security engineering project, built phase by phase**

SecureFlow is a deliberately simple multi-tenant project-management backend that serves as
the workload for a progressively built production-like security architecture.

> The backend is the workload. The infrastructure is the laboratory.
> The security architecture is the subject. The phased evolution is the curriculum.

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

Each phase is a unit of work, not a deadline. A phase advances when its problem is solved
and its decisions are documented.

| Phase | Focus | SecureFlow's problem | Response |
|-------|-------|----------------------|----------|
| 1 | The Boring API | What is the workload? | Multi-tenant project-management API: auth, organizations, members, projects, tasks |
| 2 | Running It | Where does the application run? | Linux · dedicated service user · systemd · journald |
| 3 | Hardening the Host | How do we secure the machine? | SSH · firewall · resource limits · sysctl · file ownership |
| 4 | Understanding the Network | How does it communicate? | Networking fundamentals · packets · routing |
| 5 | Exposing It Safely | How do we expose it to the world? | DNS · TLS · reverse proxy · firewalls |
| 6 | Protecting Data & Identities | What protects our data and identities? | Cryptography · hashing · HMAC · PKI · key management |
| 7 | Into the Cloud | How do we scale the infrastructure? | AWS |
| 8 | Identity & Access | Who can access what? | IAM |
| 9 | Infrastructure as Code | How do we reproduce infrastructure? | Terraform |
| 10 | Secure Delivery | How does software safely reach production? | CI/CD · DevSecOps |
| 11 | Packaging Workloads | How do we package workloads securely? | Docker · container security |
| 12 | Orchestration | How do we orchestrate them? | Kubernetes fundamentals |
| 13 | Cluster Security | How do we secure the cluster? | Kubernetes security |
| 14 | Production Operations | How do we operate it reliably? | Production-like operations |
| 15 | Attacking the Application | Can the application itself be attacked? | Web & API security |
| 16 | Secure Engineering | How do we prevent vulnerabilities? | Secure software engineering |
| 17 | Threat Modeling | What can attack the whole architecture? | Threat modeling |
| 18 | Security Architecture | How should the architecture defend itself? | Security architecture |
| 19 | Observability | How do we know what's happening? | Telemetry · structured logs · correlation |
| 20 | SIEM | How do we analyze security events? | SIEM |
| 21 | Detection Engineering | How do we detect malicious behavior? | Detection engineering · Sigma · ATT&CK |
| 22 | Incident Response | What happens after detection? | IR workflow |
| 23 | Adversarial Security | How would an attacker move through it? | Offensive security for the defender |
| 24 | Advanced Production Security | What happens in a mature distributed system? | Supply chain · distributed-system security |
| 25 | Final Assessment | Can you independently assess the entire thing? | Threat model · attack paths · remediation · final report |

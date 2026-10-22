---
paths:
  - "**/Dockerfile*"
  - "**/*.dockerfile"
  - "**/*compose*.{yml,yaml}"
  - "**/.github/workflows/**"
  - "**/*.tf"
  - "**/*.tfvars"
  - "**/charts/**"
  - "**/helm/**"
  - "**/k8s/**"
  - "**/kubernetes/**"
  - "**/manifests/**"
---

# Infrastructure

Load the `changing-infrastructure` skill before any plan, apply or deploy.

- **Images:** pinned versions, a digest for production. Non-root user, multi-stage builds, lockfile installs (`npm ci`, `uv sync --frozen`). No secrets in layers or build args.
- **CI:** actions pinned to a commit SHA, least-privilege `permissions` on every workflow.
- **Kubernetes:** requests and limits, readiness and liveness probes, a `securityContext` (non-root, read-only root filesystem where possible). Never the `latest` tag.
- **Terraform:** remote state with locking, no hardcoded credentials, variables for anything that differs between environments.

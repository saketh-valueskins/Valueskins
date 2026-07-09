# ValueSkins

**Creator-Brand Deal Platform**

## Environments

| Environment | Frontend | Marketplace | Backend API | Status |
|---|---|---|---|---|
| **Production** | [valueskins.com](https://valueskins.com) | [marketplace.valueskins.com](https://marketplace.valueskins.com) | [api.valueskins.com](https://api.valueskins.com) | ![Production](https://img.shields.io/github/deployments/redleg789/Valueskins---final-/production?label=prod&style=flat-square) |
| **Staging** | [staging.valueskins.com](https://staging.valueskins.com) | [staging-marketplace.valueskins.com](https://staging-marketplace.valueskins.com) | [api-staging.valueskins.com](https://api-staging.valueskins.com) | ![Staging](https://img.shields.io/github/deployments/redleg789/Valueskins---final-/staging?label=staging&style=flat-square) |
| **CI** | | | | ![CI](https://img.shields.io/github/actions/workflow/status/redleg789/Valueskins---final-/ci.yml?label=CI&style=flat-square) |
| **Latest Release** | | | | ![Release](https://img.shields.io/github/v/release/redleg789/Valueskins---final-?style=flat-square) |

## Deployment Flow

```
PR (feature) ──▶ develop (staging) ──▶ main (production)
     │                  │                    │
  Preview            Auto-deploy         Approval gate
  URL in PR          to staging          + auto-deploy
  comment            env                 to production
```

See [ENVIRONMENTS.md](./ENVIRONMENTS.md) for full details.

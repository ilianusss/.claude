import { describe, expect, test } from 'claude-code/testing'

import { riskyReason } from '../src/safety'
import { engineBeneath } from './engine'

const RISKY = [
  'git push',
  'git push --force origin main',
  'rtk git push origin feat/x',
  'cd app && git push',
  'git -C ../other push',
  'git -c user.name=x push',
  'FOO=1 git push',
  'git reset --hard HEAD~1',
  'git clean -fd',
  'git checkout -- src/a.ts',
  'git checkout main',
  'git restore src/a.ts',
  'git stash',
  'git stash pop',
  'git switch main',
  'git branch -D old',
  'git branch --delete --force old',
  'rm -rf build',
  'rm -fr build',
  'rm -r -f build',
  'rm --recursive --force build',
  'sudo rm -rf /tmp/x',
  'terraform apply',
  'terraform destroy -auto-approve',
  'terraform state rm aws_s3_bucket.b',
  'tofu apply',
  'kubectl apply -f deploy.yaml',
  'kubectl -n prod delete pod api-1',
  'kubectl --context prod rollout restart deploy/api',
  'rtk kubectl apply -f deploy.yaml',
  'helm upgrade api ./chart',
  'helm uninstall api',
  'docker system prune -a',
  'docker volume rm data',
  'docker compose down -v',
  'gh pr merge 12 --squash',
  'gh release create v1.0.0',
  'gh repo delete me/x',
  'npm publish',
  'pnpm publish',
  'cargo publish',
  'dropdb app',
]

const SAFE = [
  'git status',
  'rtk git status',
  'git log --oneline -n5',
  'git diff HEAD',
  'git stash list',
  'git restore --staged src/a.ts',
  'git clean -n',
  'git branch -d merged',
  'rm notes.txt',
  'terraform plan',
  'terraform state list',
  'kubectl get pods -n prod',
  'kubectl rollout status deploy/api',
  'helm list -A',
  'helm template api ./chart',
  'docker compose down',
  'gh pr view 12',
  'gh release list',
  'npm test',
  'echo "git push"',
  'grep -rn "rm -rf" scripts',
]

describe('riskyReason', () => {
  for (const command of RISKY) {
    test(`asks for: ${command}`, () => {
      expect(riskyReason(command)).toBeDefined()
    })
  }

  for (const command of SAFE) {
    test(`stays quiet for: ${command}`, () => {
      expect(riskyReason(command)).toBeUndefined()
    })
  }
})

describe('the permission check', () => {
  test('a risky command the settings rules miss asks the person', async ($, on) => {
    engineBeneath(on)
    const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'git -C ../other push' } })
    expect(verdict).toMatchObject({ decision: 'ask' })
    expect(verdict.reason).toContain('git -C ../other push')
  })

  test('a safe command keeps the verdict from beneath', async ($, on) => {
    engineBeneath(on)
    const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'git status' } })
    expect(verdict.decision).toBe('allow')
  })

  test('a command Claude wants to run outside the sandbox asks the person', async ($, on) => {
    engineBeneath(on)
    const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'npm install', dangerouslyDisableSandbox: true } })
    expect(verdict).toMatchObject({ decision: 'ask' })
    expect(verdict.reason).toContain('sandbox')
  })

  test('a deny from beneath stays a deny', async ($, on) => {
    engineBeneath(on, { verdict: 'deny' })
    const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'git push' } })
    expect(verdict.decision).toBe('deny')
  })
})

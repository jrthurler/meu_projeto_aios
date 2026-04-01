# Squad Creator Pro — Installed Commands

**Version**: 3.1.0
**Installed**: 2026-03-31
**Slash Prefix**: `squadCreator`

## Available Agents

- `/squadCreator:agents:squad-chief` — Squad Chief Orchestrator (entry agent, triage & routing)
- `/squadCreator:agents:oalanicolas` — Oalanicolas (Knowledge Architect, Research & DNA Extraction)
- `/squadCreator:agents:pedro-valerio` — Pedro Valério (Process Absolutist & Automation Architect)
- `/squadCreator:agents:thiago_finch` — Thiago Finch (Business Strategy & Marketing Architect)

## Usage

### Activate an agent:
```
/squadCreator:agents:squad-chief
/squadCreator:agents:oalanicolas
/squadCreator:agents:pedro-valerio
/squadCreator:agents:thiago_finch
```

### Typical entry point:
```
/squadCreator:agents:squad-chief
```
The Squad Chief will triage your request and route to the right specialist.

## Features (Pro v3.1.0)

- **Mind Cloning** — Clone real expert minds via DNA extraction (`@oalanicolas`)
- **Process Automation** — Veto conditions, workflow validation (`@pedro-valerio`)
- **Business Strategy** — Funnel analysis, ROI, go-to-market (`@thiago_finch`)
- **Advanced Creation** — Squad fusion, parallel discovery, deconstruct
- **Optimization** — Axioma assessment, find-0.8
- **Quality Gates** — Audit, modernization score, workspace hardening
- **Model Routing** — Intelligent model selection per task complexity

## Documentation

- **Squad README**: `squads/squad-creator-pro/README.md`
- **Changelog**: `squads/squad-creator-pro/CHANGELOG.md`
- **Agent Definitions**: `squads/squad-creator-pro/agents/`
- **Task Workflows**: `squads/squad-creator-pro/tasks/` (55 tasks)

## Uninstall

```bash
rm -rf .claude/commands/squadCreator
```

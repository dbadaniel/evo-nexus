# EvoNexus Plugin Contract

This document describes the plugin.yaml schema for EvoNexus plugins, including capabilities, validated fields, and host-enforced contracts.

For a practical authoring guide with examples and checklist, see [`docs/guides/building-plugins.md`](guides/building-plugins.md).

---

## plugin.yaml — Top-Level Fields

```yaml
schema_version: "1.0"       # required; must be "1.0"
name: string                 # human-readable name
slug: string                 # kebab-case identifier; unique across plugins
command_prefix: string       # optional public slash-command namespace, unique across plugins
version: string              # semver
description: string
author: string
capabilities:                # list of declared capabilities (see below)
  - capability_name
```

---

## Capabilities

A capability must be declared in `capabilities:` before the corresponding block is used. Unknown capabilities are rejected at install time.

| Capability | Enum value | Purpose |
|---|---|---|
| `readonly_data` | `readonly_data` | Expose plugin data to agent queries |
| `custom_tools` | `custom_tools` | Register callable tools on agents |
| `public_pages` | `public_pages` | Token-gated public web pages served by host |
| `safe_uninstall` | `safe_uninstall` | 3-step uninstall wizard with data preservation |

---

## `agents` - Agent Files And Display Metadata

Plugins may declare agent markdown files and optional display metadata. The agent command and internal slug remain namespaced by the host, but `label`/`display_name` controls the title shown in the Agents UI.

Plugins may also declare a public command namespace with top-level `command_prefix`. When present, EvoNexus generates friendly slash-command aliases for plugin agents using:

```text
/<command_prefix>-<agents[].command_name or agent file name>
```

```yaml
command_prefix: turbo

agents:
  - file: agents/copywriter.md
    display_name: "Copywriter Turbo"
    command_name: copywriter          # optional; defaults to file stem
    category: lpsg
    category_label: "Turbo Lancamento pago"
    icon: PenTool
    color: "#FF5C00"

  - file: agents/estrategista-turbo.md
    label: "Estrategista Turbo"      # optional display title
    category: lpsg
    category_label: "Turbo Lancamento pago"
    icon: Compass
    color: "#FF5C00"
```

In the example above, EvoNexus creates `/turbo-copywriter`, which resolves internally to the canonical agent `plugin-<plugin-slug>-copywriter`. For `estrategista-turbo.md`, because `command_name` is omitted, the generated alias is `/turbo-estrategista-turbo`.

If `label`/`display_name` is omitted, EvoNexus derives the visible title from the file name (`estrategista-turbo.md` -> `Estrategista Turbo`). The internal command remains `/plugin-<plugin-slug>-<agent-file-slug>`.

Rules:

1. `command_prefix` and `agents[].command_name` must be kebab-case: lowercase letters, digits, and hyphens; they must start and end with an alphanumeric character.
2. `command_prefix` must be unique across installed plugins. Install/update fails on conflict.
3. `agents[].command_name` must be unique within a plugin when `command_prefix` is present.
4. Generated aliases must not conflict with native commands or existing command files. Install/update fails on conflict.
5. Disabling a plugin disables its generated command aliases. Uninstall removes them.
6. The namespaced internal command remains the source of truth for install/update/uninstall, permissions, and auditing.

---

## `ui_entry_points` - Dashboard Pages And Sidebar Groups

Plugins may declare dashboard pages and sidebar groups. Sidebar groups are rendered only while the plugin is enabled and active.

```yaml
ui_entry_points:
  sidebar_groups:
    - id: lpsg
      label: "Plugins"
      position: "after:operations"  # optional; defaults to "bottom"
      order: 10
      collapsible: true

  pages:
    - id: turbo-dashboard
      label: "Turbo Lancamento"
      path: dashboard
      bundle: ui/pages/dashboard.js
      custom_element_name: turbo-dashboard-page
      sidebar_group: lpsg
      icon: Rocket
      order: 10
```

Supported `sidebar_groups[].position` values:

| Value | Placement |
|---|---|
| `after:main` | After the native Main group |
| `after:operations` | After the native Operations group |
| `after:data` | After the native Data group |
| `after:system` | After the native System group |
| `after:admin` | After the native Admin group |
| `bottom` | After native groups and positioned plugin groups |

`order` sorts multiple plugin groups within the same `position` bucket. When `position` is omitted, the dashboard keeps the legacy behavior and renders the plugin group at `bottom`.

---

## `public_pages` — Token-Gated Public Pages

Requires `capabilities: [public_pages]`.

```yaml
public_pages:
  - id: string                       # unique within this plugin
    description: string
    route_prefix: string             # e.g. "orders"; becomes /p/<slug>/orders/<token>
    token_source:
      table: string                  # must start with <slug>_ (snake_case)
      column: string                 # column holding the access token (snake_case)
    bundle: string                   # must start with ui/public/
    custom_element_name: string      # e.g. "my-plugin-orders"
    auth_mode: token                 # only "token" supported in v1
    rate_limit_per_ip: string        # e.g. "60/minute"
    audit_action: string             # logged per request
```

### Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/p/<slug>/<prefix>/<token>` | Serve the HTML bundle (portal entry) |
| `GET` | `/p/<slug>/<prefix>/<token>/data` | Run a `public_via`-tagged readonly query |
| `GET` | `/p/<slug>/<prefix>/<token>/public-assets/<path>` | Serve static assets from `ui/public/` |

All three endpoints:
1. Validate the token parametrically against `token_source.table/column` (SQL: `SELECT 1 FROM <table> WHERE <column> = ?`)
2. Apply rate limiting (60 req/min on portal, 120 req/min on data)
3. Emit security headers (CSP, X-Content-Type-Options, Referrer-Policy, HSTS)
4. Write an audit log row

### Linking a `readonly_data` query to a public page

```yaml
readonly_data:
  queries:
    - name: order_summary
      sql: "SELECT id, status, total FROM nutri_orders WHERE id = :order_id"
      public_via: orders          # id of the public_page above
      bind_token_param: order_id  # parameter name that receives the token value
```

`public_via` must reference a declared `public_pages[].id`. When set, `bind_token_param` is required; the validated token value is injected at query time.

---

## `safe_uninstall` — 3-Step Uninstall Wizard

Requires `capabilities: [safe_uninstall]`.

```yaml
safe_uninstall:
  enabled: bool                     # true = enforce wizard; false = legacy confirm()
  block_uninstall: bool             # if true, uninstall is unconditionally blocked (409)
  reason: string                    # displayed in wizard Step 1 (regulatory context)

  user_confirmation:
    checkbox_label: string          # Step 1 checkbox text
    typed_phrase: string            # Step 3 required phrase (exact match)

  pre_uninstall_hook:
    script: string                  # relative path inside plugin dir (e.g. scripts/export.py)
    output_dir: string              # where the export lands (relative to plugin dir)
    timeout_seconds: int            # 1–600
    must_produce_file: bool         # if true, fail if output_dir is empty after hook

  preserved_tables:                 # tables to rename rather than drop
    - <slug>_tablename              # must be prefixed with <slug>_

  preserved_host_entities:          # host-managed tables with partial row preservation
    host_table_name:
      "SQL condition for rows to KEEP"
                                    # rows matching NOT (condition) are deleted

  block_uninstall: false
```

### Host enforcement

When `enabled: true`:

1. **Admin role required** — non-admin users receive 403.
2. **Confirmation phrase** — `DELETE /api/plugins/<slug>` body must include `confirmation_phrase` matching `user_confirmation.typed_phrase`.
3. **Export verification** — `exported_at` path must be provided and the file must exist.
4. **ZIP password** — `zip_password` must be present (forwarded to pre-uninstall hook if configured).
5. **Pre-uninstall hook** — if configured, runs in a sandboxed subprocess with no secret env vars (only `PLUGIN_SLUG`, `PLUGIN_VERSION`, `OUTPUT_DIR`, `DB_READONLY_PATH`). Hook failure aborts uninstall.
6. **Preserved tables** — tables listed in `preserved_tables` are renamed to `_orphan_<slug>_<tablename>` and recorded in `plugin_orphans`. They are **not dropped**.
7. **Cascade-DELETE filtering** — for tables listed in `preserved_host_entities`, only rows NOT matching the preservation condition are deleted.

### Force-uninstall escape hatch

Setting `EVONEXUS_ALLOW_FORCE_UNINSTALL=1` in the host environment bypasses all safe_uninstall checks. Every force-uninstall is logged as `plugin_uninstall_force` in the audit table with the acting user's identity. This flag is intended for emergency recovery only.

### Reinstall after safe_uninstall

On reinstall of a plugin with orphaned tables:

1. Host checks `plugin_orphans` for unrecovered rows.
2. If present, compares `tarball_sha256` of the incoming tarball against `original_sha256` recorded at uninstall time.
3. SHA256 mismatch → install blocked unless request includes `confirmed_sha256_change: true` (explicit operator acknowledgment).
4. On SHA256 match (or explicit override): orphan tables are renamed back (`_orphan_<slug>_<table>` → `<table>`) before install.sql runs.

### `plugin_orphans` table (host-managed)

```sql
CREATE TABLE plugin_orphans (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    tablename TEXT NOT NULL,        -- original name (before _orphan_ prefix)
    orphaned_at TEXT NOT NULL,
    orphaned_by_user_id INTEGER,
    original_plugin_version TEXT,
    original_sha256 TEXT,
    original_publisher_url TEXT,
    recovered_at TEXT,              -- NULL until reinstall recovery
    UNIQUE(slug, tablename)
);
```

---

## Security Notes

- Plugin SQL identifiers (`table`, `column`) are validated at install time against `^[a-z][a-z0-9_]*$`. The host never interpolates untrusted input into SQL identifiers.
- Token values in public-page routes are always bound as SQL parameters (`?`), never interpolated.
- Pre-uninstall hooks run with a read-only DB copy; no write access and no secret env vars.
- SQL in `readonly_data.queries` must not reference `_orphan_*` tables (rejected at install via schema validator).
- Rate limiting is applied at the IP level on all public endpoints (flask-limiter, in-memory storage, single-process).

---

## `dependencies` - Auto-Installed Runtime Packages

Plugins may declare Python packages that EvoNexus installs automatically during plugin install, plugin update, and backend startup. Startup reconciliation lets Docker containers recreate ephemeral runtime packages after an image/container restart.

Preferred shape:

```yaml
dependencies:
  python:
    packages:
      python-docx: ">=1.1,<2"
      pyyaml: ">=6.0"
```

Backward-compatible flat shape is also accepted:

```yaml
dependencies:
  python-docx: ">=1.1,<2"
```

Rules:

1. EvoNexus installs Python packages with `uv pip install --python <runtime-python>` when `uv` is available, otherwise with `python -m pip install`.
2. Dependency install failure blocks a new install/update. On backend startup, failure marks the existing plugin as `broken` with `last_error`.
3. Uninstall does not remove Python packages, because another plugin may use the same package.
4. Only package names and version specifiers are accepted. Arbitrary shell commands are not supported.

---

## `prerequisites` - External Requirements And Operator Warnings

Use prerequisites for things EvoNexus should not install automatically, such as external MCP servers, CLI tools, credentials, or manual setup steps. Missing required prerequisites do not uninstall or disable the plugin; they are surfaced in the plugin UI as attention items.

```yaml
prerequisites:
  - id: google-mcp
    type: mcp
    name: google
    label: "Google MCP"
    required: true
    instructions: "Configure the Google MCP server before using document import."

  - id: google-credentials
    type: env
    key: GOOGLE_APPLICATION_CREDENTIALS
    label: "Google credentials"
    required: true
```

Supported `type` values:

| Type | Required field | Check |
|---|---|---|
| `env` | `key` | Environment variable exists |
| `mcp` / `external_mcp` | `name` | MCP name exists in `.claude.json` |
| `cli` | `name` | CLI executable is available on `PATH` |
| `manual` | none | Always shown as an operator/manual prerequisite |

---

## Changelog

| Version | Change |
|---|---|
| v1.0.0 | Initial contract: `readonly_data`, `custom_tools` |
| v1.1.0 | Added `public_pages` (B2) and `safe_uninstall` (B3) capabilities |

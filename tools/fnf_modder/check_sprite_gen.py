#!/usr/bin/env python3
"""Read-only preflight for the optional sprite-gen character-art pipeline.

This tool does not generate assets, change credentials, or modify a mod folder.
It checks whether sprite-gen is installed and asks its documented read-only
workflow command what is currently needed for a sprite run.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


def resolve_cli(explicit: str | None) -> str | None:
    candidate = explicit or os.environ.get("SPRITE_GEN_BIN")
    if candidate:
        path = Path(candidate).expanduser()
        if path.is_file():
            return str(path.resolve())
        found = shutil.which(candidate)
        return found
    return shutil.which("sprite-gen")


def run_command(command: list[str], timeout: int) -> tuple[int | None, str, str]:
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return None, "", f"Timed out after {timeout} seconds"
    except OSError as exc:
        return None, "", str(exc)


def safe_workflow_summary(raw: str) -> dict[str, Any]:
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return {"parse_error": "workflow output was not valid JSON"}
    if not isinstance(payload, dict):
        return {"parse_error": "workflow output was not a JSON object"}
    # Keep only decision-relevant fields; never copy arbitrary environment data.
    summary: dict[str, Any] = {}
    for key in ("status", "questions", "blockers", "pipeline", "settings_revision"):
        if key in payload:
            summary[key] = payload[key]
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Check optional sprite-gen readiness for FNF character assets.")
    parser.add_argument("--sprite-gen", help="Path to sprite-gen executable; defaults to PATH or SPRITE_GEN_BIN.")
    parser.add_argument("--timeout", type=int, default=30, help="Per-command timeout in seconds (default: 30).")
    parser.add_argument("--out", type=Path, help="Optional JSON report path.")
    args = parser.parse_args()

    report: dict[str, Any] = {
        "tool": "fnf-sprite-gen-preflight",
        "schema_version": 1,
        "read_only": True,
        "does_generate_assets": False,
        "does_modify_mod_folder": False,
        "target_engine": "Psych Engine 0.6.3",
        "sprite_gen": {"status": "not-installed"},
    }

    cli = resolve_cli(args.sprite_gen)
    if not cli:
        report["sprite_gen"]["message"] = (
            "sprite-gen executable was not found. Install it separately or pass --sprite-gen."
        )
        return write_report(report, args.out, 2)

    report["sprite_gen"]["executable"] = cli
    help_code, help_out, help_err = run_command([cli, "--help"], args.timeout)
    if help_code != 0:
        report["sprite_gen"].update({
            "status": "error",
            "message": "sprite-gen --help failed",
            "exit_code": help_code,
            "stderr_tail": help_err[-1200:],
        })
        return write_report(report, args.out, 3)

    workflow_code, workflow_out, workflow_err = run_command(
        [cli, "workflow", "--kind", "sprite"], args.timeout
    )
    if workflow_code is None:
        report["sprite_gen"].update({
            "status": "error",
            "message": "sprite workflow preflight timed out",
            "stderr_tail": workflow_err[-1200:],
        })
        return write_report(report, args.out, 3)

    summary = safe_workflow_summary(workflow_out)
    if "parse_error" in summary:
        report["sprite_gen"].update({
            "status": "error",
            "message": summary["parse_error"],
            "exit_code": workflow_code,
            "stderr_tail": workflow_err[-1200:],
        })
        return write_report(report, args.out, 3)

    status = summary.get("status", "unknown")
    report["sprite_gen"].update({
        "status": status,
        "workflow_exit_code": workflow_code,
        "workflow": summary,
    })
    if workflow_err.strip():
        report["sprite_gen"]["stderr_tail"] = workflow_err[-1200:]

    if status == "ready":
        report["integration_note"] = (
            "sprite-gen reports that its sprite workflow is ready. Generation is still a separate, "
            "explicit step. Its atlas/manifest must be inspected and converted to Psych Engine 0.6.3 "
            "character assets before export; this preflight does not perform that conversion."
        )
        return write_report(report, args.out, 0)
    if status == "needs-input":
        return write_report(report, args.out, 1)
    if status == "blocked":
        return write_report(report, args.out, 2)
    return write_report(report, args.out, 3)


def write_report(report: dict[str, Any], output: Path | None, exit_code: int) -> int:
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if output:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())

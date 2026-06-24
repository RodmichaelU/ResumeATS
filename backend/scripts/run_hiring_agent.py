"""
Subprocess entrypoint that runs a resume PDF through hiring-agent's unmodified
scoring pipeline and writes the result as JSON.

This script is NOT part of the vendored hiring-agent submodule — it lives in our
own repo and composes hiring-agent's public classes/functions exactly the way
hiring-agent's own `score.py main()` does, but:
  - emits progress markers on stderr so the caller can show real stage progress
  - skips score.py's CSV/JSON-cache side effects (which only exist inside main())
  - captures the flattened resume text so it can be reused by our JD-match scorer
    without re-parsing the PDF a second time

Usage: python run_hiring_agent.py --pdf <path> --out <result.json path> --hiring-agent-dir <path>
"""

import argparse
import json
import sys


def emit_stage(stage: str) -> None:
    print(f"##STAGE## {stage}", file=sys.stderr, flush=True)


def fail(message: str) -> None:
    print(f"##ERROR## {message}", file=sys.stderr, flush=True)
    sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--hiring-agent-dir", required=True)
    args = parser.parse_args()

    sys.path.insert(0, args.hiring_agent_dir)

    try:
        from pdf import PDFHandler
        from github import fetch_and_display_github_info
        from evaluator import ResumeEvaluator
        from transform import convert_json_resume_to_text, convert_github_data_to_text
        from prompt import DEFAULT_MODEL, MODEL_PARAMETERS
    except ImportError as exc:
        fail(f"Could not import hiring-agent modules from {args.hiring_agent_dir}: {exc}")
        return

    emit_stage("parsing_resume")
    try:
        resume_data = PDFHandler().extract_json_from_pdf(args.pdf)
    except Exception as exc:  # hiring-agent's own extraction failures
        fail(f"Resume parsing failed: {exc}")
        return

    if resume_data is None:
        fail("Resume parsing failed: no data could be extracted from the PDF")
        return

    github_data: dict = {}
    profiles = (resume_data.basics.profiles or []) if resume_data.basics else []
    github_profile = next(
        (p for p in profiles if (p.network or "").lower() == "github"), None
    )
    if github_profile:
        emit_stage("fetching_github")
        try:
            github_data = fetch_and_display_github_info(github_profile.url)
        except Exception as exc:
            # GitHub enrichment is a bonus signal, not essential — keep going without it.
            print(f"##WARN## GitHub enrichment failed: {exc}", file=sys.stderr, flush=True)
            github_data = {}

    emit_stage("scoring_ats")
    resume_text = convert_json_resume_to_text(resume_data)
    if github_data:
        resume_text += convert_github_data_to_text(github_data)

    try:
        evaluator = ResumeEvaluator(
            model_name=DEFAULT_MODEL, model_params=MODEL_PARAMETERS.get(DEFAULT_MODEL)
        )
        evaluation = evaluator.evaluate_resume(resume_text)
    except Exception as exc:
        fail(f"ATS evaluation failed: {exc}")
        return

    candidate_name = None
    if resume_data.basics and resume_data.basics.name:
        candidate_name = resume_data.basics.name

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(
            {
                "evaluation": evaluation.model_dump(),
                "resume_text": resume_text,
                "candidate_name": candidate_name,
            },
            f,
        )


if __name__ == "__main__":
    main()

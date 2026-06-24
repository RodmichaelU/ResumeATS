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
        from models import Basics, JSONResume
    except ImportError as exc:
        fail(f"Could not import hiring-agent modules from {args.hiring_agent_dir}: {exc}")
        return

    emit_stage("parsing_resume")
    try:
        pdf_handler = PDFHandler()
        text_content = pdf_handler.extract_text_from_pdf(args.pdf)
    except Exception as exc:
        fail(f"Resume parsing failed: {exc}")
        return

    if not text_content:
        fail("Resume parsing failed: no text could be extracted from the PDF")
        return

    # hiring-agent's own extract_json_from_pdf() aborts the ENTIRE resume if even one
    # section's LLM call comes back empty (small local models occasionally return "{}"
    # for a single section while every other section extracts fine). We retry once per
    # section and otherwise degrade gracefully -- skipping just that section instead of
    # failing the whole evaluation -- using hiring-agent's own unmodified per-section
    # extractor methods (the same ones its _extract_all_sections_separately calls).
    section_extractors = [
        ("basics", pdf_handler.extract_basics_section),
        ("work", pdf_handler.extract_work_section),
        ("education", pdf_handler.extract_education_section),
        ("skills", pdf_handler.extract_skills_section),
        ("projects", pdf_handler.extract_projects_section),
        ("awards", pdf_handler.extract_awards_section),
    ]

    complete_resume = {
        "basics": None,
        "work": None,
        "volunteer": None,
        "education": None,
        "awards": None,
        "certificates": None,
        "publications": None,
        "skills": None,
        "languages": None,
        "interests": None,
        "references": None,
        "projects": None,
        "meta": None,
    }

    for section_name, extractor in section_extractors:
        section_data = extractor(text_content) or extractor(text_content)
        if section_data:
            complete_resume.update(section_data)
        else:
            print(
                f"##WARN## {section_name} section could not be extracted after retry, continuing without it",
                file=sys.stderr,
                flush=True,
            )

    if not any(v for key, v in complete_resume.items() if key != "meta"):
        fail("Resume parsing failed: no data could be extracted from the PDF")
        return

    if complete_resume.get("basics") and isinstance(complete_resume["basics"], dict):
        try:
            complete_resume["basics"] = Basics(**complete_resume["basics"])
        except Exception as exc:
            print(f"##WARN## Could not build basics object: {exc}", file=sys.stderr, flush=True)
            complete_resume["basics"] = None

    try:
        resume_data = JSONResume(**complete_resume)
    except Exception as exc:
        fail(f"Resume parsing failed: {exc}")
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

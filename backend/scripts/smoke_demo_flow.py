from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.core.database import SessionLocal
from app.main import app
from app.models.report import Report
from app.models.volunteer import VolunteerPlan, VolunteerPlanItem
from scripts.seed_demo_data import main as seed_demo_data


def main() -> None:
    seed_demo_data()
    plan_id: int | None = None
    report_id: int | None = None

    try:
        with TestClient(app) as client:
            token = _login(client)
            headers = {"Authorization": f"Bearer {token}"}

            recommendation = _generate_recommendations(client, headers)
            plan = _save_plan(client, headers, recommendation)
            plan_id = int(plan["id"])

            _check_plan(client, headers, plan_id)
            _export_plan(client, headers, plan_id)

            report = _generate_report(client, headers, plan_id)
            report_id = int(report["id"])
            _export_report(client, headers, report_id)

            citations = report["content_json"]["policy_citations"]
            print(
                "Smoke OK: "
                f"recommendations={len(recommendation['items'])}, "
                f"plan_items={len(plan['items'])}, "
                f"citations={len(citations)}"
            )
    finally:
        _cleanup(plan_id=plan_id, report_id=report_id)


def _login(client: TestClient) -> str:
    response = client.post("/api/auth/login", json={"username": "student", "password": "123456"})
    _assert_response(response, 200, "login")
    token = response.json().get("access_token")
    _assert(token, "login response must include access_token")
    return str(token)


def _generate_recommendations(client: TestClient, headers: dict[str, str]) -> dict:
    response = client.post(
        "/api/recommendations/generate",
        json={"limit": 5, "only_eligible": True},
        headers=headers,
    )
    _assert_response(response, 200, "generate recommendations")
    payload = response.json()
    _assert(payload.get("batch"), "recommendation response must include batch")
    _assert(len(payload.get("items", [])) >= 3, "recommendation response must include at least 3 items")
    return payload


def _save_plan(client: TestClient, headers: dict[str, str], recommendation: dict) -> dict:
    items = recommendation["items"][:3]
    response = client.put(
        "/api/volunteer/plans/current",
        json={
            "title": "Local smoke demo plan",
            "batch": recommendation["batch"],
            "source": "demo_smoke",
            "metadata": {"data_version": "local-demo-smoke"},
            "items": [
                {
                    "group_id": item["group_id"],
                    "order": index + 1,
                    "risk_level": item["risk_level"],
                    "match_score": item["match_score"],
                    "snapshot": item,
                }
                for index, item in enumerate(items)
            ],
        },
        headers=headers,
    )
    _assert_response(response, 200, "save volunteer plan")
    payload = response.json()
    _assert(payload.get("id"), "saved plan must include id")
    _assert(len(payload.get("items", [])) == 3, "saved plan must include 3 items")
    return payload


def _check_plan(client: TestClient, headers: dict[str, str], plan_id: int) -> None:
    response = client.post(f"/api/volunteer/plans/{plan_id}/check", headers=headers)
    _assert_response(response, 200, "check volunteer plan")
    payload = response.json()
    _assert(payload.get("policy_result"), "plan check response must include policy_result")


def _export_plan(client: TestClient, headers: dict[str, str], plan_id: int) -> None:
    response = client.get(f"/api/volunteer/plans/{plan_id}/export", headers=headers)
    _assert_response(response, 200, "export volunteer plan")
    payload = response.json()
    _assert(payload.get("item_count") == 3, "plan export must include 3 items")


def _generate_report(client: TestClient, headers: dict[str, str], plan_id: int) -> dict:
    response = client.post("/api/reports/generate", json={"plan_id": plan_id}, headers=headers)
    _assert_response(response, 200, "generate report")
    payload = response.json()
    citations = payload.get("content_json", {}).get("policy_citations", [])
    _assert(citations, "report must include policy citations")
    _assert(
        any(citation.get("document_id") for citation in citations if isinstance(citation, dict)),
        "report must cite a published knowledge document",
    )
    return payload


def _export_report(client: TestClient, headers: dict[str, str], report_id: int) -> None:
    response = client.get(f"/api/reports/{report_id}/export", headers=headers)
    _assert_response(response, 200, "export report")
    _assert(
        response.headers.get("content-disposition"),
        "report export must include content-disposition header",
    )


def _cleanup(plan_id: int | None, report_id: int | None) -> None:
    with SessionLocal() as db:
        if report_id is not None:
            db.execute(delete(Report).where(Report.id == report_id))
        if plan_id is not None:
            db.execute(delete(VolunteerPlanItem).where(VolunteerPlanItem.plan_id == plan_id))
            db.execute(delete(VolunteerPlan).where(VolunteerPlan.id == plan_id))
        db.commit()


def _assert_response(response, expected_status: int, label: str) -> None:
    if response.status_code != expected_status:
        raise AssertionError(f"{label} failed: {response.status_code} {response.text}")


def _assert(condition, message: str) -> None:
    if not condition:
        raise AssertionError(message)


if __name__ == "__main__":
    main()

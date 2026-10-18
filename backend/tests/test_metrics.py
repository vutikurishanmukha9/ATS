import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_metrics_empty_database(client: AsyncClient, auth_headers: dict):
    res = await client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_candidates"] >= 0
    # If no decided candidates, hire_rate MUST be null, not 0!
    if (data["hired"] + data["rejected"]) == 0:
        assert data["hire_rate"] is None
        assert data["median_time_to_hire_days"] is None


@pytest.mark.asyncio
async def test_dashboard_metrics_with_decisions(client: AsyncClient, auth_headers: dict):
    # 1 hired candidate
    await client.post(
        "/api/v1/candidates",
        json={
            "full_name": "Metrics Hired",
            "email": "m_hired@example.com",
            "applied_role": "Lead",
            "initial_stage": "hired",
        },
        headers=auth_headers,
    )
    # 1 rejected candidate
    await client.post(
        "/api/v1/candidates",
        json={
            "full_name": "Metrics Rej",
            "email": "m_rej@example.com",
            "applied_role": "Lead",
            "initial_stage": "rejected",
        },
        headers=auth_headers,
    )
    # 1 active candidate
    await client.post(
        "/api/v1/candidates",
        json={
            "full_name": "Metrics Active",
            "email": "m_active@example.com",
            "applied_role": "Lead",
            "initial_stage": "interview",
        },
        headers=auth_headers,
    )

    summary_res = await client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert summary_res.status_code == 200
    s_data = summary_res.json()
    assert s_data["hired"] >= 1
    assert s_data["rejected"] >= 1
    assert s_data["hire_rate"] is not None

    # Funnel
    funnel_res = await client.get("/api/v1/dashboard/funnel", headers=auth_headers)
    assert funnel_res.status_code == 200
    stages = [f["stage"] for f in funnel_res.json()]
    assert "applied" in stages
    assert "hired" in stages
    assert "rejected" in stages

    # Timeseries
    ts_res = await client.get("/api/v1/dashboard/applications-timeseries?weeks=12", headers=auth_headers)
    assert ts_res.status_code == 200
    assert len(ts_res.json()) == 12

    # Sources
    sources_res = await client.get("/api/v1/dashboard/sources", headers=auth_headers)
    assert sources_res.status_code == 200

    # Stage durations
    dur_res = await client.get("/api/v1/dashboard/stage-durations", headers=auth_headers)
    assert dur_res.status_code == 200
    assert len(dur_res.json()) == 5

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_stage_transition_rules(client: AsyncClient, auth_headers: dict):
    # 1. Create candidate in 'applied'
    cand_res = await client.post(
        "/api/v1/candidates",
        json={
            "full_name": "Stage Test Candidate",
            "email": "stage.test@example.com",
            "applied_role": "QA Engineer",
            "source": "referral",
        },
        headers=auth_headers,
    )
    cand_id = cand_res.json()["id"]

    # 2. Move to same stage -> 422
    same_res = await client.post(
        f"/api/v1/candidates/{cand_id}/stage",
        json={"to_stage": "applied"},
        headers=auth_headers,
    )
    assert same_res.status_code == 422
    assert same_res.json()["error"]["code"] == "UNPROCESSABLE_ENTITY"

    # 3. Valid move between active stages: applied -> screening -> technical -> interview
    m1 = await client.post(
        f"/api/v1/candidates/{cand_id}/stage",
        json={"to_stage": "screening"},
        headers=auth_headers,
    )
    assert m1.status_code == 200
    assert m1.json()["current_stage"] == "screening"

    m2 = await client.post(
        f"/api/v1/candidates/{cand_id}/stage",
        json={"to_stage": "technical"},
        headers=auth_headers,
    )
    assert m2.status_code == 200
    assert m2.json()["current_stage"] == "technical"

    # 4. Move to terminal stage 'rejected'
    m_rej = await client.post(
        f"/api/v1/candidates/{cand_id}/stage",
        json={"to_stage": "rejected", "reason": "Failed coding challenge"},
        headers=auth_headers,
    )
    assert m_rej.status_code == 200
    assert m_rej.json()["current_stage"] == "rejected"

    # 5. Leaving terminal stage without reason -> 422
    reopen_no_reason = await client.post(
        f"/api/v1/candidates/{cand_id}/stage",
        json={"to_stage": "applied"},
        headers=auth_headers,
    )
    assert reopen_no_reason.status_code == 422
    assert "reason is required" in reopen_no_reason.json()["error"]["message"].lower()

    # 6. Leaving terminal stage with reason -> 200
    reopen_with_reason = await client.post(
        f"/api/v1/candidates/{cand_id}/stage",
        json={
            "to_stage": "screening",
            "reason": "Candidate provided updated portfolio and re-applied",
        },
        headers=auth_headers,
    )
    assert reopen_with_reason.status_code == 200
    assert reopen_with_reason.json()["current_stage"] == "screening"

    # 7. Verify audit history in events
    events_res = await client.get(f"/api/v1/candidates/{cand_id}/events", headers=auth_headers)
    assert events_res.status_code == 200
    events = events_res.json()
    assert len(events) >= 5

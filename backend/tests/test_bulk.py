import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_bulk_stage_move_success(client: AsyncClient, auth_headers: dict):
    # Create two candidates
    c1 = await client.post(
        "/api/v1/candidates",
        json={
            "full_name": "Bulk One",
            "email": "bulk1@example.com",
            "applied_role": "Analyst",
        },
        headers=auth_headers,
    )
    c2 = await client.post(
        "/api/v1/candidates",
        json={
            "full_name": "Bulk Two",
            "email": "bulk2@example.com",
            "applied_role": "Analyst",
        },
        headers=auth_headers,
    )
    ids = [c1.json()["id"], c2.json()["id"]]

    bulk_res = await client.post(
        "/api/v1/candidates/bulk/stage",
        json={
            "candidate_ids": ids,
            "to_stage": "interview",
            "reason": "Passed resume screen",
        },
        headers=auth_headers,
    )
    assert bulk_res.status_code == 200
    assert bulk_res.json()["updated_count"] == 2

    # Verify both are now in interview
    res1 = await client.get(f"/api/v1/candidates/{ids[0]}", headers=auth_headers)
    res2 = await client.get(f"/api/v1/candidates/{ids[1]}", headers=auth_headers)
    assert res1.json()["current_stage"] == "interview"
    assert res2.json()["current_stage"] == "interview"


@pytest.mark.asyncio
async def test_bulk_stage_move_atomicity_on_failure(client: AsyncClient, auth_headers: dict):
    # Candidate 3 is in 'applied', Candidate 4 is already in 'technical'
    c3 = await client.post(
        "/api/v1/candidates",
        json={
            "full_name": "Bulk Three",
            "email": "bulk3@example.com",
            "applied_role": "Developer",
        },
        headers=auth_headers,
    )
    c4 = await client.post(
        "/api/v1/candidates",
        json={
            "full_name": "Bulk Four",
            "email": "bulk4@example.com",
            "applied_role": "Developer",
            "initial_stage": "technical",
        },
        headers=auth_headers,
    )
    ids = [c3.json()["id"], c4.json()["id"]]

    # Attempt to bulk move both to 'technical'. Because c4 is already in 'technical', it must fail and roll back c3!
    bulk_res = await client.post(
        "/api/v1/candidates/bulk/stage",
        json={"candidate_ids": ids, "to_stage": "technical"},
        headers=auth_headers,
    )
    assert bulk_res.status_code == 422

    # Check that candidate 3 was NOT changed (remains 'applied')
    res3 = await client.get(f"/api/v1/candidates/{ids[0]}", headers=auth_headers)
    assert res3.json()["current_stage"] == "applied"

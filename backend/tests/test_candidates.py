import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_candidate_success(client: AsyncClient, auth_headers: dict):
    payload = {
        "full_name": "Jordan Smith",
        "email": "jordan.smith@example.com",
        "phone": "+1-555-0192",
        "location": "San Francisco, CA",
        "applied_role": "Senior Frontend Engineer",
        "source": "referral",
        "experience_years": 6.5,
        "skills": ["React", "TypeScript", "Tailwind CSS"],
        "initial_stage": "applied",
    }
    response = await client.post("/api/v1/candidates", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "Jordan Smith"
    assert data["email"] == "jordan.smith@example.com"
    assert data["current_stage"] == "applied"
    assert data["skills"] == ["React", "TypeScript", "Tailwind CSS"]

    # Verify initial stage event written
    candidate_id = data["id"]
    events_res = await client.get(f"/api/v1/candidates/{candidate_id}/events", headers=auth_headers)
    assert events_res.status_code == 200
    events = events_res.json()
    assert len(events) == 1
    assert events[0]["from_stage"] is None
    assert events[0]["to_stage"] == "applied"


@pytest.mark.asyncio
async def test_create_candidate_duplicate_email(client: AsyncClient, auth_headers: dict):
    payload = {
        "full_name": "Taylor Jones",
        "email": "taylor.unique@example.com",
        "applied_role": "Backend Engineer",
        "source": "linkedin",
        "skills": ["Python", "FastAPI"],
    }
    # First create
    res1 = await client.post("/api/v1/candidates", json=payload, headers=auth_headers)
    assert res1.status_code == 201
    orig_id = res1.json()["id"]

    # Duplicate create
    res2 = await client.post("/api/v1/candidates", json=payload, headers=auth_headers)
    assert res2.status_code == 409
    data = res2.json()
    assert data["error"]["code"] == "CONFLICT"
    assert data["error"]["details"]["existing_candidate_id"] == orig_id


@pytest.mark.asyncio
async def test_get_candidate_by_id(client: AsyncClient, auth_headers: dict):
    payload = {
        "full_name": "Morgan Davis",
        "email": "morgan.davis@example.com",
        "applied_role": "Product Designer",
        "source": "career_site",
        "skills": ["Figma", "Design Systems"],
    }
    create_res = await client.post("/api/v1/candidates", json=payload, headers=auth_headers)
    cand_id = create_res.json()["id"]

    res = await client.get(f"/api/v1/candidates/{cand_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["full_name"] == "Morgan Davis"


@pytest.mark.asyncio
async def test_update_candidate(client: AsyncClient, auth_headers: dict):
    payload = {
        "full_name": "Casey Miller",
        "email": "casey.miller@example.com",
        "applied_role": "DevOps Engineer",
        "source": "job_board",
        "skills": ["Docker", "Kubernetes"],
    }
    create_res = await client.post("/api/v1/candidates", json=payload, headers=auth_headers)
    cand_id = create_res.json()["id"]

    update_payload = {
        "experience_years": 8.0,
        "location": "New York, NY",
        "skills": ["Docker", "Kubernetes", "Terraform"],
    }
    update_res = await client.patch(f"/api/v1/candidates/{cand_id}", json=update_payload, headers=auth_headers)
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["experience_years"] == 8.0
    assert data["location"] == "New York, NY"
    assert "Terraform" in data["skills"]


@pytest.mark.asyncio
async def test_soft_delete_candidate(client: AsyncClient, auth_headers: dict):
    payload = {
        "full_name": "Riley Brown",
        "email": "riley.brown@example.com",
        "applied_role": "Data Analyst",
        "source": "other",
        "skills": ["SQL", "Python"],
    }
    create_res = await client.post("/api/v1/candidates", json=payload, headers=auth_headers)
    cand_id = create_res.json()["id"]

    del_res = await client.delete(f"/api/v1/candidates/{cand_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # Deleted candidate should not be returned in get or list
    get_res = await client.get(f"/api/v1/candidates/{cand_id}", headers=auth_headers)
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_candidate_filters_and_search(client: AsyncClient, auth_headers: dict):
    # Create candidates with distinct attributes
    c1 = {
        "full_name": "Alice Wonderland",
        "email": "alice.w@example.com",
        "applied_role": "Frontend Lead",
        "source": "referral",
        "skills": ["React", "CSS"],
    }
    c2 = {
        "full_name": "Bob Builder",
        "email": "bob.b@example.com",
        "applied_role": "Infrastructure Architect",
        "source": "agency",
        "skills": ["AWS", "Terraform"],
    }
    await client.post("/api/v1/candidates", json=c1, headers=auth_headers)
    await client.post("/api/v1/candidates", json=c2, headers=auth_headers)

    # Search query
    res_search = await client.get("/api/v1/candidates?q=Wonderland", headers=auth_headers)
    assert res_search.status_code == 200
    items = res_search.json()["items"]
    assert any(i["full_name"] == "Alice Wonderland" for i in items)

    # Filter by source
    res_source = await client.get("/api/v1/candidates?source=referral", headers=auth_headers)
    assert res_source.status_code == 200
    items_source = res_source.json()["items"]
    assert all(i["source"] == "referral" for i in items_source)


@pytest.mark.asyncio
async def test_facets_endpoint(client: AsyncClient, auth_headers: dict):
    res = await client.get("/api/v1/candidates/facets", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "roles" in data
    assert "sources" in data
    assert "skills" in data
    assert "stages" in data

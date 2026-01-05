import importlib
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

import src.app as app_module


@pytest.fixture
def client():
    # Reload module to reset in-memory state between tests
    importlib.reload(app_module)
    client = TestClient(app_module.app)
    return client


def test_get_activities_no_cache_header(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert resp.headers.get("Cache-Control") == "no-store"
    data = resp.json()
    assert "Chess Club" in data


def test_signup_and_unregister_flow(client):
    activity = "Basketball Team"
    email = "alice@mergington.edu"
    enc_activity = quote(activity, safe="")

    # Sign up
    resp = client.post(f"/activities/{enc_activity}/signup?email={quote(email, safe='')}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Verify present in GET
    get_resp = client.get("/activities")
    assert get_resp.status_code == 200
    assert email in get_resp.json()[activity]["participants"]

    # Unregister
    del_resp = client.delete(f"/activities/{enc_activity}/signup?email={quote(email, safe='')}")
    assert del_resp.status_code == 200
    assert "Unregistered" in del_resp.json().get("message", "")

    # Verify removed
    get_resp = client.get("/activities")
    assert email not in get_resp.json()[activity]["participants"]


def test_signup_already_signed(client):
    activity = "Chess Club"
    email = "michael@mergington.edu"
    enc_activity = quote(activity, safe="")

    resp = client.post(f"/activities/{enc_activity}/signup?email={quote(email, safe='')}")
    assert resp.status_code == 400


def test_unregister_not_signed(client):
    activity = "Basketball Team"
    email = "nobody@mergington.edu"
    enc_activity = quote(activity, safe="")

    resp = client.delete(f"/activities/{enc_activity}/signup?email={quote(email, safe='')}")
    assert resp.status_code == 400

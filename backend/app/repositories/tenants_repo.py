from app.repositories import json_store


def get_by_id(tenant_id: str) -> dict | None:
    for tenant in json_store.collection("tenants"):
        if tenant["id"] == tenant_id:
            return json_store.snapshot(tenant)
    return None


def get_by_domain(domain: str) -> dict | None:
    for tenant in json_store.collection("tenants"):
        if tenant["domain"] == domain:
            return json_store.snapshot(tenant)
    return None

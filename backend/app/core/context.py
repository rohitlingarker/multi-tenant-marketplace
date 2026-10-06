from dataclasses import dataclass


@dataclass(frozen=True)
class RequestContext:
    """What middleware resolved for this request. Passed down to services as a plain value."""

    tenant: dict | None
    user: dict | None

    @property
    def tenant_id(self) -> str | None:
        return self.tenant["id"] if self.tenant else None

    @property
    def user_id(self) -> str | None:
        return self.user["id"] if self.user else None

    @property
    def role(self) -> str | None:
        return self.user["role"] if self.user else None

    @property
    def vendor_id(self) -> str | None:
        return self.user.get("vendorId") if self.user else None

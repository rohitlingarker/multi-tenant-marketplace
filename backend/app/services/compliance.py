"""Listing compliance checks run at submission.

Each check takes the same CheckContext and returns a ComplianceError or None.
validate_listing() runs them in order and returns the first failure. To add a
rule, append a function to CHECKS; to add a credentialed category, add an entry
to CREDENTIAL_REQUIREMENTS.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable

from app.core.errors import ComplianceError
from app.models.enums import Category


@dataclass(frozen=True)
class CredentialRequirement:
    field: str
    error_code: str
    label: str


# Category -> vendor credential it requires. Categories not listed need none.
CREDENTIAL_REQUIREMENTS: dict[Category, CredentialRequirement] = {
    Category.RX: CredentialRequirement(
        "pharmacyLicenseExpiresAt", "RX_VENDOR_NOT_LICENSED", "pharmacy license"
    ),
    Category.DME: CredentialRequirement(
        "dmeCredentialExpiresAt", "DME_VENDOR_NOT_CREDENTIALED", "DME credential"
    ),
}


@dataclass(frozen=True)
class CheckContext:
    tenant: dict
    vendor: dict
    product: dict
    price_cents: int | float
    now: datetime


def check_category_allowed(ctx: CheckContext) -> ComplianceError | None:
    category = ctx.product["category"]
    if category not in ctx.tenant["allowedCategories"]:
        return ComplianceError(
            f"{ctx.tenant['name']} does not sell {category} products.",
            code="CATEGORY_NOT_ALLOWED",
        )
    return None


def check_price(ctx: CheckContext) -> ComplianceError | None:
    price = ctx.price_cents
    if isinstance(price, bool) or not isinstance(price, int) or price <= 0:
        return ComplianceError(
            "Price must be a whole number of cents greater than zero.",
            code="PRICE_INVALID",
        )
    return None


def check_vendor_credential(ctx: CheckContext) -> ComplianceError | None:
    requirement = CREDENTIAL_REQUIREMENTS.get(Category(ctx.product["category"]))
    if requirement is None:
        return None

    vendor_name = ctx.vendor["name"]
    expires_raw = ctx.vendor.get(requirement.field)
    if not expires_raw:
        return ComplianceError(
            f"{vendor_name} has no {requirement.label} on file.",
            code=requirement.error_code,
        )

    expires_at = datetime.fromisoformat(expires_raw)
    if expires_at <= ctx.now:
        return ComplianceError(
            f"{vendor_name}'s {requirement.label} expired on {expires_at:%Y-%m-%d}.",
            code=requirement.error_code,
        )
    return None


CHECKS: list[Callable[[CheckContext], ComplianceError | None]] = [
    check_category_allowed,
    check_price,
    check_vendor_credential,
]


def validate_listing(
    tenant: dict, vendor: dict, product: dict, price_cents: int | float
) -> ComplianceError | None:
    ctx = CheckContext(tenant, vendor, product, price_cents, datetime.now(timezone.utc))
    for check in CHECKS:
        error = check(ctx)
        if error:
            return error
    return None

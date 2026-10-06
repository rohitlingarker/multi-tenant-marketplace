"""Domain errors raised by services, plus the code -> HTTP status map used by the API layer."""


class DomainError(Exception):
    code = "DOMAIN_ERROR"

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code


class InvalidCredentials(DomainError):
    code = "INVALID_CREDENTIALS"

    def __init__(self):
        super().__init__("Invalid username or password.")


class TenantNotResolved(DomainError):
    code = "TENANT_NOT_RESOLVED"

    def __init__(self):
        super().__init__("Could not determine the store for this request.")


class Unauthenticated(DomainError):
    code = "UNAUTHENTICATED"

    def __init__(self):
        super().__init__("You must be logged in.")


class Forbidden(DomainError):
    code = "FORBIDDEN"

    def __init__(self, message: str = "You are not allowed to do this."):
        super().__init__(message)


class ProductNotFound(DomainError):
    code = "PRODUCT_NOT_FOUND"

    def __init__(self, sku: str):
        super().__init__(f"No product with SKU {sku}.")


class ListingNotFound(DomainError):
    code = "NOT_FOUND"

    def __init__(self, listing_id: str):
        super().__init__(f"No listing {listing_id} in this store.")


class InvalidStatusTransition(DomainError):
    code = "INVALID_STATUS_TRANSITION"

    def __init__(self, current: str, target: str):
        super().__init__(f"Cannot move a listing from {current} to {target}.")


class RejectionReasonRequired(DomainError):
    code = "REJECTION_REASON_REQUIRED"

    def __init__(self):
        super().__init__("A reason is required to reject a listing.")


class ComplianceError(DomainError):
    """Raised with one of the compliance codes (CATEGORY_NOT_ALLOWED, PRICE_INVALID, ...)."""


HTTP_STATUS_BY_CODE = {
    "TENANT_NOT_RESOLVED": 400,
    "INVALID_CREDENTIALS": 401,
    "UNAUTHENTICATED": 401,
    "FORBIDDEN": 403,
    "NOT_FOUND": 404,
    "PRODUCT_NOT_FOUND": 404,
    "INVALID_STATUS_TRANSITION": 409,
    "CATEGORY_NOT_ALLOWED": 422,
    "RX_VENDOR_NOT_LICENSED": 422,
    "DME_VENDOR_NOT_CREDENTIALED": 422,
    "PRICE_INVALID": 422,
    "REJECTION_REASON_REQUIRED": 422,
}


def http_status_for(code: str) -> int:
    return HTTP_STATUS_BY_CODE.get(code, 400)

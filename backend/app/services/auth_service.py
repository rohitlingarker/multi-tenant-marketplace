from app.core.errors import InvalidCredentials
from app.core.security import hash_password, verify_password
from app.repositories import users_repo

# Verified against when the username doesn't exist, so a miss costs the same
# time as a wrong password and response timing doesn't reveal valid usernames.
_DUMMY_HASH = hash_password("dummy-password")


def login(username: str, password: str) -> dict:
    user = users_repo.get_by_username(username)
    if user is None:
        verify_password(password, _DUMMY_HASH)
        raise InvalidCredentials()
    if not verify_password(password, user["passwordHash"]):
        raise InvalidCredentials()

    user.pop("passwordHash")
    return user

"""Authentication routes for login, logout, and user info."""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from autoglean.db.base import get_db
from autoglean.db.models import User
from autoglean.auth.schemas import LoginRequest, TokenResponse, UserResponse
from autoglean.auth.security import verify_password, create_access_token
from autoglean.auth.dependencies import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login endpoint - authenticate user and return JWT token.

    Args:
        login_data: Login credentials (email and password)
        db: Database session

    Returns:
        JWT access token

    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user by email
    user = db.query(User).filter(
        User.email == login_data.email,
        User.deleted_at == None
    ).first()

    # Verify user exists and password is correct
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Create JWT token
    access_token = create_access_token(data={"sub": str(user.id)})

    logger.info(f"User {user.email} logged in successfully")

    return TokenResponse(access_token=access_token)


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user)
):
    """
    Logout endpoint - client should discard the token.

    Note: With JWT, logout is handled client-side by removing the token.
    Server-side token revocation would require a token blacklist.

    Args:
        current_user: Currently authenticated user

    Returns:
        Success message
    """
    logger.info(f"User {current_user.email} logged out")

    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current user information.

    Args:
        current_user: Currently authenticated user

    Returns:
        User information
    """
    # Get department names
    from autoglean.db.models import Department
    department = db.query(Department).filter(Department.id == current_user.department_id).first()

    user_dict = {
        "id": current_user.id,
        "full_name_en": current_user.full_name_en,
        "full_name_ar": current_user.full_name_ar,
        "email": current_user.email,
        "department_id": current_user.department_id,
        "department_name_en": department.name_en if department else None,
        "department_name_ar": department.name_ar if department else None,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
    }

    return user_dict


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    search: str = Query(None, description="Search users by name or email"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all active users (for sharing extractors).

    Args:
        search: Optional search query
        current_user: Currently authenticated user
        db: Database session

    Returns:
        List of users
    """
    query = db.query(User).filter(
        User.is_active == True,
        User.deleted_at == None,
        User.id != current_user.id  # Exclude current user
    )

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.full_name_en.ilike(search_term)) |
            (User.full_name_ar.ilike(search_term)) |
            (User.email.ilike(search_term))
        )

    users = query.limit(50).all()
    return users

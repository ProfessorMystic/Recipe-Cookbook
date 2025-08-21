# backend/schemas.py
from typing import Optional  # 3.9-compatible optional types
from pydantic import BaseModel, Field

# Shared attributes for recipes
class RecipeBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)  # Must not be empty
    ingredients: str  # Ingredients in plain text
    instructions: str  # Instructions in plain text

# Schema for creating a new recipe
class RecipeCreate(RecipeBase):
    pass  # Inherits all fields from RecipeBase

# Schema for updating a recipe (all fields optional)
class RecipeUpdate(BaseModel):
    title: Optional[str] = None
    ingredients: Optional[str] = None
    instructions: Optional[str] = None

# Schema for sending recipe data back to client
class RecipeOut(RecipeBase):
    id: int  # Include ID when returning recipes

    class Config:
        orm_mode = True  # allow returning SQLAlchemy models directly

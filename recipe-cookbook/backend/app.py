# backend/app.py
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from db import Base, engine, get_db
from models import Recipe
from schemas import RecipeCreate, RecipeUpdate, RecipeOut

# Create database tables at startup (only for development).
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(title="Recipe Cookbook API", version="0.1.0")

# Allow frontend (HTML/JS) to make requests from another port (CORS setup).
# In dev, this is wide open ("*"). In production, lock it down.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple health check endpoint
@app.get("/health")
def health():
    return {"status": "ok"}

# Create a new recipe
@app.post("/recipes", response_model=RecipeOut, status_code=201)
def create_recipe(payload: RecipeCreate, db: Session = Depends(get_db)):
    rec = Recipe(
        title=payload.title.strip(),
        ingredients=payload.ingredients.strip(),
        instructions=payload.instructions.strip(),
    )
    db.add(rec)       # Add to DB session
    db.commit()       # Commit to persist changes
    db.refresh(rec)   # Refresh to get generated ID
    return rec        # Return recipe object

# Get a list of recipes (with optional search + pagination)
@app.get("/recipes", response_model=List[RecipeOut])
def list_recipes(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search in title or ingredients"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max items to return"),
):
    query = db.query(Recipe)
    if q:
        like = f"%{q}%"
        query = query.filter((Recipe.title.ilike(like)) | (Recipe.ingredients.ilike(like)))
    return query.order_by(Recipe.id.desc()).offset(skip).limit(limit).all()

# Get a single recipe by ID
@app.get("/recipes/{recipe_id}", response_model=RecipeOut)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    # For SQLAlchemy 1.4, query.get() is fine; alternatively: db.get(Recipe, recipe_id)
    rec = db.query(Recipe).get(recipe_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return rec

# Update a recipe (partial update with PATCH)
@app.patch("/recipes/{recipe_id}", response_model=RecipeOut)
def update_recipe(recipe_id: int, payload: RecipeUpdate, db: Session = Depends(get_db)):
    rec = db.query(Recipe).get(recipe_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Only update the fields that were provided
    if payload.title is not None:
        rec.title = payload.title.strip()
    if payload.ingredients is not None:
        rec.ingredients = payload.ingredients.strip()
    if payload.instructions is not None:
        rec.instructions = payload.instructions.strip()

    db.commit()
    db.refresh(rec)
    return rec

# Delete a recipe by ID
@app.delete("/recipes/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    rec = db.query(Recipe).get(recipe_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(rec)
    db.commit()
    return None

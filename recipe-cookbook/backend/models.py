# backend/models.py
from sqlalchemy import String, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from db import Base

# Recipe table definition using SQLAlchemy ORM
class Recipe(Base):
    __tablename__ = "recipes"  # Table name in DB

    # ID column: auto-increment primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Title of the recipe
    title: Mapped[str] = mapped_column(String(200), index=True)
    # Ingredients stored as plain text (comma or newline separated)
    ingredients: Mapped[str] = mapped_column(Text)
    # Instructions stored as plain text
    instructions: Mapped[str] = mapped_column(Text)

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.supabase_client import supabase
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class CreateProductRequest(BaseModel):
    business_id: str
    name: str
    description: Optional[str] = None
    price: float
    currency: str = 'NGN'
    stock_quantity: int = 0
    category: Optional[str] = None
    image_url: Optional[str] = None
    sku: Optional[str] = None


class UpdateProductRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock_quantity: Optional[int] = None
    is_available: Optional[bool] = None
    category: Optional[str] = None
    image_url: Optional[str] = None


@router.get("/business/{business_id}")
async def get_products(business_id: str, category: Optional[str] = None):
    query = supabase.table("products").select("*").eq(
        "business_id", business_id
    ).order("created_at", desc=True)

    if category:
        query = query.eq("category", category)

    result = query.execute()
    return {"status": "ok", "products": result.data or []}


@router.post("")
async def create_product(req: CreateProductRequest):
    result = supabase.table("products").insert({
        "business_id": req.business_id,
        "name": req.name,
        "description": req.description,
        "price": req.price,
        "currency": req.currency,
        "stock_quantity": req.stock_quantity,
        "category": req.category,
        "image_url": req.image_url,
        "sku": req.sku,
        "is_available": True,
    }).execute()

    return {"status": "ok", "product": result.data[0] if result.data else {}}


@router.patch("/{product_id}")
async def update_product(product_id: str, req: UpdateProductRequest):
    data = {k: v for k, v in req.dict().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("products").update(data).eq(
        "id", product_id
    ).execute()

    return {"status": "ok", "product": result.data[0] if result.data else {}}


@router.delete("/{product_id}")
async def delete_product(product_id: str):
    supabase.table("products").delete().eq("id", product_id).execute()
    return {"status": "ok"}


@router.get("/search/{business_id}")
async def search_products(business_id: str, q: str):
    result = supabase.table("products").select("*").eq(
        "business_id", business_id
    ).eq("is_available", True).execute()

    products = result.data or []
    q_lower = q.lower()
    filtered = [
        p for p in products
        if q_lower in (p.get("name") or "").lower()
        or q_lower in (p.get("description") or "").lower()
        or q_lower in (p.get("category") or "").lower()
    ]
    return {"status": "ok", "products": filtered}
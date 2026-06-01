from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.supabase_client import supabase

router = APIRouter()


class UpdateCustomerRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list] = None


class AddNoteRequest(BaseModel):
    note: str


@router.get("/business/{business_id}")
async def list_customers(business_id: str, search: Optional[str] = None):
    """Get all customers for a business."""
    query = supabase.table("customers").select("*").eq(
        "business_id", business_id
    ).order("last_seen_at", desc=True)

    result = query.execute()
    customers = result.data or []

    if search:
        search_lower = search.lower()
        customers = [
            c for c in customers
            if search_lower in (c.get("name") or "").lower()
            or search_lower in (c.get("wa_phone") or "")
        ]

    return {"status": "ok", "customers": customers, "count": len(customers)}


@router.get("/{customer_id}")
async def get_customer(customer_id: str):
    """Get a single customer with their orders."""
    customer_result = supabase.table("customers").select(
        "*"
    ).eq("id", customer_id).limit(1).execute()

    if not customer_result.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer = customer_result.data[0]

    orders_result = supabase.table("orders").select("*").eq(
        "customer_id", customer_id
    ).order("created_at", desc=True).limit(10).execute()

    return {
        "status": "ok",
        "customer": customer,
        "orders": orders_result.data or [],
    }


@router.patch("/{customer_id}")
async def update_customer(customer_id: str, req: UpdateCustomerRequest):
    """Update customer details."""
    data = {}
    if req.name is not None:
        data["name"] = req.name
    if req.email is not None:
        data["email"] = req.email
    if req.notes is not None:
        data["notes"] = req.notes
    if req.tags is not None:
        data["tags"] = req.tags

    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("customers").update(data).eq(
        "id", customer_id
    ).execute()

    return {"status": "ok", "customer": result.data[0] if result.data else {}}


@router.post("/{customer_id}/tags")
async def add_tag(customer_id: str, tag: str):
    """Add a tag to a customer."""
    customer_result = supabase.table("customers").select(
        "tags"
    ).eq("id", customer_id).execute()

    if not customer_result.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    current_tags = customer_result.data[0].get("tags") or []
    if tag not in current_tags:
        current_tags.append(tag)

    result = supabase.table("customers").update(
        {"tags": current_tags}
    ).eq("id", customer_id).execute()

    return {"status": "ok", "tags": current_tags}
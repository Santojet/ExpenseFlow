from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db, limiter
from app.models.category import Category

categories_bp = Blueprint(
    "categories",
    __name__,
    url_prefix="/api/categories",
)


def category_response(category):
    return {
        "id": category.id,
        "name": category.name,
        "color": category.color,
        "icon": category.icon,
        "is_default": category.is_default,
    }


@categories_bp.route("", methods=["GET"])
@jwt_required()
@limiter.limit("50 per minute")
def get_categories():
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    current_user_id = int(get_jwt_identity())

    categories = (
        db.session.query(Category)
        .filter_by(organization_id=organization_id, user_id=current_user_id)
        .all()
    )

    return jsonify({"categories": [category_response(c) for c in categories]}), 200


@categories_bp.route("", methods=["POST"])
@jwt_required()
@limiter.limit("20 per minute")
def create_category():
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    current_user_id = int(get_jwt_identity())

    data = request.get_json() or {}
    name = data.get("name")
    
    if not name or not str(name).strip():
        return jsonify({"error": "Category name is required"}), 400

    new_cat = Category(
        organization_id=organization_id,
        user_id=current_user_id,
        name=str(name).strip(),
        color=data.get("color"),
        icon=data.get("icon"),
        is_default=False,
    )

    db.session.add(new_cat)
    db.session.commit()

    return jsonify({"message": "Category created", "category": category_response(new_cat)}), 201


@categories_bp.route("/<int:cat_id>", methods=["PUT"])
@jwt_required()
def update_category(cat_id):
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    current_user_id = int(get_jwt_identity())

    cat = db.session.query(Category).filter_by(
        id=cat_id,
        organization_id=organization_id,
        user_id=current_user_id,
    ).first()

    if not cat:
        return jsonify({"error": "Category not found"}), 404

    data = request.get_json() or {}
    
    if "name" in data and str(data["name"]).strip():
        cat.name = str(data["name"]).strip()
    if "color" in data:
        cat.color = data["color"]
    if "icon" in data:
        cat.icon = data["icon"]

    db.session.commit()

    return jsonify({"message": "Category updated", "category": category_response(cat)}), 200


@categories_bp.route("/<int:cat_id>", methods=["DELETE"])
@jwt_required()
def delete_category(cat_id):
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    current_user_id = int(get_jwt_identity())

    cat = db.session.query(Category).filter_by(
        id=cat_id,
        organization_id=organization_id,
        user_id=current_user_id,
    ).first()

    if not cat:
        return jsonify({"error": "Category not found"}), 404

    db.session.delete(cat)
    db.session.commit()

    return jsonify({"message": "Category deleted"}), 200

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from app.extensions import db
from app.models.group import Group, GroupMember, GroupExpense, GroupExpenseSplit
from app.models.user import User

groups_bp = Blueprint("groups", __name__, url_prefix="/api/groups")

@groups_bp.get("")
@jwt_required()
def get_groups():
    user_id = get_jwt_identity()
    claims = get_jwt()
    org_id = claims.get("organization_id")

    # Find groups where user is a member
    memberships = db.session.execute(
        db.select(GroupMember).where(GroupMember.user_id == user_id)
    ).scalars().all()
    group_ids = [m.group_id for m in memberships]

    groups = db.session.execute(
        db.select(Group).where(Group.id.in_(group_ids), Group.organization_id == org_id)
    ).scalars().all()

    result = []
    for g in groups:
        result.append({
            "id": g.id,
            "name": g.name,
            "description": g.description,
            "member_count": len(g.members),
            "created_at": g.created_at.isoformat()
        })
    return {"success": True, "groups": result}, 200

@groups_bp.post("")
@jwt_required()
def create_group():
    data = request.get_json() or {}
    user_id = get_jwt_identity()
    claims = get_jwt()
    org_id = claims.get("organization_id")
    
    name = data.get("name", "").strip()
    if not name:
        return {"success": False, "message": "Group name is required"}, 400

    group = Group(
        organization_id=org_id,
        name=name,
        description=data.get("description"),
        created_by_id=user_id
    )
    db.session.add(group)
    db.session.flush()

    # Add creator as member
    member = GroupMember(group_id=group.id, user_id=user_id)
    db.session.add(member)

    # Add other members if any
    member_ids = data.get("member_ids", [])
    for m_id in member_ids:
        if m_id != user_id:
            db.session.add(GroupMember(group_id=group.id, user_id=m_id))

    db.session.commit()
    return {"success": True, "message": "Group created successfully", "group_id": group.id}, 201

@groups_bp.get("/<int:group_id>")
@jwt_required()
def get_group_details(group_id):
    user_id = get_jwt_identity()
    
    group = db.session.execute(db.select(Group).where(Group.id == group_id)).scalar_one_or_none()
    if not group: return {"success": False, "message": "Group not found"}, 404

    # Check membership
    is_member = any(m.user_id == user_id for m in group.members)
    if not is_member:
        return {"success": False, "message": "Not a member"}, 403

    members_data = [{"id": m.user.id, "full_name": m.user.full_name} for m in group.members]
    
    expenses_data = []
    for e in group.expenses:
        expenses_data.append({
            "id": e.id,
            "title": e.title,
            "amount": float(e.amount),
            "paid_by_id": e.paid_by_id,
            "created_at": e.created_at.isoformat(),
            "splits": [{"user_id": s.user_id, "amount_owed": float(s.amount_owed), "is_settled": s.is_settled} for s in e.splits]
        })

    return {
        "success": True,
        "group": {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "members": members_data,
            "expenses": expenses_data
        }
    }, 200

@groups_bp.post("/<int:group_id>/expenses")
@jwt_required()
def add_group_expense(group_id):
    data = request.get_json() or {}
    user_id = get_jwt_identity()
    
    group = db.session.execute(db.select(Group).where(Group.id == group_id)).scalar_one_or_none()
    if not group: return {"success": False, "message": "Group not found"}, 404
    
    title = data.get("title", "").strip()
    amount = float(data.get("amount", 0))
    splits = data.get("splits", []) # [{"user_id": 1, "amount": 500}]

    if not title or amount <= 0 or not splits:
        return {"success": False, "message": "Invalid data"}, 400

    expense = GroupExpense(
        group_id=group.id,
        paid_by_id=user_id,
        title=title,
        amount=amount
    )
    db.session.add(expense)
    db.session.flush()

    for split in splits:
        db.session.add(GroupExpenseSplit(
            expense_id=expense.id,
            user_id=split["user_id"],
            amount_owed=float(split["amount"]),
            is_settled=(split["user_id"] == user_id) # Payer is already settled with themselves
        ))

    db.session.commit()
    return {"success": True, "message": "Shared expense added"}, 201

@groups_bp.post("/<int:group_id>/settle")
@jwt_required()
def settle_up(group_id):
    data = request.get_json() or {}
    settle_user_id = data.get("user_id") # The person who is paying their debt
    pay_to_id = data.get("pay_to_id")
    
    if not settle_user_id or not pay_to_id:
        return {"success": False, "message": "Missing user ids"}, 400
        
    splits = db.session.execute(
        db.select(GroupExpenseSplit)
        .join(GroupExpense)
        .where(
            GroupExpense.group_id == group_id,
            GroupExpense.paid_by_id == pay_to_id,
            GroupExpenseSplit.user_id == settle_user_id,
            GroupExpenseSplit.is_settled == False
        )
    ).scalars().all()

    count = 0
    for split in splits:
        split.is_settled = True
        count += 1
        
    db.session.commit()
    return {"success": True, "message": f"Settled {count} expenses"}, 200

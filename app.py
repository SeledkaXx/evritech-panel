from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
from flask import send_from_directory, session, redirect, url_for
from datetime import timedelta, datetime
from datetime import datetime, timedelta
from sqlalchemy.sql.sqltypes import Date
from sqlalchemy import func, and_, or_
from models import db, User, Source, Priority, Status, Lead, Service, Client, Attachment, Accompaniment, Support, TaskStatus, Task
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "connect_args": {
        "sslmode": "require"
    }
}
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.secret_key = "your-secret-key"
app.permanent_session_lifetime = timedelta(days=7)

db.init_app(app)
CORS(app)

UPLOAD_FOLDER = os.path.join("static", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

#auth
@app.route("/")
def auth_page():
    if "user_id" in session:
        return redirect(url_for("dashboard_page"))
    return render_template("auth.html")

@app.route("/api/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        if User.query.filter_by(email=data['email']).first():
            return jsonify({"success": False, "message": "Email уже используется"}), 400

        user = User(name=data["name"], email=data["email"])
        user.set_password(data["password"])
        db.session.add(user)
        db.session.commit()
        session["user_id"] = user.id
        return jsonify({"success": True}), 200
    except Exception as e:
        import traceback
        print("REGISTER ERROR:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": "Ошибка на сервере"}), 500

@app.route("/api/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        user = User.query.filter_by(email=data['email']).first()
        if user and user.check_password(data["password"]):
            session.permanent = True
            session["user_id"] = user.id
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "Неверные данные"}), 401
    except Exception as e:
        import traceback
        print("LOGIN ERROR:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": "Ошибка сервера"}), 500

@app.route("/api/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"success": True})

# dashboard
@app.route("/dashboard")
def dashboard_page():
    if "user_id" not in session:
        return redirect(url_for("auth_page"))
    return render_template("index.html")

#profile
@app.route("/profile")
def profile_page():
    if "user_id" not in session:
        return redirect(url_for("auth_page"))
    return render_template("profile.html")

@app.route("/api/profile")
def get_profile():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    user = User.query.get_or_404(user_id)
    return jsonify({
    "id": user.id,  # ← Добавляем
    "name": user.name,
    "email": user.email,
    "is_admin": user.is_admin,
    "avatar": f"/static/uploads/{user.avatar_filename}" if user.avatar_filename else "/static/img/default-avatar.svg"
})


@app.route("/api/profile", methods=["POST"])
def update_profile():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    user = User.query.get_or_404(user_id)
    data = request.form

    if "name" in data and data["name"]:
        user.name = data["name"]
    if "email" in data and data["email"]:
        user.email = data["email"]
    if "password" in data and data["password"]:
        user.set_password(data["password"])

    if "avatar" in request.files:
        avatar = request.files["avatar"]
        if avatar.filename:
            filename = secure_filename(avatar.filename)
            avatar.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))
            user.avatar_filename = filename

    db.session.commit()
    return jsonify({"success": True})

# справочники
@app.route("/api/sources")
def get_sources():
    sources = db.session.execute(db.select(Source)).scalars().all()
    return jsonify([{"id": s.id, "name": s.name} for s in sources])

@app.route("/api/priorities")
def get_priorities():
    priorities = db.session.execute(db.select(Priority)).scalars().all()
    return jsonify([{"id": p.id, "name": p.name} for p in priorities])

@app.route("/api/statuses")
def get_statuses():
    statuses = db.session.execute(db.select(Status)).scalars().all()
    return jsonify([{"id": s.id, "name": s.name} for s in statuses])

@app.route("/api/users")
def get_users():
    users = db.session.execute(db.select(User)).scalars().all()
    return jsonify([{"id": u.id, "name": u.name} for u in users])

# лиды
@app.route("/leads")
def leads_page():
    if "user_id" not in session:
        return redirect(url_for("auth_page"))
    return render_template("leads.html")

@app.route("/api/leads", methods=["GET"])
def get_leads():
    leads = db.session.execute(db.select(Lead).order_by(Lead.created_date.desc())).scalars().all()
    return jsonify([lead.to_dict() for lead in leads])

@app.route("/api/leads", methods=["POST"])
def add_lead():
    try:
        data = request.get_json()
        if not all(key in data for key in ["name", "email", "request", "deadline"]):
            return jsonify({"success": False, "message": "Отсутствуют обязательные поля"}), 400

        # Парсим deadline
        try:
            deadline = datetime.strptime(data["deadline"], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"success": False, "message": "Неверный формат даты для deadline (ожидается YYYY-MM-DD)"}), 400

        lead = Lead(
            name=data["name"],
            email=data["email"],
            phone=data.get("phone"),
            request=data["request"],
            price=data.get("price"),
            source_id=data.get("source_id"),
            deadline=deadline,
            user_id=data.get("user_id"),
            priority_id=data.get("priority_id"),
            status_id=data.get("status_id", 1),
            notes=data.get("notes"),
            created_date=datetime.now().date()
        )
        db.session.add(lead)
        db.session.commit()
        return jsonify({"success": True, "id": lead.id})
    except Exception as e:
        import traceback
        print("ADD LEAD ERROR:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/leads/<int:lead_id>/status", methods=["PATCH"])
def update_lead_status(lead_id):
    data = request.get_json()
    lead = db.get_or_404(Lead, lead_id)
    lead.status_id = data["status_id"]
    db.session.commit()
    return jsonify(success=True)

@app.route("/api/leads/<int:lead_id>", methods=["PUT"])
def update_lead(lead_id):
    try:
        data = request.get_json()
        lead = db.get_or_404(Lead, lead_id)
        lead.name = data["name"]
        lead.email = data["email"]
        lead.phone = data.get("phone")
        lead.request = data["request"]
        lead.price = data.get("price")
        lead.source_id = data.get("source_id")
        lead.deadline = datetime.strptime(data["deadline"], "%Y-%m-%d").date() if data.get("deadline") else None
        lead.user_id = data.get("user_id")
        lead.priority_id = data.get("priority_id")
        lead.notes = data.get("notes")
        db.session.commit()
        return jsonify(success=True)
    except Exception as e:
        import traceback
        print("UPDATE LEAD ERROR:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/leads/<int:lead_id>", methods=["DELETE"])
def delete_lead(lead_id):
    lead = db.get_or_404(Lead, lead_id)
    db.session.delete(lead)
    db.session.commit()
    return jsonify(success=True)

# клиенты
@app.route("/clients")
def clients_page():
    if "user_id" not in session:
        return redirect("/")
    return render_template("clients.html")

@app.route("/api/clients")
def get_clients():
    if "user_id" not in session:
        return jsonify([]), 403

    user_id = session["user_id"]
    user = db.session.get(User, user_id)

    if user and user.is_admin:
        clients = Client.query.all()
    else:
        clients = Client.query.filter_by(user_id=user_id).all()

    return jsonify([
        {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "service_id": c.service_id,
            "price": float(c.price) if c.price else None,
            "deadline": c.deadline.isoformat() if c.deadline else None,
            "user_id": c.user_id,
            "priority_id": c.priority_id,
            "status_id": c.status_id,
            "notes": c.notes,
            "created_date": c.created_date.strftime("%d.%m.%Y") if c.created_date else None,
            "attachments": [{"id": a.id, "filename": a.filename} for a in c.attachments]
        }
        for c in clients
    ])

@app.route("/api/clients", methods=["POST"])
def create_client():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 403
    try:
        data = request.json
        deadline = None
        if data.get("deadline"):
            try:
                deadline = datetime.strptime(data["deadline"], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "Invalid date format, use YYYY-MM-DD"}), 400
        client = Client(
            name=data["name"],
            email=data.get("email") or None,
            phone=data.get("phone") or None,
            service_id=int(data["service_id"]) if data.get("service_id") else None,
            price=float(data["price"]) if data.get("price") else None,
            deadline=deadline,
            user_id=int(data["user_id"]),
            priority_id=int(data["priority_id"]) if data.get("priority_id") else None,
            status_id=int(data.get("status_id", 1)),
            notes=data.get("notes") or None,
            created_date=datetime.strptime(data["created_date"], "%d.%m.%Y").date() if data.get("created_date") else None
        )
        db.session.add(client)
        db.session.commit()
        return jsonify({"success": True, "id": client.id})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/clients/<int:client_id>", methods=["GET"])
def get_client(client_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 403
    client = Client.query.get(client_id)
    if not client:
        return jsonify({"error": "Client not found"}), 404
    user = db.session.get(User, session["user_id"])
    if not user.is_admin and client.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403
    return jsonify({
        "id": client.id,
        "name": client.name,
        "email": client.email,
        "phone": client.phone,
        "service_id": client.service_id,
        "price": float(client.price) if client.price else None,
        "deadline": client.deadline.isoformat() if client.deadline else None,
        "user_id": client.user_id,
        "priority_id": client.priority_id,
        "status_id": client.status_id,
        "notes": client.notes,
        "created_date": client.created_date.strftime("%d.%m.%Y") if client.created_date else None,
         "attachments": [{"id": a.id, "filename": a.filename} for a in client.attachments]  # Добавляем id
    })

@app.route("/api/clients/<int:client_id>", methods=["PUT"])
def update_client(client_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 403
    data = request.json
    client = Client.query.get(client_id)
    if not client:
        return jsonify({"error": "Client not found"}), 404
    try:
        client.name = data["name"]
        client.email = data.get("email")
        client.phone = data.get("phone")
        client.service_id = int(data["service_id"]) if data.get("service_id") else None
        client.price = float(data["price"]) if data.get("price") else None
        client.deadline = datetime.strptime(data["deadline"], "%Y-%m-%d").date() if data.get("deadline") else None
        client.user_id = int(data["user_id"])
        client.priority_id = int(data["priority_id"]) if data.get("priority_id") else None
        client.notes = data.get("notes")
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/clients/<int:client_id>", methods=["DELETE"])
def delete_client(client_id):
    client = Client.query.get(client_id)
    if not client:
        return "Not found", 404
    db.session.delete(client)
    db.session.commit()
    return jsonify({"success": True})

@app.route("/api/clients/<int:client_id>/attachments", methods=["POST"])
def upload_attachment(client_id):
    if "user_id" not in session:
        return "Unauthorized", 403
    file = request.files["file"]
    if not file:
        return jsonify({"error": "No file provided"}), 400
    filename = secure_filename(file.filename)
    unique_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}"
    folder = os.path.join(app.config["UPLOAD_FOLDER"], "clients", str(client_id))
    os.makedirs(folder, exist_ok=True)
    filepath = os.path.join(folder, unique_filename)
    file.save(filepath)

    attachment = Attachment(
        client_id=client_id,
        filename=unique_filename,
        filepath=filepath.replace("\\", "/")
    )
    db.session.add(attachment)
    db.session.commit()
    return jsonify({"success": True, "filename": unique_filename})

@app.route("/api/clients/<int:client_id>/attachments/<int:attachment_id>", methods=["DELETE"])
def delete_attachment(client_id, attachment_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 403
    attachment = Attachment.query.get(attachment_id)
    if not attachment or attachment.client_id != client_id:
        return jsonify({"error": "Attachment not found"}), 404
    try:
        os.remove(attachment.filepath)
        db.session.delete(attachment)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/clients/<int:client_id>/status", methods=["PATCH"])
def update_client_status(client_id):
    data = request.json
    client = Client.query.get(client_id)
    if not client:
        return "Not found", 404
    client.status_id = data.get("status_id")
    db.session.commit()
    return jsonify({"success": True})

@app.route("/api/services")
def get_services():
    services = db.session.execute(db.select(Service)).scalars().all()
    return jsonify([{"id": s.id, "name": s.name} for s in services])

@app.route("/static/uploads/clients/<int:client_id>/<filename>")
def serve_attachment(client_id, filename):
    folder = os.path.join("static", "uploads", "clients", str(client_id))
    return send_from_directory(folder, filename)

# support

@app.route("/support")
def support_page():
    if "user_id" not in session:
        return redirect("/")
    return render_template("support.html")

@app.route("/api/supports")
def get_supports():
    if "user_id" not in session:
        return jsonify([]), 403

    user_id = session["user_id"]
    user = db.session.get(User, user_id)

    query = Support.query.order_by(Support.id.desc())
    if not user.is_admin:
        query = query.filter_by(user_id=user_id)

    return jsonify([
        {
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "phone": s.phone,
            "accompaniment_id": s.accompaniment_id,
            "price": float(s.price) if s.price else None,
            "deadline": s.deadline.isoformat() if s.deadline else None,
            "user_id": s.user_id,
            "status_id": s.status_id,
            "notes": s.notes,
            "created_date": s.created_date.strftime("%d.%m.%Y") if s.created_date else None,
            "attachments": [{"id": a.id, "filename": a.filename} for a in s.attachments]
        }
        for s in query.all()
    ])

@app.route("/api/accompaniments")
def get_accompaniments():
    accompaniments = Accompaniment.query.order_by(Accompaniment.name).all()
    return jsonify([{"id": a.id, "name": a.name} for a in accompaniments])

@app.route("/api/supports", methods=["POST"])
def create_support():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    deadline = datetime.strptime(data["deadline"], "%Y-%m-%d").date() if data.get("deadline") else None
    created_date = datetime.strptime(data["created_date"], "%d.%m.%Y").date() if data.get("created_date") else datetime.now().date()

    support = Support(
        name=data["name"],
        email=data.get("email"),
        phone=data.get("phone"),
        accompaniment_id=int(data["accompaniment_id"]),
        price=float(data["price"]) if data.get("price") else None,
        deadline=deadline,
        user_id=int(data["user_id"]),
        status_id=int(data.get("status_id", 1)),
        notes=data.get("notes"),
        created_date=created_date
    )
    db.session.add(support)
    db.session.commit()
    return jsonify({"success": True, "id": support.id})

@app.route("/api/supports/<int:support_id>", methods=["PUT"])
def update_support(support_id):
    data = request.json
    support = Support.query.get(support_id)
    if not support:
        return jsonify({"error": "Not found"}), 404

    support.name = data["name"]
    support.email = data.get("email")
    support.phone = data.get("phone")
    support.accompaniment_id = int(data["accompaniment_id"])
    support.price = float(data["price"]) if data.get("price") else None
    support.deadline = datetime.strptime(data["deadline"], "%Y-%m-%d").date() if data.get("deadline") else None
    support.user_id = int(data["user_id"])
    support.notes = data.get("notes")
    db.session.commit()
    return jsonify(success=True)

@app.route("/api/supports/<int:support_id>", methods=["DELETE"])
def delete_support(support_id):
    support = Support.query.get(support_id)
    if not support:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(support)
    db.session.commit()
    return jsonify(success=True)

@app.route("/api/supports/<int:support_id>/status", methods=["PATCH"])
def update_support_status(support_id):
    data = request.json
    support = Support.query.get(support_id)
    if not support:
        return jsonify({"error": "Not found"}), 404
    support.status_id = data.get("status_id")
    db.session.commit()
    return jsonify(success=True)

@app.route("/api/supports/<int:support_id>/attachments", methods=["POST"])
def upload_support_attachment(support_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 403
    support = Support.query.get(support_id)
    if not support:
        return jsonify({"error": "Support not found"}), 404
    file = request.files["file"]
    if not file:
        return jsonify({"error": "No file provided"}), 400
    filename = secure_filename(file.filename)
    unique_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}"
    folder = os.path.join(app.config["UPLOAD_FOLDER"], "supports", str(support_id))
    os.makedirs(folder, exist_ok=True)
    filepath = os.path.join(folder, unique_filename)
    file.save(filepath)

    attachment = Attachment(
        client_id=None,  # Use client_id as null since we're reusing the Attachment model
        support_id=support_id,
        filename=unique_filename,
        filepath=filepath.replace("\\", "/")
    )
    db.session.add(attachment)
    db.session.commit()
    return jsonify({"success": True, "id": attachment.id, "filename": unique_filename})

@app.route("/api/supports/<int:support_id>/attachments/<int:attachment_id>", methods=["DELETE"])
def delete_support_attachment(support_id, attachment_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 403
    attachment = Attachment.query.get(attachment_id)
    if not attachment or attachment.support_id != support_id:
        return jsonify({"error": "Attachment not found"}), 404
    try:
        os.remove(attachment.filepath)
        db.session.delete(attachment)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/static/uploads/supports/<int:support_id>/<filename>")
def serve_support_attachment(support_id, filename):
    folder = os.path.join("static", "uploads", "supports", str(support_id))
    return send_from_directory(folder, filename)


# задачи
# app.py
# ... (существующие импорты и конфигурация остаются без изменений)

# задачи
@app.route("/tasks")
def tasks_page():
    if "user_id" not in session:
        return redirect(url_for("auth_page"))
    return render_template("tasks.html")

@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 403

    user_id = session["user_id"]
    user = db.session.get(User, user_id)

    query = Task.query.order_by(Task.created_date.desc())
    if user.is_admin:
        # Админ видит свои личные задачи и все общие задачи
        query = query.filter(
            (Task.is_shared == False) & (Task.user_id == user_id) |  # Свои личные задачи
            (Task.is_shared == True)  # Все общие задачи
        )
    else:
        # Обычные пользователи видят свои личные задачи и общие, где они создатель или назначены
        query = query.filter(
            (Task.is_shared == False) & (Task.user_id == user_id) |  # Свои личные задачи
            (Task.is_shared == True) & ((Task.user_id == user_id) | (Task.assigned_user_id == user_id))  # Общие задачи
        )

    tasks = query.all()
    return jsonify([task.to_dict() for task in tasks])

@app.route("/api/tasks", methods=["POST"])
def create_task():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 403

    print("Received data:", request.get_json())  # Добавлен отладочный вывод
    try:
        data = request.get_json()
        if not data.get("title"):
            return jsonify({"error": "Название задачи обязательно"}), 400

        deadline = None
        if data.get("deadline"):
            try:
                deadline = datetime.strptime(data["deadline"], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "Неверный формат даты (ожидается YYYY-MM-DD)"}), 400

        task = Task(
            title=data["title"],
            description=data.get("description"),
            client=data.get("client"),
            deadline=deadline,
            is_shared=data.get("is_shared", False),
            created_date=datetime.now().date(),
            task_status_id=data.get("task_status_id", 1),  # Изменено с status_id на task_status_id
            user_id=session["user_id"],
            assigned_user_id=int(data["assigned_user_id"]) if data.get("assigned_user_id") else None
        )
        db.session.add(task)
        db.session.commit()
        print("Task created with ID:", task.id)  # Добавлен отладочный вывод
        return jsonify({"success": True, "id": task.id})
    except Exception as e:
        import traceback
        print("CREATE TASK ERROR:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 403

    task = db.get_or_404(Task, task_id)
    user = db.session.get(User, session["user_id"])
    if not user.is_admin and task.user_id != session["user_id"]:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        data = request.get_json()
        task.title = data["title"]
        task.description = data.get("description")
        task.client = data.get("client")
        task.deadline = datetime.strptime(data["deadline"], "%Y-%m-%d").date() if data.get("deadline") else None
        task.is_shared = data.get("is_shared", False)
        task.assigned_user_id = int(data["assigned_user_id"]) if data.get("assigned_user_id") else None
        task.task_status_id = data.get("task_status_id")  # Изменено с status_id на task_status_id

        if not task.title:
            return jsonify({"error": "Название задачи обязательно"}), 400
        if task.is_shared and not task.assigned_user_id:
            return jsonify({"error": "Пользователь обязателен для общей задачи"}), 400

        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        import traceback
        print("UPDATE TASK ERROR:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 403

    task = db.get_or_404(Task, task_id)
    user = db.session.get(User, session["user_id"])
    if not user.is_admin and task.user_id != session["user_id"]:
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(task)
    db.session.commit()
    return jsonify({"success": True})

@app.route("/api/tasks/<int:task_id>/status", methods=["PATCH"])
def update_task_status(task_id):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 403

    task = db.get_or_404(Task, task_id)
    user = db.session.get(User, session["user_id"])
    if not user.is_admin and task.user_id != session["user_id"]:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    task.task_status_id = data.get("task_status_id")  # Изменено с status_id на task_status_id
    db.session.commit()
    return jsonify({"success": True})

@app.route("/api/task_statuses")
def get_task_statuses():
    task_statuses = db.session.execute(db.select(TaskStatus)).scalars().all()
    return jsonify([{"id": ts.id, "name": ts.name} for ts in task_statuses])

#---------------------------------------------------------------------------------------------------------------------------
@app.route("/analytics")
def analytics_page():
    if "user_id" not in session:
        return redirect(url_for("auth_page"))
    return render_template("analytics.html")


@app.route("/create_tables")
def create_tables():
    db.create_all()
    return "Таблицы созданы"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000, debug=True)

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date


db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    avatar_filename = db.Column(db.String(255), nullable=True)  # новое поле
    is_admin = db.Column(db.Boolean, default=False, nullable=False)  # Новое поле

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Source(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

class Priority(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)

class Status(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)

class Lead(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(50))
    request = db.Column(db.Text)
    price = db.Column(db.String(50))
    deadline = db.Column(db.Date, nullable=False)
    notes = db.Column(db.Text)
    created_date = db.Column(db.Date, default=date.today)

    source_id = db.Column(db.Integer, db.ForeignKey("source.id"))
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    priority_id = db.Column(db.Integer, db.ForeignKey("priority.id"))
    status_id = db.Column(db.Integer, db.ForeignKey("status.id"))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "request": self.request,
            "price": self.price,
            "deadline": self.deadline.isoformat(),
            "notes": self.notes,
            "created_date": self.created_date.strftime("%d.%m.%Y") if self.created_date else None,
            "source_id": self.source_id,
            "user_id": self.user_id,
            "priority_id": self.priority_id,
            "status_id": self.status_id,
        }

# клиенты
class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)

class Client(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    email = db.Column(db.String)
    phone = db.Column(db.String)
    service_id = db.Column(db.Integer, db.ForeignKey('service.id'))
    price = db.Column(db.Numeric)
    deadline = db.Column(db.Date)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    priority_id = db.Column(db.Integer, db.ForeignKey('priority.id'))
    status_id = db.Column(db.Integer, db.ForeignKey('status.id'))
    notes = db.Column(db.Text)
    created_date = db.Column(db.DateTime, server_default=db.func.now())
    attachments = db.relationship("Attachment", backref="client", lazy=True, cascade="all, delete")

class Attachment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=True)
    support_id = db.Column(db.Integer, db.ForeignKey('support.id'), nullable=True)
    filename = db.Column(db.String, nullable=False)
    filepath = db.Column(db.String, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "filepath": self.filepath
        }

#support
class Accompaniment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)

class Support(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    email = db.Column(db.String)
    phone = db.Column(db.String)
    accompaniment_id = db.Column(db.Integer, db.ForeignKey("accompaniment.id"))
    price = db.Column(db.Numeric)
    deadline = db.Column(db.Date)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    status_id = db.Column(db.Integer, db.ForeignKey("status.id"))
    notes = db.Column(db.Text)
    created_date = db.Column(db.Date, default=date.today)
    attachments = db.relationship("Attachment", backref="support", lazy=True, cascade="all, delete")

# задачи
# задачи
# задачи
# задачи
# задачи
class TaskStatus(db.Model):
    __tablename__ = 'task_status'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    tasks = db.relationship('Task', backref='task')

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    client = db.Column(db.String(255))
    deadline = db.Column(db.Date)
    is_shared = db.Column(db.Boolean, default=False, nullable=False)
    created_date = db.Column(db.Date, default=date.today)
    task_status_id = db.Column(db.Integer, db.ForeignKey('task_status.id'), nullable=False)  # Изменено с status_id на task_status_id
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    assigned_user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    task_status = db.relationship('TaskStatus', backref='all_tasks')  # Прямое отношение
    user = db.relationship('User', foreign_keys=[user_id], backref='created_tasks')
    assigned_user = db.relationship('User', foreign_keys=[assigned_user_id], backref='assigned_tasks')

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "client": self.client,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "is_shared": self.is_shared,
            "created_date": self.created_date.strftime("%d.%m.%Y") if self.created_date else None,
            "task_status_id": self.task_status_id,  # Обновлено с status_id на task_status_id
            "user_id": self.user_id,
            "assigned_user_id": self.assigned_user_id
        }
from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime

app = Flask(__name__)
CORS(app)


# =========================
# INIT DATABASE
# =========================
def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            message TEXT,
            timestamp TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS resolved (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            message TEXT,
            timestamp TEXT,
            resolved_time TEXT
        )
    ''')

    conn.commit()
    conn.close()

init_db()


# =========================
# GET ALERTS
# =========================
@app.route('/alerts')
def get_alerts():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM alerts")
    data = cursor.fetchall()

    conn.close()
    return jsonify(data)


# =========================
# ADD ALERT
# =========================
@app.route('/add_alert', methods=['POST'])
def add_alert():
    data = request.json

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO alerts (type, message, timestamp)
        VALUES (?, ?, ?)
    ''', (
        data['type'],
        data['message'],
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ))

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})


# =========================
# RESOLVE ALERT
# =========================
@app.route('/resolve_alert/<int:id>', methods=['POST'])
def resolve_alert(id):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    # get alert
    cursor.execute("SELECT * FROM alerts WHERE id=?", (id,))
    alert = cursor.fetchone()

    if alert:
        cursor.execute('''
            INSERT INTO resolved (type, message, timestamp, resolved_time)
            VALUES (?, ?, ?, ?)
        ''', (
            alert[1],
            alert[2],
            alert[3],
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))

        cursor.execute("DELETE FROM alerts WHERE id=?", (id,))

    conn.commit()
    conn.close()

    return jsonify({"status": "resolved"})


# =========================
# GET RESOLVED ALERTS
# =========================
@app.route('/resolved')
def get_resolved():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM resolved ORDER BY id DESC")
    data = cursor.fetchall()

    conn.close()
    return jsonify(data)


# =========================
# RUN
# =========================
if __name__ == "__main__":
    app.run(debug=True)

# =========================
# CLEAR ALL RESOLVED ALERTS
# =========================
@app.route('/clear_resolved', methods=['POST'])
def clear_resolved():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    cursor.execute("DELETE FROM resolved")

    conn.commit()
    conn.close()

    return jsonify({"status": "cleared"})
